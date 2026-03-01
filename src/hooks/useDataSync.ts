import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Syncs gameStore data with the database.
 * All operations are non-blocking with timeouts.
 */
export const useDataSync = () => {
  const { user } = useAuth();
  const hasLoaded = useRef(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Helper: run a promise-like with a timeout
  const withTimeout = <T,>(promiseLike: PromiseLike<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      Promise.resolve(promiseLike),
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  };

  const loadFromDB = useCallback(async (userId: string) => {
    console.log('[DataSync] Loading profile for', userId);
    try {
      const profileResult = await withTimeout(
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        5000,
        { data: null, error: { message: 'Profile load timeout' } as any, count: null, status: 408, statusText: 'Timeout' }
      );

      const { data: profile, error } = profileResult;

      if (error) {
        console.warn('[DataSync] Profile load issue:', error.message);
        return; // Non-blocking - app works with local data
      }

      if (profile) {
        const store = useGameStore.getState();
        store.updateProfile({
          name: profile.name || 'Student',
          avatar: profile.avatar || '👨‍🎓',
          dreamCollege: profile.dream_college || 'IIT Bombay',
          dreamCollegeImage: profile.dream_college_image || undefined,
          dreamMarks: {
            cbse: profile.dream_marks_cbse || 95,
            jeeMain: profile.dream_marks_jee_main || 250,
            jeeAdvanced: profile.dream_marks_jee_advanced || 180,
          },
        });
        store.updateExamDates({
          cbse: profile.exam_date_cbse || '2026-03-15',
          jeeMain: profile.exam_date_jee_main || '2026-01-20',
          jeeAdvanced: profile.exam_date_jee_advanced || '2026-05-25',
        });
        if (profile.xp != null) store.addXP(profile.xp - store.xp);
        if (profile.coins != null) store.addCoins(profile.coins - store.coins);
        console.log('[DataSync] Profile loaded successfully');
      }

      // Load chapter progress (non-blocking)
      const chapterResult = await withTimeout(
        supabase.from('user_chapter_progress').select('*').eq('user_id', userId),
        5000,
        { data: null, error: { message: 'Chapter progress timeout' } as any, count: null, status: 408, statusText: 'Timeout' }
      );

      if (chapterResult.data && chapterResult.data.length > 0) {
        const store = useGameStore.getState();
        chapterResult.data.forEach((cp) => {
          const jungle = store.jungles.find(j => j.id === cp.jungle_id);
          if (jungle) {
            const chapter = jungle.chapters.find(c => c.id === cp.chapter_id);
            if (chapter) {
              if (chapter.theoryDone !== (cp.theory_done ?? false))
                store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'theoryDone', cp.theory_done ?? false);
              if (chapter.practiceDone !== (cp.practice_done ?? false))
                store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'practiceDone', cp.practice_done ?? false);
              if (chapter.revisionDone !== (cp.revision_done ?? false))
                store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'revisionDone', cp.revision_done ?? false);
            }
          }
        });
        console.log('[DataSync] Chapter progress loaded');
      }
    } catch (err) {
      console.warn('[DataSync] loadFromDB error (non-blocking):', err);
    }
  }, []);

  const saveToDB = useCallback(async (userId: string) => {
    try {
      const store = useGameStore.getState();
      const { profile, examDates, xp, level, coins, streak, lastStudyDate } = store;

      await withTimeout(
        supabase.from('profiles').update({
          name: profile.name,
          avatar: profile.avatar,
          dream_college: profile.dreamCollege,
          dream_college_image: profile.dreamCollegeImage || null,
          dream_marks_cbse: profile.dreamMarks.cbse,
          dream_marks_jee_main: profile.dreamMarks.jeeMain,
          dream_marks_jee_advanced: profile.dreamMarks.jeeAdvanced,
          exam_date_cbse: examDates.cbse,
          exam_date_jee_main: examDates.jeeMain,
          exam_date_jee_advanced: examDates.jeeAdvanced,
          xp, level, coins, streak,
          last_study_date: lastStudyDate,
        }).eq('user_id', userId),
        5000,
        null
      );
    } catch (err) {
      console.warn('[DataSync] Save error (non-blocking):', err);
    }
  }, []);

  const saveChapterProgress = useCallback(async (userId: string) => {
    try {
      const { jungles } = useGameStore.getState();
      for (const jungle of jungles) {
        for (const chapter of jungle.chapters) {
          if (chapter.theoryDone || chapter.practiceDone || chapter.revisionDone) {
            await withTimeout(
              supabase.from('user_chapter_progress').upsert({
                user_id: userId,
                jungle_id: jungle.id,
                chapter_id: chapter.id,
                theory_done: chapter.theoryDone,
                practice_done: chapter.practiceDone,
                revision_done: chapter.revisionDone,
              }, { onConflict: 'user_id,jungle_id,chapter_id' }),
              3000,
              null
            );
          }
        }
      }
    } catch (err) {
      console.warn('[DataSync] Chapter save error (non-blocking):', err);
    }
  }, []);

  const debouncedSave = useCallback((userId: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveToDB(userId);
      saveChapterProgress(userId);
    }, 2000);
  }, [saveToDB, saveChapterProgress]);

  // Load on mount - fire and forget
  useEffect(() => {
    if (user && !hasLoaded.current) {
      hasLoaded.current = true;
      loadFromDB(user.id);
    }
  }, [user, loadFromDB]);

  // Subscribe to store changes and auto-save
  useEffect(() => {
    if (!user) return;
    const unsub = useGameStore.subscribe(() => {
      debouncedSave(user.id);
    });
    return () => {
      unsub();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [user, debouncedSave]);
};
