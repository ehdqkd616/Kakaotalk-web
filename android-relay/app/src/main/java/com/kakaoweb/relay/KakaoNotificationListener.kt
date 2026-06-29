package com.kakaoweb.relay

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
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

/**
 * 카카오톡 알림을 감지해서 웹 릴레이 서버로 전달하는 서비스.
 *
 * 동작 조건:
 * 1. 알림 접근 권한 허용 (설정 > 앱 > 특별한 앱 접근 > 알림 접근)
 * 2. SharedPreferences 에 SERVER_URL 과 USER_ID 가 저장되어 있어야 함
 * 3. 백그라운드에서 지속 실행됨
 */
class KakaoNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "KakaoRelay"
        private const val KAKAO_PACKAGE = "com.kakao.talk"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        if (sbn.packageName != KAKAO_PACKAGE) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: return
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: return

        // 시스템 알림 무시 (예: "카카오톡이 실행 중입니다")
        if (text.isBlank() || title.isBlank()) return

        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        val serverUrl = prefs.getString("SERVER_URL", null) ?: return
        val userId = prefs.getString("USER_ID", null) ?: return
        val deviceId = prefs.getString("DEVICE_ID", android.os.Build.SERIAL) ?: "unknown"

        scope.launch {
            sendToRelay(
                serverUrl = serverUrl,
                deviceId = deviceId,
                userId = userId,
                sender = title,
                roomName = title,
                content = text,
                timestamp = isoFormat.format(Date(sbn.postTime)),
            )
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
    ) {
        try {
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
                if (!response.isSuccessful) {
                    Log.w(TAG, "릴레이 전송 실패: ${response.code}")
                } else {
                    Log.d(TAG, "릴레이 전송 성공: [$sender] $content")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "릴레이 전송 오류: ${e.message}")
        }
    }
}
