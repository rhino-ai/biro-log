import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import { Trophy, Star, Flame, AlertTriangle, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  backlogs: number;
  isCurrentUser?: boolean;
}

const mockLeaderboard: LeaderboardUser[] = [
  { id: '1', rank: 1, name: 'Priya Singh', avatar: '👧', xp: 8500, level: 42, streak: 67, backlogs: 0 },
  { id: '2', rank: 2, name: 'Rohit Kumar', avatar: '👦', xp: 7200, level: 38, streak: 45, backlogs: 0 },
  { id: '3', rank: 3, name: 'Ananya Sharma', avatar: '👩', xp: 6800, level: 35, streak: 38, backlogs: 1 },
  { id: '4', rank: 4, name: 'Vikram Patel', avatar: '🧑', xp: 5500, level: 28, streak: 25, backlogs: 2 },
  { id: '5', rank: 5, name: 'Neha Gupta', avatar: '👩', xp: 4800, level: 24, streak: 18, backlogs: 3 },
  { id: 'me', rank: 6, name: 'You', avatar: '👨‍🎓', xp: 1200, level: 6, streak: 5, backlogs: 4, isCurrentUser: true },
  { id: '7', rank: 7, name: 'Suresh Yadav', avatar: '🧔', xp: 900, level: 5, streak: 2, backlogs: 8 },
  { id: '8', rank: 8, name: 'Lazy Larry', avatar: '🤡', xp: 200, level: 1, streak: 0, backlogs: 15 },
];

const beijjatiMessages = [
  "🤡 Padhai kar le bhai, joker mat ban!",
  "😴 So gaya kya? Backlog badhte ja raha!",
  "📚 Kitaabein ro rahi hain tere bina!",
  "🦥 Aalsi kahin ka... uth aur padh!",
  "🎪 Circus mein job dhundh le ab toh",
];

const LeaderboardPage = () => {
  const [filter, setFilter] = useState<'xp' | 'streak' | 'backlogs'>('xp');
  const { profile, xp, level, streak, backlogCount } = useGameStore();

  // Update current user's stats
  const leaderboardWithUser = mockLeaderboard.map(user => 
    user.isCurrentUser 
      ? { ...user, name: profile.name || 'You', xp, level, streak, backlogs: backlogCount }
      : user
  );

  // Sort based on filter
  const sortedLeaderboard = [...leaderboardWithUser].sort((a, b) => {
    if (filter === 'xp') return b.xp - a.xp;
    if (filter === 'streak') return b.streak - a.streak;
    if (filter === 'backlogs') return b.backlogs - a.backlogs;
    return 0;
  }).map((user, idx) => ({ ...user, rank: idx + 1 }));

  const getBeijjatiMessage = (backlogs: number) => {
    if (backlogs >= 10) return beijjatiMessages[4];
    if (backlogs >= 5) return beijjatiMessages[Math.floor(Math.random() * 3)];
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl text-glow-purple flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Leaderboard
          </h1>
          <div className="w-10" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'xp' ? 'default' : 'outline'}
            onClick={() => setFilter('xp')}
            className="flex-1 gap-1"
            size="sm"
          >
            <Star className="w-4 h-4" />
            XP
          </Button>
          <Button
            variant={filter === 'streak' ? 'default' : 'outline'}
            onClick={() => setFilter('streak')}
            className="flex-1 gap-1"
            size="sm"
          >
            <Flame className="w-4 h-4" />
            Streak
          </Button>
          <Button
            variant={filter === 'backlogs' ? 'default' : 'outline'}
            onClick={() => setFilter('backlogs')}
            className="flex-1 gap-1 text-raid"
            size="sm"
          >
            <AlertTriangle className="w-4 h-4" />
            Backlogs
          </Button>
        </div>

        {/* Top 3 Podium */}
        <div className="glass-panel rounded-2xl p-4 border border-accent/30">
          <h2 className="font-game text-sm text-center mb-4">🏆 Top Performers</h2>
          <div className="flex items-end justify-center gap-2">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-2xl mx-auto mb-1 ring-2 ring-gray-300">
                {sortedLeaderboard[1]?.avatar}
              </div>
              <p className="text-xs font-medium truncate max-w-[60px]">{sortedLeaderboard[1]?.name}</p>
              <div className="bg-gray-500/20 rounded-t-lg h-16 w-14 flex items-center justify-center mt-1">
                <span className="text-lg font-game text-gray-300">2</span>
              </div>
            </div>
            
            {/* 1st Place */}
            <div className="text-center -mb-2">
              <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl mx-auto mb-1 ring-4 ring-yellow-300 shadow-lg shadow-yellow-500/30 w-[72px] h-[72px]">
                {sortedLeaderboard[0]?.avatar}
              </div>
              <p className="text-sm font-medium truncate max-w-[80px]">{sortedLeaderboard[0]?.name}</p>
              <div className="bg-yellow-500/20 rounded-t-lg h-24 w-16 flex items-center justify-center mt-1">
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            {/* 3rd Place */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-2xl mx-auto mb-1 ring-2 ring-amber-500">
                {sortedLeaderboard[2]?.avatar}
              </div>
              <p className="text-xs font-medium truncate max-w-[60px]">{sortedLeaderboard[2]?.name}</p>
              <div className="bg-amber-600/20 rounded-t-lg h-12 w-14 flex items-center justify-center mt-1">
                <span className="text-lg font-game text-amber-500">3</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="space-y-2">
          {sortedLeaderboard.slice(3).map((user) => {
            const beijjati = filter === 'backlogs' && user.backlogs >= 5 ? getBeijjatiMessage(user.backlogs) : null;
            
            return (
              <div
                key={user.id}
                className={cn(
                  'glass-panel rounded-xl p-3 border flex items-center gap-3',
                  user.isCurrentUser && 'border-accent/50 bg-accent/10',
                  beijjati && 'border-raid/50 bg-raid/10',
                  !user.isCurrentUser && !beijjati && 'border-white/10'
                )}
              >
                <div className="w-8 flex justify-center">
                  {getRankBadge(user.rank)}
                </div>
                
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-xl',
                  beijjati ? 'bg-raid/30 grayscale' : 'bg-gradient-to-br from-primary to-accent'
                )}>
                  {beijjati ? '🤡' : user.avatar}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-sm truncate',
                    user.isCurrentUser && 'text-accent'
                  )}>
                    {user.name} {user.isCurrentUser && '(You)'}
                  </p>
                  {beijjati ? (
                    <p className="text-xs text-raid animate-pulse">{beijjati}</p>
                  ) : (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>⚡{user.xp}</span>
                      <span>🔥{user.streak}</span>
                      {user.backlogs > 0 && <span className="text-raid">⚠️{user.backlogs}</span>}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <span className="font-game text-sm text-accent">Lv.{user.level}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Awards Info */}
        <div className="glass-panel rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
          <h3 className="font-game text-sm mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Top 5 Rewards
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>🥇 1st Place: Special Avatar Frame + 500 Coins</li>
            <li>🥈 2nd Place: Special Avatar Frame + 300 Coins</li>
            <li>🥉 3rd Place: Special Avatar Frame + 200 Coins</li>
            <li>📍 4th-5th: 100 Bonus Coins</li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default LeaderboardPage;