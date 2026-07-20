import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';

export const isNative = () => Capacitor.isNativePlatform();

/** Initialize native-only behavior. Safe to call unconditionally. */
export async function initNative(navigate: (path: string) => void) {
  if (!isNative()) return;

  // Status bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch {}

  // Splash screen hide when app is ready
  try { await SplashScreen.hide(); } catch {}

  // Hardware back button -> browser history / exit at root
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  });

  // Deep links / App Links: universal URLs open into the SPA route
  CapApp.addListener('appUrlOpen', ({ url }) => {
    try {
      const u = new URL(url);
      // Handle both custom scheme (app.lovable.<id>://) and https App Links
      const path = (u.pathname || '/') + (u.search || '') + (u.hash || '');
      if (path && path !== '/') navigate(path);
    } catch {}
  });

  // Network status logging (available to app via Network.getStatus / addListener)
  Network.addListener('networkStatusChange', (status) => {
    (window as any).__network = status;
  });

  // FCM push notifications
  await registerPush();
}

async function registerPush() {
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;
        // Reuse the push_subscriptions table; FCM rows use endpoint = fcm:<token>.
        await (supabase.from('push_subscriptions') as any).upsert(
          {
            user_id: uid,
            endpoint: `fcm:${token.value}`,
            p256dh: 'fcm',
            auth: 'fcm',
            user_agent: `android-native/${navigator.userAgent}`,
          },
          { onConflict: 'user_id,endpoint' }
        );
      } catch (e) {
        console.warn('FCM token upsert failed', e);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('FCM registration error', err);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (n) => {
      const url = (n.notification.data as any)?.url;
      if (url && typeof url === 'string') {
        window.location.assign(url);
      }
    });
  } catch (e) {
    console.warn('Push init failed', e);
  }
}