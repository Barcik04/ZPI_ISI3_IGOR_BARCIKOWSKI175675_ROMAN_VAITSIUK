import { motion, type HTMLMotionProps } from 'framer-motion';
import { type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
  spotlight?: boolean;
  glow?: string;
  delay?: number;
}

export function Card({ className, spotlight = true, glow, delay = 0, children, onMouseMove, style, ...rest }: CardProps) {
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    onMouseMove?.(e);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.6, 0.35, 1] }}
      onMouseMove={spotlight ? move : onMouseMove}
      className={cn('glass min-w-0 rounded-3xl shadow-card', spotlight && 'spotlight', className)}
      style={glow ? { ...style, boxShadow: `0 30px 80px -40px ${glow}` } : style}
      {...rest}
    >
      {children as ReactNode}
    </motion.div>
  );
}

export function CardHeader({ title, subtitle, icon, action, className }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-violet-300">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{title}</h3>
          {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
