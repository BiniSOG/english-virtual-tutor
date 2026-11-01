import { cn } from '@/lib/utils';

export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold' | 'dark';
export type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  outline: 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  gold: 'bg-gradient-to-r from-gold-400 to-gold-500 text-slate-900 shadow-sm shadow-gold-500/30 hover:from-gold-300 hover:to-gold-400',
  dark: 'bg-slate-900 text-white hover:bg-slate-800',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    variants[variant],
    sizes[size],
    className,
  );
