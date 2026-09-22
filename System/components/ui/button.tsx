import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'emerald';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const buttonVariants = {
  base: 'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer',
  variants: {
    default: 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs',
    destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-600',
    link: 'text-[#04B358] underline-offset-4 hover:underline font-bold',
    emerald: 'bg-[#04B358] text-white hover:bg-[#039849] shadow-md shadow-[#04B358]/20',
  },
  sizes: {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 rounded-lg px-3 text-[11px]',
    lg: 'h-12 rounded-xl px-6 text-sm',
    icon: 'h-9 w-9 p-0',
  },
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const variantClass = buttonVariants.variants[variant] || buttonVariants.variants.default;
    const sizeClass = buttonVariants.sizes[size] || buttonVariants.sizes.default;

    return (
      <Comp
        className={cn(buttonVariants.base, variantClass, sizeClass, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
