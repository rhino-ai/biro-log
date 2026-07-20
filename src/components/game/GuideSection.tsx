import { cn } from '@/lib/utils';
import { Book, Zap, TreeDeciduous, Target, Swords, Award, Bell, Timer, Users, Coins, Star, Lock, Video, MessageCircle, Brain, Heart, Calendar, ShieldAlert, BookOpen, Sparkles } from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

interface GuideSectionProps {
  className?: string;
}

const guideItems = [
  {
    id: 'e2ee-chat',
    icon: Lock,
    title: '🔐 End-to-End Encrypted Chat',
    color: 'text-emerald-400',
    content: `Your DMs are now truly private! 🔒

**How it works:**
- On first sign-in your device makes a keypair
- Private key stays in your browser (IndexedDB)
- Only your public key is uploaded
- Messages + files are encrypted BEFORE upload
- Server sees only ciphertext, admins can't read it

**Attachments:**
- Images, videos, PDFs, audio — all encrypted client-side
- WhatsApp/TG-style preview panel before sending
- Tap any file to view full-screen
- Signed URLs expire in 60 seconds

**Backup:** Export your key from Profile → losing device = losing history!`,
  },
  {
    id: 'video-calls',
    icon: Video,
    title: '📹 Virtual Library & Video Calls',
    color: 'text-cyan-400',
    content: `Real study rooms with live video! 🎥

**Features:**
- WebRTC mesh video calling (peer-to-peer)
- Camera + mic toggle
- Screen sharing for whiteboards/notes
- Persistent rooms with Meeting IDs
- Join by 6-digit room code
- Presence indicators (who's online)

**Tip:** Create a room, share the code with study buddies — study together like Zoom!`,
  },
  {
    id: 'groups',
    icon: MessageCircle,
    title: '💬 Groups (Telegram-style)',
    color: 'text-blue-400',
    content: `Full group chat like TG! 👥

**Group features:**
- Group name, description, DP/avatar
- Invite via link, QR, or 8-char code
- Search users by Biro-ID, email, or name
- Admin controls: promote, kick, ban
- Realtime messages + media
- Group info panel with member list

**Safety:** Bans are permanent; creators can't be demoted.`,
  },
  {
    id: 'mentor',
    icon: Sparkles,
    title: '🧙 Dronacharya AI Mentor',
    color: 'text-amber-400',
    content: `Elite ultra-strict mentor with memory! 🕉️

**Powers:**
- Remembers every past chat (persistent memory)
- Reads images, PDFs, videos, audio (OCR + transcription)
- Knows IST time, day, exam countdown, holidays
- 5-Layer decision tree for personalized plans
- Nightly 10 PM check-in with summary
- Mentor Timeline view for daily journal

**Extras:**
- One-tap reply quoting
- Edit & regenerate replies
- Weakness dashboard from analytics`,
  },
  {
    id: 'revision',
    icon: Calendar,
    title: '📅 Revision Scheduler',
    color: 'text-pink-400',
    content: `Ebbinghaus spaced repetition! 🧠

- Auto-schedules Day 1, 3, 7, 14, 30 reviews
- Red / Yellow / Green urgency badges
- Priority by chapter difficulty + exam date
- Marks chapters Pending → Mastered
- Never forget what you learn again!`,
  },
  {
    id: 'villain',
    icon: ShieldAlert,
    title: '😈 Villain Mode',
    color: 'text-red-500',
    content: `Beast-mode lockdown! 🔥

- Dark red UI + savage motivational quotes
- Blocks social media routes on device
- Auto-triggers if daily screen time exceeds limit (Strict Read Mode)
- Only study routes work until you close the loop`,
  },
  {
    id: 'wellness',
    icon: Heart,
    title: '🧘 Wellness & Journal',
    color: 'text-rose-400',
    content: `Mental health tools! 💗

- Emoji mood tracker
- SOS Panic Button + grounding techniques
- Private daily journal (only you)
- Mentor uses mood + journal to personalize plans
- Life Calendar: 90×52 grid of your life in weeks`,
  },
  {
    id: 'braingym',
    icon: Brain,
    title: '🧩 Brain Gym & Chess',
    color: 'text-purple-400',
    content: `Cognitive workouts! 🎮

**Games included:**
- ♟️ Chess (AI opponents, undo, difficulty)
- Pattern Memory, Sequence Recall
- Math Speed, Reaction Speed
- Stroop Test, Focus Dot

Earn Brain Score + streaks!`,
  },
  {
    id: 'trackers',
    icon: BookOpen,
    title: '📊 Trackers (Sheets clone)',
    color: 'text-green-400',
    content: `Google Sheets, right inside Biro! 📈

- Multi-letter columns (A, B, ..., AA, AB)
- Formulas: =SUM, =AVG, =MIN, =MAX, =COUNT
- Zoom in/out
- Auto-analysis via AI
- Perfect for mock scores, DPP tracking, revision logs`,
  },
  {
    id: 'push',
    icon: Bell,
    title: '🔔 Push Notifications',
    color: 'text-orange-400',
    content: `Never miss a study slot! 📲

**Auto-scheduled (IST):**
- 7 AM — Morning Kickoff
- 1 PM — Midday Nudge
- 10 PM — Nightly Check-in

Works on web + PWA (install from browser menu). Enable from Profile → Push Toggle.`,
  },
  {
    id: 'feedback',
    icon: Star,
    title: '⭐ Feedback & Support',
    color: 'text-yellow-300',
    content: `Talk to the Biro team! 💌

- 5-star rate every feature
- Post comments/corrections in Feedback page
- Telegram support: @biro1_a
- Announcements channel: t.me/biroskills
- Guest mode: try the app without signup`,
  },
  {
    id: 'xp-rules',
    icon: Star,
    title: '⚡ XP, Level & Coin Rules (FIXED)',
    color: 'text-yellow-400',
    content: `**LEVEL SYSTEM:**
- 100 XP = 1 Level (fixed)
- Level = floor(Total XP / 100)

**FOCUS TIMER REWARDS:**
- 1 XP every 15 seconds of focus ⏱️
- 1 Coin every 30 seconds of focus
- Session Complete Bonus: +focusTime XP + focusTime/5 Coins

**CHAPTER PROGRESS:**
- Theory Complete: +20 XP, +5 Coins
- Practice Complete: +30 XP, +10 Coins
- Revision Complete: +50 XP, +15 Coins

**TASK COMPLETION:**
- Daily Task: +15 XP, +5 Coins
- Weekly Task: +50 XP, +20 Coins
- Monthly Task: +100 XP, +50 Coins
- Custom Task: +10 XP, +3 Coins

**RAID VICTORY:**
- Base: +500 XP, +40 Coins
- Per backlog cleared: +100 XP, +10 Coins

**FRIEND INVITE:**
- Invite accepted: +50 XP, +25 Coins 🎉`,
  },
  {
    id: 'jungle',
    icon: TreeDeciduous,
    title: 'Living Jungle System',
    color: 'text-accent',
    content: `Your study progress grows a living jungle! 🌴

**How Trees Grow:**
- 🪵 Dry Wood → Start of chapter (0%)
- 🌱 Growing → Theory completed
- 🌳 Healthy → Theory + Practice done
- 🌴 Flourishing → All complete!

**Animals Appear:**
- Birds 🦜 at 70%+ health
- Monkeys 🐒 at 50%+
- Full ecosystem at 100%!`,
  },
  {
    id: 'goals',
    icon: Target,
    title: 'Goals & Tasks',
    color: 'text-primary',
    content: `Set your study goals! 🎯

**Task Types:**
- 📅 Daily: Small, regular tasks
- 📆 Weekly: Medium-term goals
- 🗓️ Monthly: Big milestones

**Deadlines:**
- Set date + time for each goal
- Get reminders via alarms
- Overdue tasks trigger RAID MODE! ⚠️`,
  },
  {
    id: 'raid',
    icon: Swords,
    title: 'Raid System (Backlogs)',
    color: 'text-raid',
    content: `Missed deadlines? Face the Boss! 👹

**How Raids Work:**
- Overdue tasks become backlogs
- Each backlog = 100 Boss HP
- Complete task = Deal 100 damage
- Clear all = Victory + Bonus rewards!

**Rewards:**
- Victory: +500 XP base + 100 per task
- Coins: +40 base + 10 per task
- Skip tasks = Face BEIJJATI! 😈`,
  },
  {
    id: 'rewards',
    icon: Award,
    title: 'Rewards & Unlocks',
    color: 'text-coins',
    content: `Level up to earn real rewards! 🏆

**Reward Tiers:**
- Level 5: 🖊️ Pen
- Level 10: 📓 Notebook
- Level 15: 🎒 Bag
- Level 20: 🏆 Trophy
- Level 25: 🥇 Medal
- Level 30: 📜 Certificate`,
  },
  {
    id: 'friends',
    icon: Users,
    title: 'Friends & Invites',
    color: 'text-blue-400',
    content: `Connect with friends! 👥

**How to Add Friends:**
- Share your unique Biro-log ID
- Share invite link or QR code
- Search by name or email

**Invite Rewards:**
- When someone joins via your link: +50 XP, +25 Coins
- Chat with friends in real-time
- Compare progress on leaderboard`,
  },
  {
    id: 'mentor',
    icon: Zap,
    title: 'AI Mentor & Biro-yaar',
    color: 'text-amber-400',
    content: `Two AI companions! 🤖

**Biro-yaar (Buddy):**
- Your study friend, talks like WhatsApp
- Upload images, PDFs for help
- 3-hour daily chat limit

**AI Mentor (Guide):**
- Professional mentor for your track
- Daily nightly check-ins
- Gives tasks based on your progress
- Pushes you towards your goals`,
  },
  {
    id: 'timer',
    icon: Timer,
    title: 'Focus Timer',
    color: 'text-green-400',
    content: `Stay focused with rewards! ⏱️

**Earnings while focusing:**
- 1 XP every 15 seconds
- 1 Coin every 30 seconds
- Bonus on session complete!

**Tips:**
- 25 min focus + 5 min break
- Customize times in settings
- Keep streaks for multipliers!`,
  },
];

export const GuideSection = ({ className }: GuideSectionProps) => {
  return (
    <div className={cn("glass-panel rounded-2xl border border-primary/20 overflow-hidden", className)}>
      <div className="flex items-center gap-3 p-4 border-b border-primary/20">
        <Book className="w-6 h-6 text-primary" />
        <h2 className="font-game text-xl text-primary text-glow-purple">How Biro-log Works</h2>
      </div>

      <div className="p-4">
        <Accordion type="single" collapsible className="space-y-2">
          {guideItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}
              className="glass-panel rounded-xl border border-white/10 px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", item.color)} />
                  <span className="font-medium text-left">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="text-sm text-muted-foreground whitespace-pre-line pl-8">
                  {item.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="p-4 border-t border-primary/20 bg-accent/5">
        <div className="flex items-start gap-2">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-sm font-medium text-accent">Pro Tip</p>
            <p className="text-xs text-muted-foreground">
              Use Focus Timer while studying = XP + Coins automatically! Complete all three steps (Theory → Practice → Revision) for maximum rewards!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
