import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chapter, allJungles, JungleData, rewards, StudyTrack, getJunglesByTrack, createChapter, SubjectType, OtherCategory } from '@/data/syllabus';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  jungleId: string;
  chapterId?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  createdAt: string;
  alarm?: {
    enabled: boolean;
    time: string;
    ringtone: string;
  };
}

interface TestRecord {
  id: string;
  examType: 'cbse' | 'jee-main' | 'jee-advanced';
  testName: string;
  date: string;
  maxMarks: number;
  scoredMarks: number;
  subjects: {
    physics: number;
    chemistry: number;
    mathematics: number;
  };
}

interface ExamDates {
  cbse: string;
  jeeMain: string;
  jeeAdvanced: string;
}

interface RaidRecord {
  id: string;
  date: string;
  bossName: string;
  result: 'victory' | 'defeat';
  tasksCleared: number;
  xpGained?: number;
  coinsGained?: number;
}

interface UserProfile {
  name: string;
  avatar: string;
  dreamCollege: string;
  dreamCollegeImage?: string;
  dreamMarks: {
    cbse: number;
    jeeMain: number;
    jeeAdvanced: number;
  };
}

// Per-track data structure
interface TrackData {
  xp: number;
  level: number;
  coins: number;
  streak: number;
  lastStudyDate: string | null;
  jungles: JungleData[];
  tasks: Task[];
  testRecords: TestRecord[];
  raidHistory: RaidRecord[];
  backlogCount: number;
  profile: UserProfile;
  examDates: ExamDates;
}

interface GameState {
  // Current track
  studyTrack: StudyTrack;
  hasSelectedTrack: boolean;
  
  // Track-specific data storage
  trackData: {
    jee: TrackData;
    neet: TrackData;
    highschool: TrackData;
    teacher: TrackData;
    other: TrackData;
  };
  
  // New track-specific settings
  teacherSubjects: string[];
  otherCategory: OtherCategory | null;
  
  // Actions
  updateChapterProgress: (jungleId: string, chapterId: string, field: 'theoryDone' | 'practiceDone' | 'revisionDone', value: boolean) => void;
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  updateStreak: () => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateExamDates: (dates: Partial<ExamDates>) => void;
  addTestRecord: (record: Omit<TestRecord, 'id'>) => void;
  deleteTestRecord: (id: string) => void;
  addRaidRecord: (record: Omit<RaidRecord, 'id'>) => void;
  calculateJungleHealth: (jungleId: string) => number;
  getTreeState: (chapter: Chapter) => 'dry' | 'growing' | 'healthy' | 'flourishing';
  getCurrentLevel: () => number;
  getXPForNextLevel: () => number;
  getUnlockedRewards: () => typeof rewards;
  checkDeadlinesAndUpdateBacklog: () => void;
  getOverdueTasks: () => Task[];
  
  // Track and chapter management
  setStudyTrack: (track: StudyTrack) => void;
  setJungles: (jungles: JungleData[]) => void;
  setHasSelectedTrack: (value: boolean) => void;
  setTeacherSubjects: (subjects: string[]) => void;
  setOtherCategory: (category: OtherCategory) => void;
  addChapter: (jungleId: string, chapter: Chapter) => void;
  updateChapterName: (jungleId: string, chapterId: string, newName: string) => void;
  deleteChapter: (jungleId: string, chapterId: string) => void;
}

const XP_PER_LEVEL = 100;

// Create default track data
const createDefaultTrackData = (track: StudyTrack): TrackData => ({
  xp: 0,
  level: 0,
  coins: 0,
  streak: 0,
  lastStudyDate: null,
  jungles: JSON.parse(JSON.stringify(getJunglesByTrack(track))),
  tasks: [],
  testRecords: [],
  raidHistory: [],
  backlogCount: 0,
  profile: {
    name: 'Student',
    avatar: '👨‍🎓',
    dreamCollege: track === 'jee' ? 'IIT Bombay' : track === 'neet' ? 'AIIMS Delhi' : 'Top School',
    dreamCollegeImage: undefined,
    dreamMarks: {
      cbse: 95,
      jeeMain: 250,
      jeeAdvanced: 180,
    },
  },
  examDates: {
    cbse: '2026-03-15',
    jeeMain: '2026-01-20',
    jeeAdvanced: '2026-05-25',
  },
});

