import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Chapter, SubjectType, subjectIcons, subjectColors, createChapter } from '@/data/syllabus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterEditorProps {
  jungleId: string;
}

export const ChapterEditor = ({ jungleId }: ChapterEditorProps) => {
  const { jungles, addChapter, updateChapterName, deleteChapter } = useGameStore();
  const jungle = jungles.find((j) => j.id === jungleId);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterSubject, setNewChapterSubject] = useState<SubjectType>('physics');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  if (!jungle) return null;

  // Get available subjects for this jungle
  const availableSubjects = [...new Set(jungle.chapters.map((ch) => ch.subject))];

  const handleAddChapter = () => {
    if (!newChapterName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a chapter name',
        variant: 'destructive',
      });
      return;
    }

    const newId = `${jungleId}-custom-${Date.now()}`;
    const newChapter = createChapter(newId, newChapterName.trim(), newChapterSubject, true);
    
    addChapter(jungleId, newChapter);
    
    toast({
      title: '✅ Chapter Added!',
      description: `${newChapterName} added to ${jungle.name}`,
    });
    
    setNewChapterName('');
    setIsAddDialogOpen(false);
  };

  const handleStartEdit = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditedName(chapter.name);
  };

  const handleSaveEdit = (chapterId: string) => {
    if (!editedName.trim()) {
      toast({
        title: 'Error',
        description: 'Chapter name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    updateChapterName(jungleId, chapterId, editedName.trim());
    
    toast({
      title: '✅ Chapter Renamed!',
      description: `Chapter renamed to ${editedName}`,
    });
    
    setEditingChapterId(null);
    setEditedName('');
  };

  const handleDelete = (chapter: Chapter) => {
    if (window.confirm(`Are you sure you want to delete "${chapter.name}"?`)) {
      deleteChapter(jungleId, chapter.id);
      
      toast({
        title: '🗑️ Chapter Deleted',
        description: `${chapter.name} has been removed`,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingChapterId(null);
    setEditedName('');
  };

  return (
    <div className="space-y-4">
      {/* Add Chapter Button */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2 bg-accent">
            <Plus className="w-4 h-4" />
            Add New Chapter
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-panel border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-game">Add New Chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Chapter Name</label>
              <Input
                placeholder="Enter chapter name..."
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Subject</label>
              <Select
                value={newChapterSubject}
                onValueChange={(v) => setNewChapterSubject(v as SubjectType)}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subjectIcons[subject]} {subject.charAt(0).toUpperCase() + subject.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddChapter} className="w-full bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Chapter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chapter List for Editing */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {jungle.chapters.map((chapter) => (
          <div
            key={chapter.id}
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg border-l-4 bg-secondary/20',
              subjectColors[chapter.subject]
            )}
          >
            <span className="text-lg">{subjectIcons[chapter.subject]}</span>
            
            {editingChapterId === chapter.id ? (
              <>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 h-8 text-sm bg-background"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSaveEdit(chapter.id)}
                  className="h-8 w-8 text-accent"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm truncate">{chapter.name}</span>
                {chapter.isCustom && (
                  <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full">
                    Custom
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleStartEdit(chapter)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(chapter)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        📝 Each chapter = 1 tree in the jungle garden
      </p>
    </div>
  );
};
