# Native Android plugins (copy into your local `android/` after `npx cap add android`)

These plugins add:
- **UsageStats** — real per-app screen time via Android's `UsageStatsManager` (needs "Usage access" special permission).
- **LiveCallNotifier** — persistent foreground-service notification while a Virtual Library call is active.

## One-time setup (on your machine)

```bash
git pull
npm install
npx cap add android      # if you haven't already
npx cap sync android
```

Then create the files below inside your local `android/` project. Package path uses your app id
(`app.lovable.0c774921ede04ae78a9e613a154bfa58`) — adjust the `package` line to match your
actual generated folder if Capacitor picked a different one.

---

## 1. `android/app/src/main/AndroidManifest.xml`

Inside `<manifest ...>` add (alongside the other `<uses-permission>` entries):

```xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

And inside `<application ...>`:

```xml
<service
  android:name=".livecall.CallForegroundService"
  android:foregroundServiceType="mediaProjection"
  android:exported="false" />
```

Make sure `xmlns:tools="http://schemas.android.com/tools"` is declared on `<manifest>` (Capacitor already sets this).

---

## 2. `android/app/src/main/java/<your-package>/usagestats/UsageStatsPlugin.kt`

```kotlin
package <your.package>.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Calendar

@CapacitorPlugin(name = "UsageStats")
class UsageStatsPlugin : Plugin() {

  @PluginMethod
  fun hasPermission(call: PluginCall) {
    val ctx = context
    val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    else
      @Suppress("DEPRECATION") appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    val res = JSObject(); res.put("granted", mode == AppOpsManager.MODE_ALLOWED)
    call.resolve(res)
  }

  @PluginMethod
  fun requestPermission(call: PluginCall) {
    val i = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(i); call.resolve()
  }

  @PluginMethod
  fun getDailyUsage(call: PluginCall) {
    val days = call.getInt("days", 7) ?: 7
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val pm = context.packageManager
    val cal = Calendar.getInstance()
    cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
    val startToday = cal.timeInMillis
    val start = startToday - (days - 1L) * 24L * 3600L * 1000L
    val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, System.currentTimeMillis()) ?: emptyList()
    val arr = JSArray()
    var totalToday = 0L
    for (s in stats) {
      if (s.totalTimeInForeground <= 0) continue
      val name = try { pm.getApplicationLabel(pm.getApplicationInfo(s.packageName, 0)).toString() }
                 catch (_: PackageManager.NameNotFoundException) { s.packageName }
      val day = java.text.SimpleDateFormat("yyyy-MM-dd").format(java.util.Date(s.firstTimeStamp))
      val minutes = (s.totalTimeInForeground / 60000L).toInt()
      val o = JSObject()
      o.put("packageName", s.packageName); o.put("appName", name); o.put("minutes", minutes); o.put("date", day)
      arr.put(o)
      if (s.lastTimeUsed >= startToday) totalToday += s.totalTimeInForeground
    }
    val res = JSObject(); res.put("apps", arr); res.put("totalMinutesToday", (totalToday / 60000L).toInt())
    call.resolve(res)
  }
}
```

---

## 3. `android/app/src/main/java/<your-package>/livecall/CallForegroundService.kt`

```kotlin
package <your.package>.livecall

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class CallForegroundService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val roomName = intent?.getStringExtra("roomName") ?: "Study Room"
    val channelId = "biro-live-call"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (nm.getNotificationChannel(channelId) == null) {
        nm.createNotificationChannel(NotificationChannel(channelId, "Live Study Room", NotificationManager.IMPORTANCE_LOW))
      }
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val pi = PendingIntent.getActivity(this, 0, launch,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val notif = NotificationCompat.Builder(this, channelId)
      .setSmallIcon(android.R.drawable.presence_video_online)
      .setContentTitle("🔴 You are LIVE")
      .setContentText("Camera & mic sharing in $roomName")
      .setOngoing(true)
      .setContentIntent(pi)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
    startForeground(9911, notif)
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
    else @Suppress("DEPRECATION") stopForeground(true)
  }
}
```

## 4. `android/app/src/main/java/<your-package>/livecall/LiveCallNotifierPlugin.kt`

```kotlin
package <your.package>.livecall

import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "LiveCallNotifier")
class LiveCallNotifierPlugin : Plugin() {
  @PluginMethod
  fun start(call: PluginCall) {
    val name = call.getString("roomName") ?: "Study Room"
    val i = Intent(context, CallForegroundService::class.java).putExtra("roomName", name)
    if (android.os.Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
    call.resolve()
  }
  @PluginMethod
  fun stop(call: PluginCall) {
    context.stopService(Intent(context, CallForegroundService::class.java))
    call.resolve()
  }
}
```

## 5. Register plugins in `MainActivity.java`

```java
import <your.package>.usagestats.UsageStatsPlugin;
import <your.package>.livecall.LiveCallNotifierPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(UsageStatsPlugin.class);
    registerPlugin(LiveCallNotifierPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
```

Then run:

```bash
npx cap sync android
npx cap run android
```

The first time you open "Digital Discipline", a **"Grant access"** button opens the Android
"Usage access" screen. After enabling Biro-log, real per-app minutes appear in the app.

During any Virtual Library call, a persistent low-priority notification stays in the
notification tray with a "Return to room" tap target — even after the tab / app is
backgrounded or the phone is locked.