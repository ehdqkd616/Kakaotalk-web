package com.kakaoweb.relay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * 기기 부팅 완료 시 릴레이 서비스가 자동으로 활성화되도록 합니다.
 * NotificationListenerService 는 시스템이 관리하므로 별도 시작 불필요.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("KakaoRelay", "부팅 완료 – 릴레이 서비스 대기 중")
        }
    }
}
