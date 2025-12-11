import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-6 rounded-full bg-gradient-to-br from-muted to-muted/50 p-6 shadow-soft">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
      {description && (
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button 
          onClick={action.onClick} 
          variant="default"
          className="shadow-sm hover:shadow-md transition-shadow"
        >
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
