import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-cream-300 bg-cream-100/60 px-6 py-16 text-center">
      {icon ? (
        <div aria-hidden className="mb-4 text-4xl opacity-70">
          {icon}
        </div>
      ) : null}
      <h3 className="mb-2 text-xl">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
