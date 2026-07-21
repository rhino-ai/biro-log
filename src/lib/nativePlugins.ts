import { registerPlugin, Capacitor } from '@capacitor/core';

// -------- Usage Stats (Android only) --------
export interface UsageStatsPlugin {
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  getDailyUsage(options: { days: number }): Promise<{ apps: Array<{ packageName: string; appName: string; minutes: number; date: string }>; totalMinutesToday: number }>;
}

export const UsageStats = registerPlugin<UsageStatsPlugin>('UsageStats', {
  web: {
    hasPermission: async () => ({ granted: false }),
    requestPermission: async () => { throw new Error('Not supported on web'); },
    getDailyUsage: async () => ({ apps: [], totalMinutesToday: 0 }),
  },
});

// -------- Live Call foreground service (Android) --------
export interface LiveCallNotifierPlugin {
  start(options: { roomName: string; roomCode: string }): Promise<void>;
  stop(): Promise<void>;
}

export const LiveCallNotifier = registerPlugin<LiveCallNotifierPlugin>('LiveCallNotifier', {
  web: {
    start: async () => {},
    stop: async () => {},
  },
});

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const isNativeIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';