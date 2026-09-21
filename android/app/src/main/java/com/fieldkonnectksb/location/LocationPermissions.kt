package com.fieldkonnect.ksb.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Whether Android will let the live-location foreground service start. On Android 14+ a
 * location-type foreground service throws SecurityException without location permission, and
 * when it is started from the background (boot, app update, a restart) it also needs "Allow all
 * the time". Every caller checks this first so the service is never started into a crash.
 */
object LocationPermissions {
  fun hasForeground(context: Context): Boolean =
    granted(context, Manifest.permission.ACCESS_FINE_LOCATION) ||
      granted(context, Manifest.permission.ACCESS_COARSE_LOCATION)

  /** Needed when the start does not come from the app on screen. */
  fun hasBackground(context: Context): Boolean =
    hasForeground(context) && (
      Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
        granted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
      )

  private fun granted(context: Context, permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
}
