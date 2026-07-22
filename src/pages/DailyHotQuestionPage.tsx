import { useState, useEffect, useMemo } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase = _supabase as any;
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { Header } from '@/components/layout/Header';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send, Flame, Plus, CheckCircle2, Image as ImageIcon, BarChart3, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Question {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  kind?: 'text' | 'poll' | 'image' | 'quiz';
  schedule_basis?: string;
  starts_at?: string;
  ends_at?: string | null;
  poll_options?: string[];
  quiz_options?: string[];
  correct_answer?: string | null;
  created_at: string;
}

interface Answer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  selected_option?: string | null;
  is_correct: boolean;
  created_at: string;
  profiles?: { name: string; avatar: string };
}

const DailyHotQuestionPage = () => {
  const { user, isAdmin } = useAuth();
  const { profile } = useGame();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin Post state
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  
  // User Answer state
  const [myAnswer, setMyAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleAnswers = useMemo(() => answers, [answers]);

  const fetchLatestQuestion = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_hot_questions')
        .select('*')
        .lte('starts_at', new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) throw error;
      setQuestion(data);
      
      if (data) {
        fetchAnswers(data.id);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error loading question', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnswers = async (qId: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_hot_answers')
        .select('*')
        .eq('question_id', qId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setAnswers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLatestQuestion();
  }, []);

  const handlePostQuestion = async () => {
    if (!newTitle.trim() || !newContent.trim() || !user) return;
    setIsPosting(true);
    try {
      const { error } = await supabase.from('daily_hot_questions').insert({
        admin_id: user.id,
        title: newTitle,
        content: newContent
      });
      if (error) throw error;
      
      toast({ title: 'Question posted! 🔥' });
      setNewTitle('');
      setNewContent('');
      fetchLatestQuestion();
    } catch (err: any) {
      toast({ title: 'Error posting', description: err.message, variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!question || !user) return;
    const isChoice = question.kind === 'poll' || question.kind === 'quiz';
    if (isChoice && !selectedOption) return;
    if (!isChoice && !myAnswer.trim()) return;
    setIsSubmitting(true);
    try {
      const correct = question.kind === 'quiz' && question.correct_answer ? selectedOption === question.correct_answer : false;
      const { error } = await supabase.from('daily_hot_answers').insert({
        question_id: question.id,
        user_id: user.id,
        content: isChoice ? selectedOption : myAnswer,
        selected_option: isChoice ? selectedOption : null,
        is_correct: correct,
      });
      if (error) throw error;
      
      toast({ title: 'Answer submitted!' });
      setMyAnswer('');
      setSelectedOption('');
      fetchAnswers(question.id);
    } catch (err: any) {
      toast({ title: 'Error submitting', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkCorrect = async (answerId: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('daily_hot_answers').update({ is_correct: !currentStatus }).eq('id', answerId);
      if (error) throw error;
      fetchAnswers(question!.id);
    } catch (err: any) {
      toast({ title: 'Error updating', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton to="/" />
          <h1 className="font-game text-xl flex items-center gap-2">
            <Flame className="text-orange-500 w-6 h-6" /> Daily Hot Question
          </h1>
        </div>

        {isAdmin && (
          <div className="glass-panel p-4 rounded-xl space-y-3 border border-primary/20">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Post New Question (Admin)</h2>
            <Input placeholder="Question Title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Textarea placeholder="Question Content..." value={newContent} onChange={e => setNewContent(e.target.value)} />
            <Button onClick={handlePostQuestion} disabled={isPosting} className="w-full">
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flame className="w-4 h-4 mr-2" />}
              Post Question
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : question ? (
          <div className="flex-1 flex flex-col gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-orange-500/30 glow-orange">
              <h2 className="font-game text-2xl mb-2">{question.title}</h2>
              <div className="flex items-center gap-2 text-[10px] text-orange-200 mb-2 uppercase tracking-wide">
                {question.kind === 'poll' ? <BarChart3 className="w-3 h-3" /> : question.kind === 'quiz' ? <HelpCircle className="w-3 h-3" /> : question.kind === 'image' ? <ImageIcon className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                {question.kind || 'text'} • {question.schedule_basis || 'daily'}
              </div>
              <p className="whitespace-pre-wrap text-sm">{question.content}</p>
              {question.image_url && <img src={question.image_url} alt="Hot question attachment" className="mt-3 rounded-xl border border-white/10 max-h-64 w-full object-cover" />}
              <div className="text-[10px] text-muted-foreground mt-4 text-right">
                Starts: {new Date(question.starts_at || question.created_at).toLocaleString()}
              </div>
            </div>

            <div className="flex-1 glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden">
               <div className="p-3 border-b border-white/10 bg-black/20 font-medium">Answers ({visibleAnswers.length})</div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {visibleAnswers.map(ans => (
                    <div key={ans.id} className={`p-3 rounded-xl border ${ans.is_correct ? 'bg-green-500/10 border-green-500/50' : 'bg-secondary/50 border-white/5'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{ans.profiles?.avatar || '👤'}</span>
                          <span className="text-xs font-semibold">{ans.profiles?.name || 'Student'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {ans.is_correct && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => handleMarkCorrect(ans.id, ans.is_correct)} className="h-6 px-2 text-[10px]">
                              {ans.is_correct ? 'Unmark' : 'Mark Correct'}
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap pl-8">{ans.selected_option || ans.content}</p>
                    </div>
                  ))}
                  {visibleAnswers.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No answers yet. Be the first!</p>}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-white/10 flex gap-2">
                {question.kind === 'poll' || question.kind === 'quiz' ? (
                  <select value={selectedOption} onChange={e => setSelectedOption(e.target.value)} className="flex-1 rounded-md bg-secondary/50 border border-white/10 px-3 text-sm">
                    <option value="">Choose option…</option>
                    {(question.kind === 'quiz' ? question.quiz_options : question.poll_options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <Input 
                    placeholder="Type your answer..." 
                    value={myAnswer} 
                    onChange={e => setMyAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmitAnswer(); }}
                  />
                )}
                <Button size="icon" onClick={handleSubmitAnswer} disabled={isSubmitting || !myAnswer.trim()}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-muted-foreground">
            <Flame className="w-12 h-12 mb-4 opacity-20" />
            <p>No active hot questions right now.</p>
            <p className="text-xs mt-2">Check back later!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DailyHotQuestionPage;