// Helper to get current track data from state (used outside store)
export const getTrackData = (state: GameState): TrackData => {
  return state.trackData[state.studyTrack];
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      // Helper to get current track data
      const getCurrentTrackData = (): TrackData => {
        const state = get();
        return state.trackData[state.studyTrack];
      };

      // Helper to update current track data
      const updateCurrentTrackData = (updates: Partial<TrackData>) => {
        set((state) => ({
          trackData: {
            ...state.trackData,
            [state.studyTrack]: {
              ...state.trackData[state.studyTrack],
              ...updates,
            },
          },
        }));
      };

      return {
        studyTrack: 'jee' as StudyTrack,
        hasSelectedTrack: false,
        
        trackData: {
          jee: createDefaultTrackData('jee'),
          neet: createDefaultTrackData('neet'),
          highschool: createDefaultTrackData('highschool'),
          teacher: createDefaultTrackData('teacher'),
          other: createDefaultTrackData('other'),
        },

        teacherSubjects: [],
        otherCategory: null,

        updateChapterProgress: (jungleId, chapterId, field, value) => {
          const currentData = getCurrentTrackData();
          const newJungles = currentData.jungles.map((jungle) => {
            if (jungle.id !== jungleId) return jungle;
            return {
              ...jungle,
              chapters: jungle.chapters.map((chapter) => {
                if (chapter.id !== chapterId) return chapter;
                return { ...chapter, [field]: value };
              }),
            };
          });

          let xpGain = 0;
          let coinGain = 0;
          if (value) {
            if (field === 'theoryDone') { xpGain = 20; coinGain = 5; }
            else if (field === 'practiceDone') { xpGain = 30; coinGain = 10; }
            else if (field === 'revisionDone') { xpGain = 50; coinGain = 15; }
          }

          const newXP = currentData.xp + xpGain;
          const newLevel = Math.floor(newXP / XP_PER_LEVEL);
          const newCoins = currentData.coins + coinGain;

          updateCurrentTrackData({
            jungles: newJungles,
            xp: newXP,
            level: newLevel,
            coins: newCoins,
          });
          
          get().updateStreak();
        },

        addXP: (amount) => {
          const currentData = getCurrentTrackData();
          const newXP = Math.max(0, currentData.xp + amount);
          const newLevel = Math.floor(newXP / XP_PER_LEVEL);
          updateCurrentTrackData({ xp: newXP, level: newLevel });
        },

        addCoins: (amount) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({ coins: Math.max(0, currentData.coins + amount) });
        },

        updateStreak: () => {
          const today = new Date().toDateString();
          const currentData = getCurrentTrackData();
          const lastDate = currentData.lastStudyDate;
          
          if (lastDate === today) return;
          
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastDate === yesterday.toDateString()) {
            updateCurrentTrackData({ streak: currentData.streak + 1, lastStudyDate: today });
          } else {
            updateCurrentTrackData({ streak: 1, lastStudyDate: today });
          }
        },

        addTask: (task) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({
            tasks: [...currentData.tasks, { ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
          });
        },

        toggleTask: (taskId) => {
          const currentData = getCurrentTrackData();
          const task = currentData.tasks.find(t => t.id === taskId);
          const wasCompleted = task?.completed;
          const newTasks = currentData.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          );
          
          let xpGain = 0;
          let coinGain = 0;
          if (task && !wasCompleted) {
            if (task.type === 'daily') { xpGain = 15; coinGain = 5; }
            else if (task.type === 'weekly') { xpGain = 50; coinGain = 20; }
            else if (task.type === 'monthly') { xpGain = 100; coinGain = 50; }
            else { xpGain = 10; coinGain = 3; }
          }

          const newXP = currentData.xp + xpGain;
          const newLevel = Math.floor(newXP / XP_PER_LEVEL);

          updateCurrentTrackData({
            tasks: newTasks,
            xp: newXP,
            level: newLevel,
            coins: currentData.coins + coinGain,
          });
          
          get().checkDeadlinesAndUpdateBacklog();
        },

        deleteTask: (taskId) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({ tasks: currentData.tasks.filter((task) => task.id !== taskId) });
          get().checkDeadlinesAndUpdateBacklog();
        },

        updateTask: (taskId, updates) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({
            tasks: currentData.tasks.map((task) => task.id === taskId ? { ...task, ...updates } : task),
          });
        },

        updateProfile: (profile) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({ profile: { ...currentData.profile, ...profile } });
        },

        updateExamDates: (dates) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({ examDates: { ...currentData.examDates, ...dates } });
        },

        addTestRecord: (record) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({ testRecords: [...currentData.testRecords, { ...record, id: crypto.randomUUID() }] });
        },

        deleteTestRecord: (id) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({ testRecords: currentData.testRecords.filter((r) => r.id !== id) });
        },

        addRaidRecord: (record) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({
            raidHistory: [{ ...record, id: crypto.randomUUID() }, ...currentData.raidHistory].slice(0, 20),
          });
        },

        calculateJungleHealth: (jungleId) => {
          const currentData = getCurrentTrackData();
          const jungle = currentData.jungles.find((j) => j.id === jungleId);
          if (!jungle || jungle.chapters.length === 0) return 0;
          const totalProgress = jungle.chapters.reduce((acc, chapter) => {
            let progress = 0;
            if (chapter.theoryDone) progress += 33;
            if (chapter.practiceDone) progress += 33;
            if (chapter.revisionDone) progress += 34;
            return acc + progress;
          }, 0);
          return Math.round(totalProgress / jungle.chapters.length);
        },

        getTreeState: (chapter) => {
          if (!chapter.theoryDone && !chapter.practiceDone && !chapter.revisionDone) return 'dry';
          if (chapter.theoryDone && !chapter.practiceDone) return 'growing';
          if (chapter.theoryDone && chapter.practiceDone && !chapter.revisionDone) return 'healthy';
          return 'flourishing';
        },

        getCurrentLevel: () => getCurrentTrackData().level,

        getXPForNextLevel: () => {
          const currentData = getCurrentTrackData();
          return (currentData.level + 1) * XP_PER_LEVEL - currentData.xp;
        },

        getUnlockedRewards: () => {
          const level = getCurrentTrackData().level;
          return rewards.map((reward) => ({ ...reward, unlocked: level >= reward.level }));
        },

        checkDeadlinesAndUpdateBacklog: () => {
          const now = new Date();
          const currentData = getCurrentTrackData();
          const overdueTasks = currentData.tasks.filter((task) => {
            if (task.completed) return false;
            if (!task.dueDate) return false;
            const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
            return deadline < now;
          });
          updateCurrentTrackData({ backlogCount: overdueTasks.length });
        },

        getOverdueTasks: () => {
          const now = new Date();
          const currentData = getCurrentTrackData();
          return currentData.tasks.filter((task) => {
            if (task.completed) return false;
            if (!task.dueDate) return false;
            const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
            return deadline < now;
          });
        },

        setStudyTrack: (track: StudyTrack) => {
          set({ studyTrack: track, hasSelectedTrack: true });
        },

        setJungles: (jungles: JungleData[]) => {
          updateCurrentTrackData({ jungles });
        },

        setHasSelectedTrack: (value: boolean) => {
          set({ hasSelectedTrack: value });
        },

        setTeacherSubjects: (subjects: string[]) => {
          set({ teacherSubjects: subjects });
        },

        setOtherCategory: (category: OtherCategory) => {
          set({ otherCategory: category });
        },

        addChapter: (jungleId: string, chapter: Chapter) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({
            jungles: currentData.jungles.map((jungle) =>
              jungle.id === jungleId ? { ...jungle, chapters: [...jungle.chapters, chapter] } : jungle
            ),
          });
        },

        updateChapterName: (jungleId: string, chapterId: string, newName: string) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({
            jungles: currentData.jungles.map((jungle) =>
              jungle.id === jungleId
                ? { ...jungle, chapters: jungle.chapters.map((ch) => ch.id === chapterId ? { ...ch, name: newName } : ch) }
                : jungle
            ),
          });
        },

        deleteChapter: (jungleId: string, chapterId: string) => {
          const currentData = getCurrentTrackData();
          updateCurrentTrackData({
            jungles: currentData.jungles.map((jungle) =>
              jungle.id === jungleId ? { ...jungle, chapters: jungle.chapters.filter((ch) => ch.id !== chapterId) } : jungle
            ),
          });
        },
      };
    },
    {
      name: 'jungle-study-game',
      partialize: (state) => ({
        studyTrack: state.studyTrack,
        hasSelectedTrack: state.hasSelectedTrack,
        trackData: state.trackData,
        teacherSubjects: state.teacherSubjects,
        otherCategory: state.otherCategory,
      }),
    }
  )
);

