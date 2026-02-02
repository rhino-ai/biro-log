import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Camera, X, School, Loader2 } from 'lucide-react';

// Default college images
const defaultCollegeImages: Record<string, string> = {
  'IIT Bombay': 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=200&fit=crop',
  'IIT Delhi': 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop',
  'IIT Madras': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=200&fit=crop',
  'IIT Kanpur': 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&h=200&fit=crop',
};

export const CollegeImageSection = () => {
  const { user } = useAuth();
  const { profile, updateProfile } = useGameStore();
  const [isUploading, setIsUploading] = useState(false);
  const [collegeImage, setCollegeImage] = useState<string | null>(profile.dreamCollegeImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with profile changes
  useEffect(() => {
    if (profile.dreamCollegeImage) {
      setCollegeImage(profile.dreamCollegeImage);
    }
  }, [profile.dreamCollegeImage]);

  // Get image - user uploaded or default
  const displayImage = collegeImage || 
    (profile.dreamCollege && defaultCollegeImages[profile.dreamCollege]) ||
    'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=200&fit=crop';

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // If user is logged in, upload to Supabase
      if (user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/college-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        setCollegeImage(publicUrl);
        updateProfile({ dreamCollegeImage: publicUrl });
        
        toast({
          title: 'College Image Uploaded! 🏫',
          description: 'Your dream college image has been saved.',
        });
      } else {
        // For offline/non-logged users, use local storage via FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setCollegeImage(dataUrl);
          updateProfile({ dreamCollegeImage: dataUrl });
          toast({
            title: 'Image Set! 🏫',
            description: 'Your dream college image has been set locally.',
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setCollegeImage(null);
    updateProfile({ dreamCollegeImage: undefined });
    toast({
      title: 'Image Removed',
      description: 'Using default college image.',
    });
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-primary/20 animate-fade-in">
      {/* Image Section */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={displayImage}
          alt={profile.dreamCollege || 'Dream College'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=200&fit=crop';
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        
        {/* Upload Button */}
        <div className="absolute top-2 right-2 flex gap-1">
          {collegeImage && (
            <Button
              size="icon"
              variant="secondary"
              onClick={removeImage}
              className="w-8 h-8 bg-background/80 hover:bg-background"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-8 h-8 bg-background/80 hover:bg-background"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* College Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Dream College</p>
              <h3 className="font-game text-lg text-foreground text-glow-purple">
                {profile.dreamCollege || 'Set Your Dream College'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xl font-game text-accent">{profile.dreamMarks.jeeMain}</p>
            <p className="text-xs text-muted-foreground">JEE Main</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xl font-game text-primary">{profile.dreamMarks.jeeAdvanced}</p>
            <p className="text-xs text-muted-foreground">JEE Adv</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xl font-game text-coins">{profile.dreamMarks.cbse}%</p>
            <p className="text-xs text-muted-foreground">CBSE</p>
          </div>
        </div>
        <span className="text-3xl animate-bounce-subtle">🎯</span>
      </div>
    </div>
  );
};
