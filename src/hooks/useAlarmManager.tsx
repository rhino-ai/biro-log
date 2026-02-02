import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { toast } from '@/hooks/use-toast';

// Alarm sound URLs
const alarmSounds: Record<string, string> = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  alarm: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3',
  bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  chime: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
  urgent: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3',
};

export const useAlarmManager = () => {
  const tasks = useGameStore((state) => state.tasks);
  const getOverdueTasks = useGameStore((state) => state.getOverdueTasks);
  const checkedAlarmsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAlarm = useCallback((soundId: string) => {
    try {
      const soundUrl = alarmSounds[soundId] || alarmSounds.default;
      
      // Stop any currently playing alarm
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      audioRef.current = new Audio(soundUrl);
      audioRef.current.loop = true;
      audioRef.current.play().catch((error) => {
        console.error('Failed to play alarm:', error);
      });

      // Stop after 30 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      }, 30000);
    } catch (error) {
      console.error('Error playing alarm:', error);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const checkAlarms = useCallback(() => {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0];

      tasks.forEach((task) => {
        if (task.completed) return;
        if (!task.alarm?.enabled) return;
        
        // Create unique key for this alarm instance
        const alarmKey = `${task.id}-${currentDate}-${task.alarm.time}`;
        
        // Skip if already triggered today
        if (checkedAlarmsRef.current.has(alarmKey)) return;

        // Check if alarm time matches current time
        if (task.alarm.time === currentTime) {
          checkedAlarmsRef.current.add(alarmKey);
          
          // Play alarm sound
          playAlarm(task.alarm.ringtone || 'default');
          
          // Show notification toast
          toast({
            title: '⏰ Task Reminder!',
            description: task.title,
            duration: 10000,
          });

          // Request browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('📋 Task Reminder', {
                body: task.title,
                icon: '/favicon.ico',
                tag: task.id,
              });
            } catch (notifError) {
              console.error('Notification error:', notifError);
            }
          }
        }
      });

      // Check for overdue tasks and show alerts
      const overdueTasks = getOverdueTasks();
      if (overdueTasks.length > 0) {
        const overdueKey = `overdue-${currentDate}-${now.getHours()}`;
        if (!checkedAlarmsRef.current.has(overdueKey)) {
          checkedAlarmsRef.current.add(overdueKey);
          toast({
            title: '⚠️ RAID ALERT!',
            description: `${overdueTasks.length} tasks are overdue! Enter the Raid Arena!`,
            variant: 'destructive',
            duration: 15000,
          });
        }
      }
    } catch (error) {
      console.error('Error checking alarms:', error);
    }
  }, [tasks, playAlarm, getOverdueTasks]);

  // Request notification permission on mount
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(console.error);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, []);

  // Check alarms every minute
  useEffect(() => {
    checkAlarms(); // Initial check
    const interval = setInterval(checkAlarms, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkAlarms]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { playAlarm, stopAlarm };
};
