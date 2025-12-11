import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'text' | 'table' | 'product';
  count?: number;
  className?: string;
}

export function SkeletonLoader({
  variant = 'card',
  count = 1,
  className,
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'product':
        return (
          <div className="bg-card rounded-xl shadow-elevated border border-border overflow-hidden animate-pulse">
            <div className="aspect-[3/4] w-full bg-gradient-to-br from-muted via-muted/80 to-muted image-loading relative overflow-hidden">
              <Skeleton className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
            </div>
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-muted via-muted/70 to-muted" />
              <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-muted via-muted/70 to-muted" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-1/3 bg-gradient-to-r from-muted via-muted/70 to-muted" />
                <Skeleton className="h-8 w-8 rounded-full bg-gradient-to-r from-muted via-muted/70 to-muted" />
              </div>
            </div>
          </div>
        );
      case 'card':
        return (
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        );
      case 'list':
        return (
          <div className="flex items-center space-x-4 p-4 border-b border-border">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        );
      case 'table':
        return (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        );
      case 'text':
      default:
        return (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        variant === 'product' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
        variant === 'list' && 'space-y-0',
        variant === 'table' && 'space-y-2',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}
