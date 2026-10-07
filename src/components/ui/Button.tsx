import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'outline-light' | 'outline-gold';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium tracking-wide transition-all duration-300 ease-soft rounded-[3px] disabled:opacity-60 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  // The original site's two buttons: solid leaf green and a gold outline. Every
  // filled call to action is leaf green, so "the thing to click" has one colour
  // site-wide; `secondary` is kept as an alias for existing call sites. Outlines
  // are for secondary actions such as "View all".
  primary: 'bg-leaf-500 text-white hover:bg-leaf-700 hover:-translate-y-0.5',
  secondary: 'bg-leaf-500 text-white hover:bg-leaf-700 hover:-translate-y-0.5',
  ghost: 'text-charcoal-900 hover:bg-leaf-50',
  outline: 'border border-charcoal-900/30 text-charcoal-900 hover:border-charcoal-900 hover:bg-charcoal-900 hover:text-white',
  'outline-light':
    'border border-white/70 text-white backdrop-blur-sm hover:bg-white hover:text-charcoal-900',
  'outline-gold': 'border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-charcoal-950',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
