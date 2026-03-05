import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Flame, AlertTriangle, Crown, Medal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  isCurrentUser?: boolean;
}

const LeaderboardPage = () => {
  const [filter, setFilter] = useState<'xp' | 'streak' | 'level'>('xp');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useGame();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session?.session?.user?.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar, xp, level, streak')
        .order('xp', { ascending: false })
        .limit(50);

      if (!error && data) {
        const mapped = data.map((u, idx) => ({
          id: u.user_id,
          rank: idx + 1,
          name: u.name || 'Student',
          avatar: u.avatar || '👨‍🎓',
          xp: u.xp || 0,
          level: u.level || 0,
          streak: u.streak || 0,
          isCurrentUser: u.user_id === currentUserId,
        }));
        setUsers(mapped);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const sortedLeaderboard = [...users].sort((a, b) => {
    if (filter === 'xp') return b.xp - a.xp;
    if (filter === 'streak') return b.streak - a.streak;
    if (filter === 'level') return b.level - a.level;
    return 0;
  }).map((user, idx) => ({ ...user, rank: idx + 1 }));

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

        <div className="flex gap-2">
          <Button variant={filter === 'xp' ? 'default' : 'outline'} onClick={() => setFilter('xp')} className="flex-1 gap-1" size="sm">
            <Star className="w-4 h-4" /> XP
          </Button>
          <Button variant={filter === 'streak' ? 'default' : 'outline'} onClick={() => setFilter('streak')} className="flex-1 gap-1" size="sm">
            <Flame className="w-4 h-4" /> Streak
          </Button>
          <Button variant={filter === 'level' ? 'default' : 'outline'} onClick={() => setFilter('level')} className="flex-1 gap-1" size="sm">
            <Crown className="w-4 h-4" /> Level
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedLeaderboard.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Koi user abhi tak nahi hai. Pehle ban!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {sortedLeaderboard.length >= 3 && (
              <div className="glass-panel rounded-2xl p-4 border border-accent/30">
                <h2 className="font-game text-sm text-center mb-4">🏆 Top Performers</h2>
                <div className="flex items-end justify-center gap-2">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-2xl mx-auto mb-1 ring-2 ring-gray-300">
                      {sortedLeaderboard[1]?.avatar}
                    </div>
                    <p className="text-xs font-medium truncate max-w-[60px]">{sortedLeaderboard[1]?.name}</p>
                    <div className="bg-gray-500/20 rounded-t-lg h-16 w-14 flex items-center justify-center mt-1">
                      <span className="text-lg font-game text-gray-300">2</span>
                    </div>
                  </div>
                  <div className="text-center -mb-2">
                    <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl mx-auto mb-1 ring-4 ring-yellow-300 shadow-lg shadow-yellow-500/30">
                      {sortedLeaderboard[0]?.avatar}
                    </div>
                    <p className="text-sm font-medium truncate max-w-[80px]">{sortedLeaderboard[0]?.name}</p>
                    <div className="bg-yellow-500/20 rounded-t-lg h-24 w-16 flex items-center justify-center mt-1">
                      <Crown className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
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
            )}

            {/* Full Leaderboard */}
            <div className="space-y-2">
              {sortedLeaderboard.slice(sortedLeaderboard.length >= 3 ? 3 : 0).map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    'glass-panel rounded-xl p-3 border flex items-center gap-3',
                    user.isCurrentUser && 'border-accent/50 bg-accent/10',
                    !user.isCurrentUser && 'border-white/10'
                  )}
                >
                  <div className="w-8 flex justify-center">{getRankBadge(user.rank)}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl">
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm truncate', user.isCurrentUser && 'text-accent')}>
                      {user.name} {user.isCurrentUser && '(You)'}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>⚡{user.xp}</span>
                      <span>🔥{user.streak}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-game text-sm text-accent">Lv.{user.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default LeaderboardPage;
