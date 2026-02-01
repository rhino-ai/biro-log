import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chapter, allJungles, JungleData, rewards } from '@/data/syllabus';

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

interface GameState {
  // User Data
  profile: UserProfile;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  lastStudyDate: string | null;
  
  // Exam Dates
  examDates: ExamDates;
  
  // Jungles
  jungles: JungleData[];
  
  // Tasks/Goals
  tasks: Task[];
  
  // Test Records
  testRecords: TestRecord[];
  
  // Raid History
  raidHistory: RaidRecord[];
  
  // Backlog & Raid (always on)
  backlogCount: number;
  raidActive: boolean;
  
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
}

const XP_PER_LEVEL = 100;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: {
        name: 'Student',
        avatar: '👨‍🎓',
        dreamCollege: 'IIT Bombay',
        dreamCollegeImage: undefined,
        dreamMarks: {
          cbse: 95,
          jeeMain: 250,
          jeeAdvanced: 180,
        },
      },
      xp: 0,
      level: 0,
      coins: 0,
      streak: 0,
      lastStudyDate: null,
      examDates: {
        cbse: '2026-03-15',
        jeeMain: '2026-01-20',
        jeeAdvanced: '2026-05-25',
      },
      jungles: JSON.parse(JSON.stringify(allJungles)),
      tasks: [],
      testRecords: [],
      raidHistory: [],
      backlogCount: 0,
      raidActive: true, // Always on

      updateChapterProgress: (jungleId, chapterId, field, value) => {
        set((state) => {
          const newJungles = state.jungles.map((jungle) => {
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
            if (field === 'theoryDone') {
              xpGain = 20;
              coinGain = 5;
            } else if (field === 'practiceDone') {
              xpGain = 30;
              coinGain = 10;
            } else if (field === 'revisionDone') {
              xpGain = 50;
              coinGain = 15;
            }
          }

          const newXP = state.xp + xpGain;
          const newLevel = Math.floor(newXP / XP_PER_LEVEL);
          const newCoins = state.coins + coinGain;

          return {
            jungles: newJungles,
            xp: newXP,
            level: newLevel,
            coins: newCoins,
          };
        });
        get().updateStreak();
      },

      addXP: (amount) => {
        set((state) => {
          const newXP = state.xp + amount;
          const newLevel = Math.floor(newXP / XP_PER_LEVEL);
          return { xp: newXP, level: newLevel };
        });
      },

      addCoins: (amount) => {
        set((state) => ({ coins: state.coins + amount }));
      },

      updateStreak: () => {
        const today = new Date().toDateString();
        const lastDate = get().lastStudyDate;
        
        if (lastDate === today) return;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        set((state) => {
          if (lastDate === yesterday.toDateString()) {
            return { streak: state.streak + 1, lastStudyDate: today };
          }
          return { streak: 1, lastStudyDate: today };
        });
      },

      addTask: (task) => {
        set((state) => ({
          tasks: [...state.tasks, { 
            ...task, 
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          }],
        }));
      },

      toggleTask: (taskId) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === taskId);
          const wasCompleted = task?.completed;
          const newTasks = state.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          );
          
          // Add XP and coins for completing task
          let xpGain = 0;
          let coinGain = 0;
          if (task && !wasCompleted) {
            if (task.type === 'daily') {
              xpGain = 15;
              coinGain = 5;
            } else if (task.type === 'weekly') {
              xpGain = 50;
              coinGain = 20;
            } else if (task.type === 'monthly') {
              xpGain = 100;
              coinGain = 50;
            } else {
              xpGain = 10;
              coinGain = 3;
            }
          }

          const newXP = state.xp + xpGain;
          const newLevel = Math.floor(newXP / XP_PER_LEVEL);

          return {
            tasks: newTasks,
            xp: newXP,
            level: newLevel,
            coins: state.coins + coinGain,
          };
        });
        get().checkDeadlinesAndUpdateBacklog();
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        }));
        get().checkDeadlinesAndUpdateBacklog();
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
        }));
      },

      updateProfile: (profile) => {
        set((state) => ({
          profile: { ...state.profile, ...profile },
        }));
      },

      updateExamDates: (dates) => {
        set((state) => ({
          examDates: { ...state.examDates, ...dates },
        }));
      },

      addTestRecord: (record) => {
        set((state) => ({
          testRecords: [...state.testRecords, { ...record, id: crypto.randomUUID() }],
        }));
      },

      deleteTestRecord: (id) => {
        set((state) => ({
          testRecords: state.testRecords.filter((r) => r.id !== id),
        }));
      },

      addRaidRecord: (record) => {
        set((state) => ({
          raidHistory: [{ ...record, id: crypto.randomUUID() }, ...state.raidHistory].slice(0, 20), // Keep last 20
        }));
      },

      calculateJungleHealth: (jungleId) => {
        const jungle = get().jungles.find((j) => j.id === jungleId);
        if (!jungle) return 0;

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
        if (!chapter.theoryDone && !chapter.practiceDone && !chapter.revisionDone) {
          return 'dry';
        }
        if (chapter.theoryDone && !chapter.practiceDone) {
          return 'growing';
        }
        if (chapter.theoryDone && chapter.practiceDone && !chapter.revisionDone) {
          return 'healthy';
        }
        return 'flourishing';
      },

      getCurrentLevel: () => get().level,

      getXPForNextLevel: () => {
        const currentXP = get().xp;
        const currentLevel = get().level;
        return (currentLevel + 1) * XP_PER_LEVEL - currentXP;
      },

      getUnlockedRewards: () => {
        const level = get().level;
        return rewards.map((reward) => ({
          ...reward,
          unlocked: level >= reward.level,
        }));
      },

      checkDeadlinesAndUpdateBacklog: () => {
        const now = new Date();
        const overdueTasks = get().tasks.filter((task) => {
          if (task.completed) return false;
          if (!task.dueDate) return false;
          const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
          return deadline < now;
        });
        
        set({ backlogCount: overdueTasks.length });
      },

      getOverdueTasks: () => {
        const now = new Date();
        return get().tasks.filter((task) => {
          if (task.completed) return false;
          if (!task.dueDate) return false;
          const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
          return deadline < now;
        });
      },
    }),
    {
      name: 'jungle-study-game',
    }
  )
);
