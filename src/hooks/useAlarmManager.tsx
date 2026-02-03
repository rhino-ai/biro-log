import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { toast } from '@/hooks/use-toast';

// Embedded audio data URIs for reliable alarm sounds
const BEEP_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1aW1ljcXOCioiGgn5+fnx6eHh5e36BhIeJiomIhoN/fnx6eXl6e32AhIeKjI2NjIuJhoN+e3l4eHl7fX+ChYiLjY6Ojo2LiYaDenh3d3h5e36Ag4aJjI6PkI+OjIqHg355d3Z3eHt9gIOGiYyOj5CQj42LiIV/e3h2dnh5fH+ChYiLjY+QkJCOjIqGgn15d3Z3eHt+gYOGiYuOj5CQj42LiIWAfXl3dnd5e36Bg4aJi42Oj4+OjYuIhYB8eXd2d3l7foCDhoiLjY6Pj46NjImGgn56d3Z3eXt+gIOFiIuNjo+Pjo2LiIWBfXp4dnd5e36AgIKFiIuNjo6OjYuJhoJ+e3l3dnh7fYCDhYiLjI2Ojo6NjImGg398enh3eHt9gIOFiIqMjY2NjYyKiISBfnx5d3h5e3+Bg4WIioqMjIyMi4mGhIJ+fHp4eHl7fX+Cg4WIiYuLi4uKiYeEgn58enl4eXt9gIGDhoiJioqLi4qIhoSCf3x6eXh5e32AgIKFh4iJioqKiYiGhIJ/fXt5eHl6fH+AgYOGh4iJiYmJiIeGg4F+fHt5eXp7fYB/gYKEhYaHh4eHh4eGhYOCf317eXl5ent9f4CCg4SFhYaGhoaGhYSEgoB+fHt6enp7fX5/gYKDhISFhYWFhYWEhIOBgH58e3p6ent8fX9/gYGCg4SEhISEhISEg4KBf357enp5ent8fX5/gYGCgoODg4ODg4ODgoGAfnx7enp6e3x9fn+AgYGCgoKCgoKCgoKBgH98e3p6enp7fH1+fn+AgIGBgYGBgYGBgYB/fnx7enp6e3x8fX5+f4CAgICAgICAgIB/fn18e3p6ent7fH1+fn9/gICAgICAgIB/fn18fHt7e3t7fH1+fn5/f39/f39/f39/fn19fHt7e3t7fHx9fn5+f39/f39/f35+fn19fHx7e3t8fHx9fX5+fn9/f39/fn5+fX19fHx8fHx8fH19fn5+fn5+fn5+fn19fX18fHx8fHx8fX19fn5+fn5+fn5+fX19fXx8fHx8fHx9fX19fn5+fn5+fn59fX19fHx8fHx8fH19fX5+fn5+fn5+fn19fX18fHx8fHx8fX19fn5+fn5+fn59fX19fXx8fHx8fHx9fX1+fn5+fn5+fn19fX19fHx8fHx8fH19fX5+fn5+fn5+fX19fX18fHx8fHx8fX19fn5+fn5+fn59fX19fXx8fHx8fHx9fX1+fn5+fn5+fn19fX19fHx8fHx8fH19fX5+fn5+fn5+fX19fX18fHx8fHx8fX19fn5+fn5+fn59fX19fXx8fHx8fHx9fX19fn5+fn5+fn59fX19fX18fHx8fH19fX1+fn5+fn5+fn19fX19fXx8fHx8fX19fX5+fn5+fn5+fX19fX19fHx8fHx9fX19fn5+fn5+fn59fX19fX18fHx8fH19fX1+fn5+fn5+fn19fX19fXx8fHx8fX19fX5+fn5+fn5+fX19fX19fHx8fHx9fX19fn5+fn5+fn5+fn19fX19fHx8fH19fX1+fn5+fn5+fn5+fX19fX18fHx8fX19fX5+fn5+fn5+fn59fX19fXx8fHx9fX19fn5+fn5+fn5+fn19fX19fX18fH19fX1+fn5+fn5+fn5+fX19fX19fHx8fX19fX5+fn5+fn5+fn59fX19fX19fH19fX1+fn5+fn5+fn5+fn19fX19fX18fX19fX5+fn5+fn5+fn5+fX19fX19fXx9fX19fn5+fn5+fn5+fn59fX19fX19fH19fX5+fn5+fn5+fn5+fn19fX19fX18fX19fn5+fn5+fn5+fn5+fX19fX19fX19fX1+fn5+fn5+fn5+fn59fX19fX19fX19fn5+fn5+fn5+fn5+fn19fX19fX19fX1+fn5+fn5+fn5+fn5+fX19fX19fX19fX5+fn5+fn5+fn5+fn59fX19fX19fX1+fn5+fn5+fn5+fn5+fn19fX19fX19fn5+fn5+fn5+fn5+fn5+fX19fX19fX1+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+';

