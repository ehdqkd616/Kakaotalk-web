package com.kakaoweb.relay

import android.app.Notification
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class KakaoNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "KakaoRelay"
        private const val KAKAO_PACKAGE = "com.kakao.talk"
        private const val PING_INTERVAL_MS = 5 * 60 * 1000L // 5분
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val displayFormat = SimpleDateFormat("HH:mm:ss", Locale.KOREA).apply {
        timeZone = TimeZone.getDefault()
    }

    private val pingHandler = Handler(Looper.getMainLooper())
    private val pingRunnable = object : Runnable {
        override fun run() {
            sendPing()
            pingHandler.postDelayed(this, PING_INTERVAL_MS)
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "NotificationListenerService 연결됨")
        pingHandler.postDelayed(pingRunnable, PING_INTERVAL_MS)
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "NotificationListenerService 연결 해제됨")
        pingHandler.removeCallbacks(pingRunnable)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        if (sbn.packageName != KAKAO_PACKAGE) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: return
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: return

        // 시스템 알림 무시
        if (text.isBlank() || title.isBlank()) return
        // 카카오톡 포그라운드 실행 알림 무시
        if (text.contains("카카오톡이 실행") || text.contains("실행 중")) return

        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        val serverUrl = prefs.getString("SERVER_URL", null) ?: return
        val userId = prefs.getString("USER_ID", null) ?: return
        val deviceId = prefs.getString("DEVICE_ID", android.os.Build.SERIAL) ?: "unknown"
        val timestamp = isoFormat.format(Date(sbn.postTime))

        scope.launch {
            val success = sendToRelay(
                serverUrl = serverUrl,
                deviceId = deviceId,
                userId = userId,
                sender = title,
                roomName = title,
                content = text,
                timestamp = timestamp,
            )

            // MainActivity로 로그 브로드캐스트
            val logEntry = "[${displayFormat.format(Date(sbn.postTime))}] $title: $text"
                .let { if (success) it else "❌ $it" }
            val broadcastIntent = Intent("com.kakaoweb.relay.NEW_MESSAGE")
            broadcastIntent.putExtra("log", logEntry)
            LocalBroadcastManager.getInstance(this@KakaoNotificationListener)
                .sendBroadcast(broadcastIntent)
        }
    }

    private fun sendToRelay(
        serverUrl: String,
        deviceId: String,
        userId: String,
        sender: String,
        roomName: String,
        content: String,
        timestamp: String,
    ): Boolean {
        return try {
            val json = JSONObject().apply {
                put("deviceId", deviceId)
                put("userId", userId)
                put("sender", sender)
                put("roomName", roomName)
                put("content", content)
                put("timestamp", timestamp)
            }
            val body = json.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$serverUrl/api/relay/message")
                .post(body)
                .build()
            http.newCall(request).execute().use { response ->
                val ok = response.isSuccessful
                if (!ok) Log.w(TAG, "릴레이 전송 실패: ${response.code}")
                else Log.d(TAG, "릴레이 전송 성공: [$sender] $content")
                ok
            }
        } catch (e: Exception) {
            Log.e(TAG, "릴레이 전송 오류: ${e.message}")
            false
        }
    }

    private fun sendPing() {
        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        val serverUrl = prefs.getString("SERVER_URL", null) ?: return
        val deviceId = prefs.getString("DEVICE_ID", null) ?: return

        scope.launch {
            try {
                val body = JSONObject().apply { put("deviceId", deviceId) }
                    .toString().toRequestBody("application/json".toMediaType())
                val req = Request.Builder()
                    .url("$serverUrl/api/relay/ping")
                    .post(body)
                    .build()
                http.newCall(req).execute().close()
            } catch (e: Exception) {
                Log.w(TAG, "Ping 실패: ${e.message}")
            }
        }
    }
}
