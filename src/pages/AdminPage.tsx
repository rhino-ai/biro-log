import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/store/gameStore';
import { rewards } from '@/data/syllabus';
import { 
  Settings, 
  Users, 
  Award, 
  AlertTriangle, 
  Palette, 
  Bell, 
  Shield,
  Swords,
  BookOpen,
  Trash2,
  Plus,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminPage = () => {
  const { backlogCount, raidActive } = useGameStore();
  
  // Admin settings state
  const [settings, setSettings] = useState({
    beizzatiEnabled: true,
    raidEnabled: true,
    alarmsEnabled: true,
    darkMode: true,
    streakBonus: true,
  });

  const [rewardsList, setRewardsList] = useState(rewards);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Admin Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-game text-2xl text-glow-purple">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Control all game mechanics and settings
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="font-game text-xl text-accent">1</div>
              <div className="text-xs text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-4 text-center">
              <Swords className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <div className="font-game text-xl text-destructive">{backlogCount}</div>
              <div className="text-xs text-muted-foreground">Backlog Count</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-coins" />
              <div className="font-game text-xl text-coins">{raidActive ? 'Active' : 'None'}</div>
              <div className="text-xs text-muted-foreground">Raid Status</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-accent" />
              <div className="font-game text-xl text-accent">{rewardsList.length}</div>
              <div className="text-xs text-muted-foreground">Total Rewards</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="glass-panel w-full grid grid-cols-4">
            <TabsTrigger value="settings" className="font-game text-xs">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="rewards" className="font-game text-xs">
              <Award className="w-4 h-4 mr-1" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="raid" className="font-game text-xs">
              <Swords className="w-4 h-4 mr-1" />
              Raid
            </TabsTrigger>
            <TabsTrigger value="syllabus" className="font-game text-xs">
              <BookOpen className="w-4 h-4 mr-1" />
              Syllabus
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="font-game text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Game Mechanics
                </CardTitle>
                <CardDescription>Enable or disable game features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Beizzati (Punishment) Mode</Label>
                    <p className="text-xs text-muted-foreground">Avatar looks sad when backlog increases</p>
                  </div>
                  <Switch
                    checked={settings.beizzatiEnabled}
                    onCheckedChange={(val) => setSettings(s => ({ ...s, beizzatiEnabled: val }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Raid System</Label>
                    <p className="text-xs text-muted-foreground">Boss battles for clearing backlog</p>
                  </div>
                  <Switch
                    checked={settings.raidEnabled}
                    onCheckedChange={(val) => setSettings(s => ({ ...s, raidEnabled: val }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alarms & Reminders</Label>
                    <p className="text-xs text-muted-foreground">Daily/weekly task notifications</p>
                  </div>
                  <Switch
                    checked={settings.alarmsEnabled}
                    onCheckedChange={(val) => setSettings(s => ({ ...s, alarmsEnabled: val }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Streak Bonus (2× XP)</Label>
                    <p className="text-xs text-muted-foreground">Double XP after 7-day streak</p>
                  </div>
                  <Switch
                    checked={settings.streakBonus}
                    onCheckedChange={(val) => setSettings(s => ({ ...s, streakBonus: val }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="font-game text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Daily Reminder Time</Label>
                    <Input type="time" defaultValue="09:00" className="mt-1" />
                  </div>
                  <div>
                    <Label>Weekly Summary Day</Label>
                    <Input type="text" defaultValue="Sunday" className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-game text-lg">Level Rewards</CardTitle>
                  <CardDescription>Configure rewards for each level</CardDescription>
                </div>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Add Reward
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {rewardsList.map((reward, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 glass-panel rounded-lg">
                    <span className="text-2xl">{reward.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{reward.name}</div>
                      <div className="text-xs text-muted-foreground">Level {reward.level}</div>
                    </div>
                    <Input
                      type="number"
                      defaultValue={reward.level}
                      className="w-20"
                    />
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Raid Tab */}
          <TabsContent value="raid" className="space-y-4">
            <Card className="glass-panel border-destructive/20">
              <CardHeader>
                <CardTitle className="font-game text-lg flex items-center gap-2 text-destructive">
                  <Swords className="w-5 h-5" />
                  Raid Configuration
                </CardTitle>
                <CardDescription>Configure raid boss mechanics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Boss Max HP</Label>
                    <Input type="number" defaultValue="5000" className="mt-1" />
                  </div>
                  <div>
                    <Label>HP per Backlog</Label>
                    <Input type="number" defaultValue="100" className="mt-1" />
                  </div>
                  <div>
                    <Label>Victory Coins</Label>
                    <Input type="number" defaultValue="40" className="mt-1" />
                  </div>
                  <div>
                    <Label>Victory XP Bonus</Label>
                    <Input type="number" defaultValue="1000" className="mt-1" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div>
                    <Label className="text-destructive">Force Activate Raid</Label>
                    <p className="text-xs text-muted-foreground">Trigger raid for testing</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Trigger Raid
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Syllabus Tab */}
          <TabsContent value="syllabus" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="font-game text-lg">Syllabus Management</CardTitle>
                <CardDescription>Add, edit, or remove chapters from jungles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['CBSE Class 12', 'JEE Main', 'JEE Advanced'].map((jungle) => (
                    <div key={jungle} className="flex items-center justify-between p-3 glass-panel rounded-lg">
                      <span className="font-medium">{jungle}</span>
                      <Button variant="outline" size="sm">
                        Edit Chapters
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Button className="w-full gap-2 glow-purple">
          <Save className="w-4 h-4" />
          Save All Settings
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default AdminPage;
