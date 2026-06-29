package com.kakaoweb.relay

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID

/**
 * 설정 화면.
 * 사용자가 서버 URL / User ID 를 입력하고 알림 접근 권한을 활성화합니다.
 *
 * UI는 activity_main.xml 에서 정의 (간략화를 위해 EditText 두 개 + 버튼 구성)
 */
class MainActivity : AppCompatActivity() {

    private val http = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)

        // 알림 접근 권한 확인
        if (!isNotificationListenerEnabled()) {
            AlertDialog.Builder(this)
                .setTitle("알림 접근 권한 필요")
                .setMessage("카카오톡 메시지를 수신하려면 '알림 접근' 권한이 필요합니다.")
                .setPositiveButton("설정 열기") { _, _ ->
                    startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                }
                .setNegativeButton("나중에") { d, _ -> d.dismiss() }
                .show()
        }

        // 저장된 설정 로드
        val savedUrl = prefs.getString("SERVER_URL", "http://192.168.0.1:4000") ?: ""
        val savedUserId = prefs.getString("USER_ID", "") ?: ""
        var deviceId = prefs.getString("DEVICE_ID", null)
        if (deviceId == null) {
            deviceId = UUID.randomUUID().toString()
            prefs.edit().putString("DEVICE_ID", deviceId).apply()
        }

        // TODO: 실제 구현에서는 activity_main.xml 의 View 를 참조해
        //       아래 로직을 버튼 클릭 이벤트에 연결하세요.
        //
        // val etUrl = findViewById<EditText>(R.id.etServerUrl)
        // val etUserId = findViewById<EditText>(R.id.etUserId)
        // val btnSave = findViewById<Button>(R.id.btnSave)
        //
        // etUrl.setText(savedUrl)
        // etUserId.setText(savedUserId)
        //
        // btnSave.setOnClickListener {
        //     val url = etUrl.text.toString().trimEnd('/')
        //     val uid = etUserId.text.toString().trim()
        //     saveAndRegister(url, uid, deviceId!!)
        // }

        // 저장된 값은 위 TODO 주석의 EditText 초기화에 사용됩니다.
        Log.d("KakaoRelay", "저장된 서버: $savedUrl / 유저: $savedUserId")
    }

    private fun saveAndRegister(serverUrl: String, userId: String, deviceId: String) {
        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        prefs.edit()
            .putString("SERVER_URL", serverUrl)
            .putString("USER_ID", userId)
            .putString("DEVICE_ID", deviceId)
            .apply()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("userId", userId)
                    put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
                }
                val body = json.toString().toRequestBody("application/json".toMediaType())
                val req = Request.Builder()
                    .url("$serverUrl/api/relay/register")
                    .post(body)
                    .build()
                http.newCall(req).execute().close()

                runOnUiThread {
                    Toast.makeText(this@MainActivity, "서버 등록 완료!", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "연결 실패: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        return flat?.contains(packageName) == true
    }
}
