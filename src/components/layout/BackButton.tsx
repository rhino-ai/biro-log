import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  className?: string;
  to?: string;
  label?: string;
}

export const BackButton = ({ className, to, label = 'Back' }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn('flex items-center gap-2 text-muted-foreground hover:text-foreground', className)}
    >
      <ArrowLeft size={16} />
      {label}
    </Button>
  );
};
