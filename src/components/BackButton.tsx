import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  to?: string; // Optional specific path to navigate to
}

const BackButton: React.FC<BackButtonProps> = ({ 
  className = "", 
  variant = "ghost",
  to 
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back in history
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant={variant}
      size="sm"
      className={`flex items-center gap-1.5 hover:gap-2 transition-all duration-200 text-muted-foreground hover:text-foreground ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="font-medium">Back</span>
    </Button>
  );
};

export default BackButton;