// Selector hooks for current track data - USE THESE in components
export const useTrackData = () => useGameStore((s) => s.trackData[s.studyTrack]);
export const useXP = () => useGameStore((s) => s.trackData[s.studyTrack].xp);
export const useLevel = () => useGameStore((s) => s.trackData[s.studyTrack].level);
export const useCoins = () => useGameStore((s) => s.trackData[s.studyTrack].coins);
export const useStreak = () => useGameStore((s) => s.trackData[s.studyTrack].streak);
export const useProfile = () => useGameStore((s) => s.trackData[s.studyTrack].profile);
export const useExamDates = () => useGameStore((s) => s.trackData[s.studyTrack].examDates);
export const useJungles = () => useGameStore((s) => s.trackData[s.studyTrack].jungles);
export const useTasks = () => useGameStore((s) => s.trackData[s.studyTrack].tasks);
export const useTestRecords = () => useGameStore((s) => s.trackData[s.studyTrack].testRecords);
export const useRaidHistory = () => useGameStore((s) => s.trackData[s.studyTrack].raidHistory);
export const useBacklogCount = () => useGameStore((s) => s.trackData[s.studyTrack].backlogCount);
export const useLastStudyDate = () => useGameStore((s) => s.trackData[s.studyTrack].lastStudyDate);
