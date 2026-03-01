import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Syncs gameStore data with the database.
 * - Loads profile data from DB on mount
 * - Saves profile/exam/progress changes back to DB on change
 * - Syncs chapter progress bidirectionally
 */
export const useDataSync = () => {
  const { user } = useAuth();
  const hasLoaded = useRef(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load profile data from DB
  const loadFromDB = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        const store = useGameStore.getState();
        
        // Update profile info
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

        // Update exam dates
        store.updateExamDates({
          cbse: profile.exam_date_cbse || '2026-03-15',
          jeeMain: profile.exam_date_jee_main || '2026-01-20',
          jeeAdvanced: profile.exam_date_jee_advanced || '2026-05-25',
        });

        // Update XP, level, coins, streak
        if (profile.xp != null) store.addXP(profile.xp - store.xp);
        if (profile.coins != null) store.addCoins(profile.coins - store.coins);
      }

      // Load chapter progress
      const { data: chapterProgress } = await supabase
        .from('user_chapter_progress')
        .select('*')
        .eq('user_id', userId);

      if (chapterProgress && chapterProgress.length > 0) {
        const store = useGameStore.getState();
        chapterProgress.forEach((cp) => {
          // Update without triggering XP gains (direct state update)
          const currentJungles = store.jungles;
          const jungle = currentJungles.find(j => j.id === cp.jungle_id);
          if (jungle) {
            const chapter = jungle.chapters.find(c => c.id === cp.chapter_id);
            if (chapter) {
              // Only update if different to avoid loops
              if (chapter.theoryDone !== (cp.theory_done ?? false)) {
                store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'theoryDone', cp.theory_done ?? false);
              }
              if (chapter.practiceDone !== (cp.practice_done ?? false)) {
                store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'practiceDone', cp.practice_done ?? false);
              }
              if (chapter.revisionDone !== (cp.revision_done ?? false)) {
                store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'revisionDone', cp.revision_done ?? false);
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('Error in loadFromDB:', err);
    }
  }, []);

  // Save profile data to DB
  const saveToDB = useCallback(async (userId: string) => {
    try {
      const store = useGameStore.getState();
      const { profile, examDates, xp, level, coins, streak, lastStudyDate } = store;

      await supabase
        .from('profiles')
        .update({
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
          xp,
          level,
          coins,
          streak,
          last_study_date: lastStudyDate,
        })
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error saving to DB:', err);
    }
  }, []);

  // Save chapter progress to DB
  const saveChapterProgress = useCallback(async (userId: string) => {
    try {
      const store = useGameStore.getState();
      const { jungles } = store;

      for (const jungle of jungles) {
        for (const chapter of jungle.chapters) {
          if (chapter.theoryDone || chapter.practiceDone || chapter.revisionDone) {
            await supabase
              .from('user_chapter_progress')
              .upsert({
                user_id: userId,
                jungle_id: jungle.id,
                chapter_id: chapter.id,
                theory_done: chapter.theoryDone,
                practice_done: chapter.practiceDone,
                revision_done: chapter.revisionDone,
              }, {
                onConflict: 'user_id,jungle_id,chapter_id',
              });
          }
        }
      }
    } catch (err) {
      console.error('Error saving chapter progress:', err);
    }
  }, []);

  // Debounced save
  const debouncedSave = useCallback((userId: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveToDB(userId);
      saveChapterProgress(userId);
    }, 2000);
  }, [saveToDB, saveChapterProgress]);

  // Load on mount
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
