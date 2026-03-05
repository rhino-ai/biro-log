import { useGameStore, getTrackData } from '@/store/gameStore';

/**
 * Compatibility hook that provides all track-specific data as top-level properties.
 * This reads from trackData[studyTrack] correctly, unlike JS getters which break with zustand persist.
 */
export const useGame = () => {
  const store = useGameStore();
  const td = store.trackData[store.studyTrack];
  
  return {
    // Track data (computed from current track)
    profile: td.profile,
    xp: td.xp,
    level: td.level,
    coins: td.coins,
    streak: td.streak,
    lastStudyDate: td.lastStudyDate,
    examDates: td.examDates,
    jungles: td.jungles,
    tasks: td.tasks,
    testRecords: td.testRecords,
    raidHistory: td.raidHistory,
    backlogCount: td.backlogCount,
    raidActive: td.backlogCount > 0,

    // Top-level state
    studyTrack: store.studyTrack,
    hasSelectedTrack: store.hasSelectedTrack,
    trackData: store.trackData,
    teacherSubjects: store.teacherSubjects,
    otherCategory: store.otherCategory,

    // Actions
    updateChapterProgress: store.updateChapterProgress,
    addXP: store.addXP,
    addCoins: store.addCoins,
    updateStreak: store.updateStreak,
    addTask: store.addTask,
    toggleTask: store.toggleTask,
    deleteTask: store.deleteTask,
    updateTask: store.updateTask,
    updateProfile: store.updateProfile,
    updateExamDates: store.updateExamDates,
    addTestRecord: store.addTestRecord,
    deleteTestRecord: store.deleteTestRecord,
    addRaidRecord: store.addRaidRecord,
    calculateJungleHealth: store.calculateJungleHealth,
    getTreeState: store.getTreeState,
    getCurrentLevel: store.getCurrentLevel,
    getXPForNextLevel: store.getXPForNextLevel,
    getUnlockedRewards: store.getUnlockedRewards,
    checkDeadlinesAndUpdateBacklog: store.checkDeadlinesAndUpdateBacklog,
    getOverdueTasks: store.getOverdueTasks,
    setStudyTrack: store.setStudyTrack,
    setJungles: store.setJungles,
    setHasSelectedTrack: store.setHasSelectedTrack,
    setTeacherSubjects: store.setTeacherSubjects,
    setOtherCategory: store.setOtherCategory,
    addChapter: store.addChapter,
    updateChapterName: store.updateChapterName,
    deleteChapter: store.deleteChapter,
  };
};

/**
 * Get track data from raw state (for use in useDataSync and non-hook contexts).
 */
export const getTrackDataFromState = getTrackData;
