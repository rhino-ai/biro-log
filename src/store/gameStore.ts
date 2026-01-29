import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chapter, allJungles, JungleData, rewards } from '@/data/syllabus';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  jungleId: string;
  chapterId?: string;
  type: 'daily' | 'weekly' | 'custom';
}

interface UserProfile {
  name: string;
  avatar: string;
  dreamCollege: string;
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
  
  // Jungles
  jungles: JungleData[];
  
  // Tasks
  tasks: Task[];
  
  // Backlog & Raid
  backlogCount: number;
  raidActive: boolean;
  
  // Actions
  updateChapterProgress: (jungleId: string, chapterId: string, field: 'theoryDone' | 'practiceDone' | 'revisionDone', value: boolean) => void;
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  updateStreak: () => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  calculateJungleHealth: (jungleId: string) => number;
  getTreeState: (chapter: Chapter) => 'dry' | 'growing' | 'healthy' | 'flourishing';
  getCurrentLevel: () => number;
  getXPForNextLevel: () => number;
  getUnlockedRewards: () => typeof rewards;
}

const XP_PER_LEVEL = 100;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: {
        name: 'Student',
        avatar: '👨‍🎓',
        dreamCollege: 'IIT Bombay',
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
      jungles: JSON.parse(JSON.stringify(allJungles)),
      tasks: [],
      backlogCount: 0,
      raidActive: false,

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

          // Add XP and coins when completing something
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
          tasks: [...state.tasks, { ...task, id: crypto.randomUUID() }],
        }));
      },

      toggleTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          ),
        }));
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        }));
      },

      updateProfile: (profile) => {
        set((state) => ({
          profile: { ...state.profile, ...profile },
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
    }),
    {
      name: 'jungle-study-game',
    }
  )
);