export const useAlarmManager = () => {
  const tasks = useGameStore((state) => state.tasks);
  const getOverdueTasks = useGameStore((state) => state.getOverdueTasks);
  const checkDeadlinesAndUpdateBacklog = useGameStore((state) => state.checkDeadlinesAndUpdateBacklog);
  const checkedAlarmsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Initialize audio context on user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a beep alarm sound using Web Audio API
  const playBeepAlarm = useCallback(() => {
    try {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop any existing oscillator
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) {}
        oscillatorRef.current = null;
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      
      oscillatorRef.current = oscillator;
      oscillator.start();
      setIsPlaying(true);
      
      // Stop after 3 seconds
      setTimeout(() => {
        try {
          if (oscillatorRef.current === oscillator) {
            oscillator.stop();
            oscillatorRef.current = null;
            setIsPlaying(false);
          }
        } catch (e) {}
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('Web Audio API failed:', error);
      return false;
    }
  }, [initAudioContext]);

  // Fallback: Play using HTML Audio
  const playAudioElement = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      audioRef.current = new Audio(BEEP_SOUND);
      audioRef.current.loop = false;
      audioRef.current.volume = 1.0;
      
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          setIsPlaying(false);
        }, 3000);
      }).catch((err) => {
        console.error('Audio playback failed:', err);
      });
    } catch (error) {
      console.error('HTML Audio failed:', error);
    }
  }, []);

  const playAlarm = useCallback((soundId?: string) => {
    // Try Web Audio API first
    const success = playBeepAlarm();
    if (!success) {
      playAudioElement();
    }
  }, [playBeepAlarm, playAudioElement]);

  const stopAlarm = useCallback(() => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping alarm:', error);
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
            duration: 15000,
          });

          // Request browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('📋 Biro-log: Task Reminder', {
                body: task.title,
                icon: '/logo.png',
                tag: task.id,
                requireInteraction: true,
              });
            } catch (notifError) {
              console.error('Notification error:', notifError);
            }
          }

          // Vibrate if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
        }
      });

      // Check for overdue tasks and show alerts (once per hour)
      const overdueTasks = getOverdueTasks();
      if (overdueTasks.length > 0) {
        const overdueKey = `overdue-${currentDate}-${now.getHours()}`;
        if (!checkedAlarmsRef.current.has(overdueKey)) {
          checkedAlarmsRef.current.add(overdueKey);
          
          playAlarm();
          
          toast({
            title: '⚠️ RAID ALERT!',
            description: `${overdueTasks.length} tasks are overdue! Enter the Raid Arena!`,
            variant: 'destructive',
            duration: 20000,
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('👹 RAID ALERT - Backlog Boss!', {
                body: `${overdueTasks.length} tasks are overdue! Face the boss!`,
                icon: '/logo.png',
                tag: 'raid-alert',
                requireInteraction: true,
              });
            } catch (e) {}
          }
        }
      }

      // Update backlog count
      checkDeadlinesAndUpdateBacklog();
    } catch (error) {
      console.error('Error checking alarms:', error);
    }
  }, [tasks, playAlarm, getOverdueTasks, checkDeadlinesAndUpdateBacklog]);

  // Request notification permission on mount
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        // Show a toast asking user to enable notifications
        toast({
          title: '🔔 Enable Notifications?',
          description: 'Allow notifications to get task reminders!',
          duration: 10000,
        });
        
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            toast({
              title: '✅ Notifications Enabled!',
              description: 'You will receive task reminders.',
            });
          }
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, []);

  // Check alarms every minute
  useEffect(() => {
    // Initial check after 1 second
    const initialTimeout = setTimeout(checkAlarms, 1000);
    
    // Then check every minute
    const interval = setInterval(checkAlarms, 60000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkAlarms]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAlarm();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAlarm]);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [initAudioContext]);

  return { playAlarm, stopAlarm, isPlaying };
};
