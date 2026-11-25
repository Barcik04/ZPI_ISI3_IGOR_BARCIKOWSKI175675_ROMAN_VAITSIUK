import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto] hover:bg-right shadow-glow hover:shadow-[0_0_0_1px_rgba(167,139,250,.4),0_14px_50px_-10px_rgba(139,92,246,.8)]',
  secondary: 'text-white bg-white/[0.07] hover:bg-white/[0.12] border border-white/10',
  ghost: 'text-zinc-300 hover:text-white hover:bg-white/[0.06]',
  outline: 'text-zinc-200 border border-white/15 hover:border-violet-400/60 hover:bg-violet-500/10 hover:text-white',
  danger: 'text-rose-200 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20',
  success: 'text-emerald-100 bg-emerald-500/15 border border-emerald-400/30 hover:bg-emerald-500/25',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-2xl',
  icon: 'h-9 w-9 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-medium transition-all duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer" />
      )}
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});
