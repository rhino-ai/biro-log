import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageCircle, Video, Plus, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'studying';
  lastSeen?: string;
  xp: number;
  streak: number;
}

interface ChatGroup {
  id: string;
  name: string;
  members: number;
  lastMessage?: string;
  icon: string;
}

const mockFriends: Friend[] = [
  { id: '1', name: 'Rahul Sharma', avatar: '👦', status: 'online', xp: 1250, streak: 15 },
  { id: '2', name: 'Priya Singh', avatar: '👧', status: 'studying', xp: 2100, streak: 23 },
  { id: '3', name: 'Amit Kumar', avatar: '🧑', status: 'offline', lastSeen: '2h ago', xp: 890, streak: 7 },
  { id: '4', name: 'Neha Gupta', avatar: '👩', status: 'online', xp: 3200, streak: 45 },
];

const mockGroups: ChatGroup[] = [
  { id: 'g1', name: 'JEE Warriors 2026', members: 24, lastMessage: 'Physics doubt anyone?', icon: '⚔️' },
  { id: 'g2', name: 'Chemistry Gang', members: 12, lastMessage: 'Organic is tough 😭', icon: '🧪' },
  { id: 'g3', name: 'Study Buddies', members: 8, lastMessage: 'Let\'s do a group call!', icon: '📚' },
];

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = mockFriends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChat = (friend: Friend) => {
    toast({
      title: '🚧 Coming Soon!',
      description: `Chat with ${friend.name} will be available in the next update!`,
    });
  };

  const handleVideoCall = (friend: Friend) => {
    toast({
      title: '📹 Coming Soon!',
      description: `Video call with ${friend.name} will be available soon!`,
    });
  };

  const handleGroupChat = (group: ChatGroup) => {
    toast({
      title: '🚧 Coming Soon!',
      description: `Group chat "${group.name}" will be available soon!`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl text-glow-purple">👥 Friends</h1>
          <Button variant="outline" size="icon" className="shrink-0">
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="pl-10 bg-secondary/50"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'friends' ? 'default' : 'outline'}
            onClick={() => setActiveTab('friends')}
            className="flex-1 gap-2"
          >
            <Users className="w-4 h-4" />
            Friends ({mockFriends.length})
          </Button>
          <Button
            variant={activeTab === 'groups' ? 'default' : 'outline'}
            onClick={() => setActiveTab('groups')}
            className="flex-1 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Groups ({mockGroups.length})
          </Button>
        </div>

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl">
                    {friend.avatar}
                  </div>
                  <div className={cn(
                    'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background',
                    friend.status === 'online' && 'bg-green-500',
                    friend.status === 'studying' && 'bg-yellow-500',
                    friend.status === 'offline' && 'bg-gray-500'
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{friend.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {friend.status === 'studying' && '📚 Studying now'}
                    {friend.status === 'online' && '🟢 Online'}
                    {friend.status === 'offline' && `Last seen ${friend.lastSeen}`}
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    <span className="text-accent">⚡{friend.xp} XP</span>
                    <span className="text-orange-400">🔥{friend.streak} streak</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleChat(friend)}>
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleVideoCall(friend)}>
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groups List */}
        {activeTab === 'groups' && (
          <div className="space-y-3">
            <Button variant="outline" className="w-full gap-2 border-dashed">
              <Plus className="w-4 h-4" />
              Create New Group
            </Button>
            
            {mockGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupChat(group)}
                className="w-full glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-2xl">
                  {group.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{group.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{group.lastMessage}</p>
                  <p className="text-xs text-muted-foreground">{group.members} members</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Daily Chat Limit Info */}
        <div className="glass-panel rounded-xl p-4 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <h3 className="font-medium text-sm">Daily Chat Limit</h3>
              <p className="text-xs text-muted-foreground">
                Like Biro-yaar, friend chats have a 3hr/day limit to keep you focused!
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FriendsPage;