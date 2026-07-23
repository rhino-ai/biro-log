import { useState, useMemo } from 'react';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGame } from '@/hooks/useGame';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Table, Sparkles, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const AnalyticsPage = () => {
  const { xp, level, coins, streak, jungles, tasks, testRecords, calculateJungleHealth } = useGame();
  
  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    chartType: 'bar' | 'line';
    chartData: any[];
    dataLabel: string;
  } | null>(null);

  const handleAnalyzeSheet = async () => {
    if (!sheetUrl.trim()) {
      toast({ title: 'Enter a valid link', description: 'Please provide a public Google Sheet URL', variant: 'destructive' });
      return;
    }

    const sheetIdMatch = sheetUrl.match(/[-\w]{25,}/);
    if (!sheetIdMatch) {
      toast({ title: 'Invalid URL', description: 'Could not find Sheet ID in the URL', variant: 'destructive' });
      return;
    }

    const sheetId = sheetIdMatch[0];
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Proxy through edge function — user's Gemini key stays server-side and encrypted.
      const { data, error } = await supabase.functions.invoke('analyze-sheet', {
        body: { sheetId },
      });
      if (error) throw new Error(error.message || 'Analysis failed');
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalysisResult(data as any);
      toast({ title: 'Sheet Analyzed! 📈', description: 'AI generated insights & charts.' });
    } catch (err: any) {
      toast({ title: 'Analysis Failed', description: err.message || 'Error processing sheet', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Subject health
  const subjectHealth = useMemo(() => {
    return jungles.map(j => ({
      name: j.name.split(' ').pop() || j.name,
      emoji: j.icon,
      health: calculateJungleHealth(j.id),
    }));
  }, [jungles, calculateJungleHealth]);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Consistency score
  const consistencyScore = Math.min(100, Math.round((streak / 30) * 60 + (completionPct * 0.4)));

  // Life in weeks
  const birthYear = 2008; // approx for JEE aspirants
  const currentWeek = Math.floor((Date.now() - new Date(birthYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const totalWeeks = 90 * 52;

  // Test progression
  const sortedTests = [...testRecords].sort((a, b) => a.date.localeCompare(b.date));
  const avgScore = sortedTests.length > 0 ? Math.round(sortedTests.reduce((a, t) => a + (t.scoredMarks / t.maxMarks) * 100, 0) / sortedTests.length) : 0;
  const bestScore = sortedTests.length > 0 ? Math.round(Math.max(...sortedTests.map(t => (t.scoredMarks / t.maxMarks) * 100))) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">📊 Analytics</h1>
          <div className="w-12" />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '⭐', value: level, label: 'Level', c: 'border-primary/30' },
            { icon: '🔥', value: streak, label: 'Streak', c: 'border-streak/30' },
            { icon: '📊', value: `${consistencyScore}%`, label: 'Consistency', c: 'border-accent/30' },
            { icon: '✅', value: `${completionPct}%`, label: 'Tasks', c: 'border-blue-500/30' },
          ].map((s, i) => (
            <div key={i} className={cn('glass-panel rounded-xl p-3 border text-center', s.c)}>
              <span className="text-lg">{s.icon}</span>
              <p className="font-game text-lg">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Subject Health Radar */}
        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle className="text-sm font-game">📐 Subject Health</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {subjectHealth.map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{s.emoji} {s.name}</span>
                  <span className={cn('font-game', s.health >= 70 ? 'text-accent' : s.health >= 40 ? 'text-coins' : 'text-raid')}>{s.health}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-500',
                    s.health >= 70 ? 'bg-accent' : s.health >= 40 ? 'bg-coins' : 'bg-raid',
                  )} style={{ width: `${s.health}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Test Progression */}
        <Card className="glass-panel border-accent/20">
          <CardHeader><CardTitle className="text-sm font-game">🎯 Test Performance</CardTitle></CardHeader>
          <CardContent>
            {sortedTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tests recorded yet</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-xs text-muted-foreground">Average</p><p className="font-game text-lg text-primary">{avgScore}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Best</p><p className="font-game text-lg text-accent">{bestScore}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Tests</p><p className="font-game text-lg">{sortedTests.length}</p></div>
                </div>
                {/* Mini chart */}
                <div className="flex items-end gap-1 h-20">
                  {sortedTests.slice(-10).map((t, i) => {
                    const pct = (t.scoredMarks / t.maxMarks) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={cn('w-full rounded-t transition-all',
                          pct >= 70 ? 'bg-accent/60' : pct >= 40 ? 'bg-coins/60' : 'bg-raid/60',
                        )} style={{ height: `${pct * 0.8}px` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Life in Weeks */}
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm font-game">⏳ Life in Weeks</CardTitle>
            <p className="text-[10px] text-muted-foreground">Each dot = 1 week of your life. Use them wisely.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-[2px]">
              {Array.from({ length: Math.min(totalWeeks, 1500) }).map((_, i) => {
                const isPast = i < currentWeek;
                const isCurrent = i === currentWeek;
                const isChildhood = i < 12 * 52;
                const isTeen = i >= 12 * 52 && i < 18 * 52;
                return (
                  <div key={i} className={cn('w-1.5 h-1.5 rounded-[1px]',
                    isCurrent && 'bg-white animate-pulse',
                    !isCurrent && isPast && isChildhood && 'bg-primary/40',
                    !isCurrent && isPast && isTeen && 'bg-raid/40',
                    !isCurrent && isPast && !isChildhood && !isTeen && 'bg-accent/40',
                    !isPast && !isCurrent && 'bg-muted/20',
                  )} />
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3 italic">
              "How many squares do you have left? Use them wisely."
            </p>
          </CardContent>
        </Card>

        {/* Google Sheets AI Analysis */}
        <Card className="glass-panel border-accent/40 bg-gradient-to-br from-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-game flex items-center gap-2 text-accent">
              <Table className="w-4 h-4" /> Google Sheets AI Analysis
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Paste a public Google Sheet URL (mock tests, habit logs, expenses) for Gemini AI charting.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="bg-secondary/50 text-xs"
              />
              <Button
                onClick={handleAnalyzeSheet}
                disabled={isAnalyzing || !sheetUrl.trim()}
                className="bg-accent shrink-0 gap-1.5"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analyze
              </Button>
            </div>

            {analysisResult && (
              <div className="space-y-4 pt-2 border-t border-white/10 animate-fade-in">
                <div className="bg-card/50 p-3 rounded-xl border border-white/10">
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-primary mb-1">
                    <TrendingUp className="w-3.5 h-3.5" /> AI Insight
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{analysisResult.summary}</p>
                </div>

                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {analysisResult.chartType === 'line' ? (
                      <LineChart data={analysisResult.chartData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                        <YAxis stroke="#888888" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f1f23', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name={analysisResult.dataLabel || 'Value'} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    ) : (
                      <BarChart data={analysisResult.chartData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                        <YAxis stroke="#888888" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f1f23', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend />
                        <Bar dataKey="value" name={analysisResult.dataLabel || 'Value'} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AnalyticsPage;
