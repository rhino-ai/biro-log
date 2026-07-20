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
    const path = parseDeepLink(url);
    if (path) navigate(path);
  });

  // If the app was cold-launched by a link, honor it once ready.
  try {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) {
      const path = parseDeepLink(launch.url);
      if (path) navigate(path);
    }
  } catch {}

  // Network status logging (available to app via Network.getStatus / addListener)
  Network.addListener('networkStatusChange', (status) => {
    (window as any).__network = status;
  });

  // FCM push notifications
  await registerPush();
}

/** Extract an in-app route from any incoming deep link. Returns null if not routable. */
export function parseDeepLink(url: string): string | null {
  try {
    const u = new URL(url);
    // Accept our https host + custom scheme; ignore anything else.
    const allowedHosts = new Set([
      'biro-log.lovable.app',
      'id-preview--0c774921-ede0-4ae7-8a9e-613a154bfa58.lovable.app',
    ]);
    const isCustomScheme = u.protocol.startsWith('app.lovable');
    if (!isCustomScheme && u.protocol !== 'https:') return null;
    if (!isCustomScheme && !allowedHosts.has(u.hostname)) return null;
    const path = (u.pathname || '/') + (u.search || '') + (u.hash || '');
    return path && path !== '/' ? path : null;
  } catch {
    return null;
  }
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