import { cn } from '@/lib/utils';
import { Book, Zap, TreeDeciduous, Target, Swords, Award, Bell, Timer, Users, Coins, Star } from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

interface GuideSectionProps {
  className?: string;
}

const guideItems = [
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
