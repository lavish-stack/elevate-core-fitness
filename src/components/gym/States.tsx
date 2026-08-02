import type { ReactNode } from "react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-premium p-10 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-white/50">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card-premium p-10 text-center" role="alert">
      <h3 className="font-display text-2xl text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/50">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-6 inline-flex !py-2.5 !px-5 text-sm">
          Try again
        </button>
      )}
    </div>
  );
}
