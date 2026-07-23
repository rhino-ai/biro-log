import { BackButton } from '@/components/layout/BackButton';
import { GuideSection } from '@/components/game/GuideSection';
import { FocusTimer } from '@/components/game/FocusTimer';
import { Link } from 'react-router-dom';

const SECTIONS: { path: string; icon: string; label: string; hint: string }[] = [
  { path: '/', icon: '🏠', label: 'Home', hint: 'Dashboard, XP, streak' },
  { path: '/jungles', icon: '🌴', label: 'Jungles', hint: 'Subjects & chapter trees' },
  { path: '/tasks', icon: '✅', label: 'Tasks', hint: 'Priorities, calendar, reminders' },
  { path: '/revision', icon: '🔁', label: 'Revision', hint: 'Ebbinghaus spaced repetition' },
  { path: '/mind-games', icon: '🧠', label: 'Brain Gym', hint: 'Chess, memory, focus games' },
  { path: '/wellness', icon: '🧘', label: 'Wellness', hint: 'Mood, breathe, SOS' },
  { path: '/journal', icon: '📓', label: 'Journal', hint: 'Daily memory log' },
  { path: '/screen-time', icon: '📱', label: 'Screen Time', hint: 'Digital discipline' },
  { path: '/analytics', icon: '📊', label: 'Analytics', hint: 'DNA, radar, reports' },
  { path: '/trackers', icon: '📈', label: 'Trackers', hint: 'Google-Sheets style' },
  { path: '/friends', icon: '💬', label: 'Social', hint: 'Chats, groups, E2EE' },
  { path: '/virtual-library', icon: '📹', label: 'Library', hint: 'Zoom-style study rooms' },
  { path: '/leaderboard', icon: '🏆', label: 'Leaderboard', hint: 'Peer ranking' },
  { path: '/mentor', icon: '🧙', label: 'Dronacharya', hint: 'AI mentor + memory' },
  { path: '/biro-yaar', icon: '🤝', label: 'Biro Yaar', hint: 'Friendly AI buddy' },
  { path: '/raid', icon: '⚔️', label: 'Raid', hint: 'Beat backlog boss' },
  { path: '/villain', icon: '💀', label: 'Villain Mode', hint: 'Lockout + intensity' },
  { path: '/mentor-timeline', icon: '🗓️', label: 'Timeline', hint: 'Daily summaries' },
  { path: '/hot-question', icon: '🔥', label: 'Hot Question', hint: 'Daily prompts' },
  { path: '/feedback', icon: '⭐', label: 'Feedback', hint: 'Rate & report' },
  { path: '/profile', icon: '👤', label: 'Profile', hint: 'Settings & API keys' },
];

const GuidePage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Back + Page Title */}
        <div className="flex items-center justify-between animate-fade-in">
          <BackButton to="/" />
          <div className="text-center flex-1">
            <h1 className="font-game text-xl text-glow-purple flex items-center justify-center gap-2">
              📖 User Guide
            </h1>
          </div>
          <div className="w-16" />
        </div>

        {/* Focus Timer */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <FocusTimer />
        </div>

        {/* All Sections Map */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h2 className="font-game text-lg mb-3">🧭 All Sections</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Bottom nav shows Home · Jungles · Tasks · Games · Social. Everything else lives here and on the Home dashboard tiles.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                className="glass-panel rounded-xl px-3 py-2 border border-white/10 hover:border-primary/50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{s.hint}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Guide Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <GuideSection />
        </div>
      </main>

    </div>
  );
};

export default GuidePage;
