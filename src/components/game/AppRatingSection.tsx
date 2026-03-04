import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

export const AppRatingSection = () => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [suggestion, setSuggestion] = useState('');
  const [featureRequest, setFeatureRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async () => {
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from('app_feedback').insert({
      user_id: user.id,
      rating,
      suggestion: suggestion || null,
      feature_request: featureRequest || null,
    });

    if (error) {
      toast({ title: 'Failed to submit feedback', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Thanks! Feedback submitted ✅' });
      setSuggestion('');
      setFeatureRequest('');
      setRating(5);
    }

    setSubmitting(false);
  };

  return (
    <Card className="glass-panel border-primary/20">
      <CardHeader>
        <CardTitle className="font-game text-lg">Rate Biro-log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              type="button"
              variant={rating === value ? 'default' : 'outline'}
              onClick={() => setRating(value)}
              className="px-3"
            >
              ⭐ {value}
            </Button>
          ))}
        </div>

        <Textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="Any suggestion for improving the app?"
          className="min-h-20"
        />

        <Textarea
          value={featureRequest}
          onChange={(e) => setFeatureRequest(e.target.value)}
          placeholder="Which new feature do you want next?"
          className="min-h-20"
        />

        <Button onClick={submitFeedback} disabled={submitting} className="w-full">
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </CardContent>
    </Card>
  );
};
