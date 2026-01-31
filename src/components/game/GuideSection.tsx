import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Book, ChevronRight, ChevronDown, Zap, TreeDeciduous, Target, Swords, Award, Bell, Timer } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface GuideSectionProps {
  className?: string;
}

const guideItems = [
  {
    id: 'jungle',
    icon: TreeDeciduous,
    title: 'Living Jungle System',
    color: 'text-accent',
    content: `Your study progress grows a living jungle! 🌴

**How Trees Grow:**
- 🪵 Dry Wood → Start of chapter (0% done)
- 🌱 Growing → Theory completed
- 🌳 Healthy → Theory + Practice done
- 🌴 Flourishing → All (Theory + Practice + Revision) complete!

**Animals Appear:**
- More green = more wildlife
- Birds 🦜 appear at 70%+ health
- Monkeys 🐒 at 50%+
- Full ecosystem at 100%!`,
  },
  {
    id: 'xp',
    icon: Zap,
    title: 'XP & Leveling System',
    color: 'text-yellow-400',
    content: `Earn XP automatically by studying! ⚡

**XP Rewards:**
- Theory Complete: +20 XP, +5 Coins
- Practice Complete: +30 XP, +10 Coins  
- Revision Complete: +50 XP, +15 Coins
- Daily Task: +15 XP
- Weekly Task: +50 XP
- Monthly Task: +100 XP

**Levels:**
- 100 XP = 1 Level
- Higher levels unlock rewards!`,
  },
  {
    id: 'goals',
    icon: Target,
    title: 'Goals & Tasks',
    color: 'text-primary',
    content: `Set your study goals and track progress! 🎯

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
- Backlogs summon the Raid Boss
- Clear backlogs = Attack the boss
- Defeat boss = Bonus rewards!

**Stay Alert:**
- Raid mode is ALWAYS active
- Complete tasks on time to avoid raids
- Boss gets stronger with more backlogs!`,
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
- Level 30: 📜 Certificate

Keep studying to unlock them all!`,
  },
  {
    id: 'alarms',
    icon: Bell,
    title: 'Alarms & Reminders',
    color: 'text-blue-400',
    content: `Never miss a study session! ⏰

**Set Up Alarms:**
- Choose time for each task
- Select ringtone style
- Get browser notifications

**Focus Timer:**
- Pomodoro-style timer
- 25 min focus + 5 min break
- Alarm sounds when done!`,
  },
  {
    id: 'timer',
    icon: Timer,
    title: 'Focus Timer',
    color: 'text-green-400',
    content: `Stay focused with the built-in timer! ⏱️

**How to Use:**
- Click Play to start
- 25 min focus sessions
- 5 min breaks between
- Customize times in settings

**Tips:**
- Disable distractions
- Complete full sessions
- Track your daily focus hours!`,
  },
];

export const GuideSection = ({ className }: GuideSectionProps) => {
  return (
    <div className={cn("glass-panel rounded-2xl border border-primary/20 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-primary/20">
        <Book className="w-6 h-6 text-primary" />
        <h2 className="font-game text-xl text-primary text-glow-purple">How Biro-log Works</h2>
      </div>

      {/* Guide Content */}
      <div className="p-4">
        <Accordion type="single" collapsible className="space-y-2">
          {guideItems.map((item) => (
            <AccordionItem 
              key={item.id} 
              value={item.id}
              className="glass-panel rounded-xl border border-white/10 px-4"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", item.color)} />
                  <span className="font-medium">{item.title}</span>
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

      {/* Tip */}
      <div className="p-4 border-t border-primary/20 bg-accent/5">
        <div className="flex items-start gap-2">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-sm font-medium text-accent">Pro Tip</p>
            <p className="text-xs text-muted-foreground">
              Complete all three steps (Theory → Practice → Revision) for maximum XP!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
