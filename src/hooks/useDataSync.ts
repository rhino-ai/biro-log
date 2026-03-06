import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore, getTrackData } from '@/store/gameStore';
import { supabase } from '@/integrations/supabase/client';

export const useDataSync = () => {
  const { user } = useAuth();
  const hasLoadedUserId = useRef<string | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSaveHash = useRef('');

  const withTimeout = <T,>(promiseLike: PromiseLike<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      Promise.resolve(promiseLike),
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  };

  const ensureProfileExists = useCallback(async (userId: string) => {
    const { data: existing } = await withTimeout(
      supabase.from('profiles').select('user_id').eq('user_id', userId).maybeSingle(),
      4000,
      { data: null, error: null, count: null, status: 408, statusText: 'Timeout' } as any,
    );
    if (existing) return;

    const fallbackName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
    const { error } = await withTimeout(
      supabase.from('profiles').insert([{
        user_id: userId,
        name: fallbackName,
        email: user?.email ?? null,
      }] as any),
      4000,
      { error: { message: 'profile-create-timeout' } } as any,
    );
    if (error) console.warn('[DataSync] Profile create issue:', error.message);
  }, [user]);

  const loadFromDB = useCallback(async (userId: string) => {
    try {
      await ensureProfileExists(userId);

      const profileResult = await withTimeout(
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        5000,
        { data: null, error: { message: 'Profile load timeout' } as any, count: null, status: 408, statusText: 'Timeout' },
      );

      const { data: profile, error } = profileResult;
      if (error) {
        console.warn('[DataSync] Profile load issue:', error.message);
      } else if (profile) {
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

        const td = getTrackData(store);
        const xpDiff = (profile.xp ?? 0) - td.xp;
        const coinsDiff = (profile.coins ?? 0) - td.coins;
        if (xpDiff !== 0) store.addXP(xpDiff);
        if (coinsDiff !== 0) store.addCoins(coinsDiff);
      }

      const chapterResult = await withTimeout(
        supabase.from('user_chapter_progress').select('*').eq('user_id', userId),
        5000,
        { data: null, error: { message: 'Chapter progress timeout' } as any, count: null, status: 408, statusText: 'Timeout' },
      );

      if (chapterResult.data && chapterResult.data.length > 0) {
        const store = useGameStore.getState();
        const td = getTrackData(store);
        chapterResult.data.forEach((cp) => {
          const jungle = td.jungles.find((j) => j.id === cp.jungle_id);
          const chapter = jungle?.chapters.find((c) => c.id === cp.chapter_id);
          if (!chapter) return;
          if (chapter.theoryDone !== (cp.theory_done ?? false))
            store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'theoryDone', cp.theory_done ?? false);
          if (chapter.practiceDone !== (cp.practice_done ?? false))
            store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'practiceDone', cp.practice_done ?? false);
          if (chapter.revisionDone !== (cp.revision_done ?? false))
            store.updateChapterProgress(cp.jungle_id, cp.chapter_id, 'revisionDone', cp.revision_done ?? false);
        });
      }
    } catch (err) {
      console.warn('[DataSync] loadFromDB error:', err);
    }
  }, [ensureProfileExists]);

  const saveToDB = useCallback(async (userId: string) => {
    try {
      const store = useGameStore.getState();
      const td = getTrackData(store);
      if (!td) return;
      const { profile, examDates, xp, level, coins, streak, lastStudyDate } = td;

      const hash = JSON.stringify({ profile, examDates, xp, level, coins, streak, lastStudyDate });
      if (hash === lastSaveHash.current) return;
      lastSaveHash.current = hash;

      const { error } = await withTimeout(
        supabase.from('profiles').upsert([{
          user_id: userId,
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
          email: user?.email ?? null,
        }] as any, { onConflict: 'user_id' }),
        5000,
        { error: { message: 'Save timeout' } } as any,
      );
      if (error) console.warn('[DataSync] Save issue:', error.message);
    } catch (err) {
      console.warn('[DataSync] Save error:', err);
    }
  }, [user]);

  const saveChapterProgress = useCallback(async (userId: string) => {
    try {
      const td = getTrackData(useGameStore.getState());
      if (!td) return;
      const rows = td.jungles.flatMap((jungle) =>
        jungle.chapters
          .filter((ch) => ch.theoryDone || ch.practiceDone || ch.revisionDone)
          .map((ch) => ({
            user_id: userId, jungle_id: jungle.id, chapter_id: ch.id,
            theory_done: ch.theoryDone, practice_done: ch.practiceDone, revision_done: ch.revisionDone,
          })),
      );
      if (rows.length === 0) return;
      await withTimeout(
        supabase.from('user_chapter_progress').upsert(rows, { onConflict: 'user_id,jungle_id,chapter_id' }),
        4000,
        { error: { message: 'Chapter save timeout' } } as any,
      );
    } catch (err) {
      console.warn('[DataSync] Chapter save error:', err);
    }
  }, []);

  const debouncedSave = useCallback((userId: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void saveToDB(userId);
      void saveChapterProgress(userId);
    }, 1500);
  }, [saveToDB, saveChapterProgress]);

  useEffect(() => {
    if (!user) { hasLoadedUserId.current = null; lastSaveHash.current = ''; return; }
    if (hasLoadedUserId.current !== user.id) {
      hasLoadedUserId.current = user.id;
      void loadFromDB(user.id);
    }
  }, [user, loadFromDB]);

  useEffect(() => {
    if (!user) return;
    const unsub = useGameStore.subscribe(() => debouncedSave(user.id));
    return () => { unsub(); if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [user, debouncedSave]);
};
