import { UsageStats, isNativeAndroid, isNativeIOS } from '@/lib/nativePlugins';
import { Capacitor } from '@capacitor/core';

export type AppUsage = { packageName: string; appName: string; minutes: number; date: string };

export const usageStats = {
  available: () => isNativeAndroid(),
  platform: () => Capacitor.getPlatform(),
  async hasPermission(): Promise<boolean> {
    if (!isNativeAndroid()) return false;
    try { const r = await UsageStats.hasPermission(); return !!r.granted; } catch { return false; }
  },
  async requestPermission(): Promise<void> {
    if (!isNativeAndroid()) throw new Error('Android only');
    await UsageStats.requestPermission();
  },
  async getDailyUsage(days = 7): Promise<{ apps: AppUsage[]; totalMinutesToday: number }> {
    if (!isNativeAndroid()) return { apps: [], totalMinutesToday: 0 };
    try { return await UsageStats.getDailyUsage({ days }); } catch { return { apps: [], totalMinutesToday: 0 }; }
  },
  async openIOSScreenTime() {
    if (!isNativeIOS()) return;
    try {
      const { App } = await import('@capacitor/app');
      await (App as any).openUrl?.({ url: 'App-Prefs:SCREEN_TIME' }).catch(() => {});
    } catch {}
  },
};