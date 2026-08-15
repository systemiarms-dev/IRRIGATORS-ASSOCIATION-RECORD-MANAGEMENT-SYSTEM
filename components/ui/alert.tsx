import * as React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'destructive' | 'warning';
}

export function Alert({ className, variant = 'default', children, ...props }: AlertProps) {
  const variantStyles = {
    default: 'bg-slate-50 text-slate-900 border-slate-200',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    destructive: 'bg-rose-50 text-rose-900 border-rose-300',
    warning: 'bg-amber-50 text-amber-900 border-amber-300',
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-2xl border p-4 text-xs font-semibold flex items-center gap-3 print:hidden', variantStyles[variant], className)}
      {...props}
    >
      {variant === 'success' && <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700" />}
      {variant === 'destructive' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />}
      {variant === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />}
      {variant === 'default' && <Info className="w-4 h-4 shrink-0 text-slate-500" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('font-black leading-none tracking-tight mb-1 text-slate-900', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-xs font-medium text-slate-600', className)} {...props} />;
}
