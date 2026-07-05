package com.kakaoweb.relay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private lateinit var tvStatus: TextView
    private lateinit var tvPermissionStatus: TextView
    private lateinit var tvLog: TextView
    private lateinit var etServerUrl: TextInputEditText
    private lateinit var etUserId: TextInputEditText
    private lateinit var btnSave: MaterialButton
    private lateinit var btnPermission: MaterialButton
    private lateinit var btnClearLog: TextView

    // 릴레이 로그 업데이트 수신기
    private val relayReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val log = intent.getStringExtra("log") ?: return
            appendLog(log)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvPermissionStatus = findViewById(R.id.tvPermissionStatus)
        tvLog = findViewById(R.id.tvLog)
        etServerUrl = findViewById(R.id.etServerUrl)
        etUserId = findViewById(R.id.etUserId)
        btnSave = findViewById(R.id.btnSave)
        btnPermission = findViewById(R.id.btnPermission)
        btnClearLog = findViewById(R.id.btnClearLog)

        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)

        // 저장된 설정 불러오기
        etServerUrl.setText(prefs.getString("SERVER_URL", "http://192.168.0.1:4000"))
        etUserId.setText(prefs.getString("USER_ID", ""))

        // 장치 ID 초기화
        if (prefs.getString("DEVICE_ID", null) == null) {
            prefs.edit().putString("DEVICE_ID", UUID.randomUUID().toString()).apply()
        }

        // 저장된 로그 불러오기
        val savedLog = prefs.getString("RELAY_LOG", null)
        if (savedLog != null) tvLog.text = savedLog

        btnSave.setOnClickListener {
            val url = etServerUrl.text?.toString()?.trimEnd('/') ?: ""
            val uid = etUserId.text?.toString()?.trim() ?: ""
            if (url.isBlank() || uid.isBlank()) {
                Toast.makeText(this, getString(R.string.toast_fill_fields), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            saveAndRegister(url, uid)
        }

        btnPermission.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnClearLog.setOnClickListener {
            tvLog.text = getString(R.string.log_empty)
            getSharedPreferences("relay_config", MODE_PRIVATE)
                .edit().remove("RELAY_LOG").apply()
        }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionUI()
        updateStatusUI()

        // 릴레이 이벤트 수신 등록
        LocalBroadcastManager.getInstance(this).registerReceiver(
            relayReceiver,
            IntentFilter("com.kakaoweb.relay.NEW_MESSAGE")
        )
    }

    override fun onPause() {
        super.onPause()
        LocalBroadcastManager.getInstance(this).unregisterReceiver(relayReceiver)
    }

    private fun updatePermissionUI() {
        if (isNotificationListenerEnabled()) {
            tvPermissionStatus.text = getString(R.string.permission_granted)
            tvPermissionStatus.setTextColor(getColor(R.color.status_green))
            btnPermission.visibility = android.view.View.GONE
        } else {
            tvPermissionStatus.text = getString(R.string.permission_required)
            tvPermissionStatus.setTextColor(getColor(R.color.text_secondary))
            btnPermission.visibility = android.view.View.VISIBLE
        }
    }

    private fun updateStatusUI() {
        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        val hasConfig = !prefs.getString("SERVER_URL", "").isNullOrBlank()
                && !prefs.getString("USER_ID", "").isNullOrBlank()

        if (hasConfig && isNotificationListenerEnabled()) {
            tvStatus.text = getString(R.string.status_connected)
            tvStatus.setTextColor(getColor(R.color.status_green))
        } else {
            tvStatus.text = getString(R.string.status_disconnected)
            tvStatus.setTextColor(getColor(android.R.color.white))
        }
    }

    private fun saveAndRegister(serverUrl: String, userId: String) {
        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        val deviceId = prefs.getString("DEVICE_ID", UUID.randomUUID().toString())!!
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"

        prefs.edit()
            .putString("SERVER_URL", serverUrl)
            .putString("USER_ID", userId)
            .apply()

        btnSave.isEnabled = false
        btnSave.text = "연결 중…"

        CoroutineScope(Dispatchers.IO).launch {
            val success = try {
                val json = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("userId", userId)
                    put("deviceName", deviceName)
                }
                val body = json.toString().toRequestBody("application/json".toMediaType())
                val req = Request.Builder()
                    .url("$serverUrl/api/relay/register")
                    .post(body)
                    .build()
                val response = http.newCall(req).execute()
                response.isSuccessful.also { response.close() }
            } catch (e: Exception) {
                false
            }

            withContext(Dispatchers.Main) {
                btnSave.isEnabled = true
                btnSave.text = getString(R.string.btn_save)
                if (success) {
                    Toast.makeText(this@MainActivity, getString(R.string.toast_saved), Toast.LENGTH_SHORT).show()
                    updateStatusUI()
                } else {
                    Toast.makeText(this@MainActivity, getString(R.string.toast_save_failed), Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun appendLog(entry: String) {
        val prefs = getSharedPreferences("relay_config", MODE_PRIVATE)
        val current = tvLog.text.toString()
        val updated = if (current == getString(R.string.log_empty)) entry
                      else "$entry\n$current"
        // 최대 20줄 유지
        val trimmed = updated.lines().take(20).joinToString("\n")
        tvLog.text = trimmed
        prefs.edit().putString("RELAY_LOG", trimmed).apply()
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        return flat?.contains(packageName) == true
    }
}
