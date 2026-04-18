'use client'

import { cn } from '@/lib/utils'

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  title?: string
  icon?: React.ReactNode
  glow?: boolean
}

export function GlassPanel({ children, className, title, icon, glow = false }: GlassPanelProps) {
  return (
    <div className={cn(
      'relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden',
      glow && 'shadow-[0_0_30px_-5px] shadow-primary/20',
      className
    )}>
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="text-sm font-semibold tracking-wide text-foreground/90 uppercase">{title}</h3>
        </div>
      )}
      
      <div className="relative p-4">
        {children}
      </div>
    </div>
  )
}
