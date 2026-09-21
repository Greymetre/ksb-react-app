package com.fieldkonnect.ksb.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (!LocationStorage.isActive(context)) return

    if (
      action == Intent.ACTION_BOOT_COMPLETED ||
      action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
      action == Intent.ACTION_MY_PACKAGE_REPLACED
    ) {
      Log.d("FieldKonnectLocation", "Restarting tracking after $action")
      val serviceIntent = Intent(context, LocationForegroundService::class.java).apply {
        this.action = LocationForegroundService.ACTION_START
      }
      // From boot or an app update the app is in the background: Android 14+ only allows a
      // location service then with "Allow all the time". Without it tracking resumes when the
      // user next opens the app, instead of crashing here.
      if (!LocationPermissions.hasBackground(context)) {
        Log.w("FieldKonnectLocation", "Not restarting tracking after $action: background location not allowed")
        return
      }
      try {
        ContextCompat.startForegroundService(context, serviceIntent)
      } catch (error: Exception) {
        Log.w("FieldKonnectLocation", "Could not restart tracking after $action", error)
      }
    }
  }
}
