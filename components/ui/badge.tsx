import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

const badgeVariants = {
  base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  variants: {
    default: 'border-transparent bg-slate-900 text-white shadow-xs',
    secondary: 'border-transparent bg-slate-100 text-slate-900',
    destructive: 'border-transparent bg-rose-500 text-white shadow-xs',
    outline: 'text-slate-950 border-slate-300',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClass = badgeVariants.variants[variant] || badgeVariants.variants.default;
  return (
    <div className={cn(badgeVariants.base, variantClass, className)} {...props} />
  );
}

export { Badge, badgeVariants };
