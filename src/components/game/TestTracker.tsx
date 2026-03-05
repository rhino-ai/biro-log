import { useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FileText, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';

export const TestTracker = () => {
  const { testRecords, addTestRecord, deleteTestRecord } = useGame();
  const [activeExam, setActiveExam] = useState<'cbse' | 'jee-main' | 'jee-advanced'>('cbse');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    testName: '',
    date: undefined as Date | undefined,
    maxMarks: 100,
    scoredMarks: 0,
    physics: 0,
    chemistry: 0,
    mathematics: 0,
  });

  const filteredRecords = testRecords.filter((r) => r.examType === activeExam);
  
  // Calculate trends
  const getPercentage = (scored: number, max: number) => Math.round((scored / max) * 100);
  
  const getTrend = (current: number, previous: number) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'same';
  };

  const handleAddTest = () => {
    if (!newTest.testName.trim() || !newTest.date) return;
    
    addTestRecord({
      examType: activeExam,
      testName: newTest.testName,
      date: format(newTest.date, 'yyyy-MM-dd'),
      maxMarks: newTest.maxMarks,
      scoredMarks: newTest.scoredMarks,
      subjects: {
        physics: newTest.physics,
        chemistry: newTest.chemistry,
        mathematics: newTest.mathematics,
      },
    });
    
    setNewTest({
      testName: '',
      date: undefined,
      maxMarks: 100,
      scoredMarks: 0,
      physics: 0,
      chemistry: 0,
      mathematics: 0,
    });
    setIsAddDialogOpen(false);
  };

  const examConfig = {
    'cbse': { icon: '📘', name: 'CBSE', maxMarks: 100 },
    'jee-main': { icon: '📗', name: 'JEE Main', maxMarks: 300 },
    'jee-advanced': { icon: '📕', name: 'JEE Advanced', maxMarks: 360 },
  };

  return (
    <div className="glass-panel rounded-2xl border border-accent/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-accent/20">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-accent" />
          <h2 className="font-game text-xl text-accent">TEST ANALYSIS</h2>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 bg-primary hover:bg-primary/80">
              <Plus className="w-4 h-4" />
              Add Test
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-primary/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-game text-accent">Record Test Marks 📝</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Test Name (e.g., Mock Test 1)"
                value={newTest.testName}
                onChange={(e) => setNewTest({ ...newTest, testName: e.target.value })}
                className="bg-secondary/50 border-white/10"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-secondary/50">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTest.date ? format(newTest.date, 'PP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTest.date}
                        onSelect={(date) => setNewTest({ ...newTest, date })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max Marks</label>
                  <Input
                    type="number"
                    value={newTest.maxMarks}
                    onChange={(e) => setNewTest({ ...newTest, maxMarks: parseInt(e.target.value) || 0 })}
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              <div className="glass-panel rounded-xl p-3 border border-white/10">
                <p className="text-sm font-medium mb-3">Subject-wise Marks</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">⚡ Physics</label>
                    <Input
                      type="number"
                      value={newTest.physics}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setNewTest({ 
                          ...newTest, 
                          physics: val,
                          scoredMarks: val + newTest.chemistry + newTest.mathematics
                        });
                      }}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">🧪 Chemistry</label>
                    <Input
                      type="number"
                      value={newTest.chemistry}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setNewTest({ 
                          ...newTest, 
                          chemistry: val,
                          scoredMarks: newTest.physics + val + newTest.mathematics
                        });
                      }}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">📐 Maths</label>
                    <Input
                      type="number"
                      value={newTest.mathematics}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setNewTest({ 
                          ...newTest, 
                          mathematics: val,
                          scoredMarks: newTest.physics + newTest.chemistry + val
                        });
                      }}
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="text-lg font-game text-accent">
                    Total: {newTest.scoredMarks} / {newTest.maxMarks}
                  </span>
                </div>
              </div>

              <Button onClick={handleAddTest} className="w-full bg-accent hover:bg-accent/80">
                <Plus className="w-4 h-4 mr-2" />
                Save Test Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Exam Tabs */}
      <div className="flex items-center border-b border-accent/20">
        {(['cbse', 'jee-main', 'jee-advanced'] as const).map((exam) => (
          <button
            key={exam}
            onClick={() => setActiveExam(exam)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-all",
              activeExam === exam 
                ? "text-primary-foreground bg-accent/80" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {examConfig[exam].icon} {examConfig[exam].name}
          </button>
        ))}
      </div>

      {/* Test Records */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl block mb-2">📊</span>
            <p className="text-muted-foreground text-sm">No test records yet</p>
            <p className="text-xs text-muted-foreground">Add your first test to track progress!</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => {
            const prevRecord = filteredRecords[index + 1];
            const percentage = getPercentage(record.scoredMarks, record.maxMarks);
            const prevPercentage = prevRecord ? getPercentage(prevRecord.scoredMarks, prevRecord.maxMarks) : 0;
            const trend = prevRecord ? getTrend(percentage, prevPercentage) : 'same';
            
            return (
              <div 
                key={record.id}
                className="glass-panel rounded-xl p-4 border border-white/10 hover:border-accent/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-foreground">{record.testName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(record.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-game",
                      percentage >= 70 ? "bg-accent/20 text-accent" :
                      percentage >= 50 ? "bg-coins/20 text-coins" :
                      "bg-raid/20 text-raid"
                    )}>
                      {trend === 'up' && <TrendingUp className="w-4 h-4" />}
                      {trend === 'down' && <TrendingDown className="w-4 h-4" />}
                      {trend === 'same' && <Minus className="w-4 h-4" />}
                      {percentage}%
                    </div>
                    <button
                      onClick={() => deleteTestRecord(record.id)}
                      className="text-muted-foreground hover:text-raid transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="glass-panel rounded-lg p-2">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-game text-foreground">{record.scoredMarks}/{record.maxMarks}</p>
                  </div>
                  <div className="glass-panel rounded-lg p-2">
                    <p className="text-muted-foreground">⚡ Phy</p>
                    <p className="font-game text-foreground">{record.subjects.physics}</p>
                  </div>
                  <div className="glass-panel rounded-lg p-2">
                    <p className="text-muted-foreground">🧪 Chem</p>
                    <p className="font-game text-foreground">{record.subjects.chemistry}</p>
                  </div>
                  <div className="glass-panel rounded-lg p-2">
                    <p className="text-muted-foreground">📐 Math</p>
                    <p className="font-game text-foreground">{record.subjects.mathematics}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
