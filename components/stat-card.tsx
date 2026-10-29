import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

const TONES = {
  default: { card: "bg-card", label: "text-muted-foreground", icon: "bg-muted text-muted-foreground" },
  primary: { card: "bg-card", label: "text-muted-foreground", icon: "bg-primary/10 text-primary" },
  success: { card: "bg-card", label: "text-muted-foreground", icon: "bg-success/10 text-success" },
  warning: { card: "border-warning/30 bg-warning/5", label: "text-warning", icon: "bg-warning/15 text-warning" },
} as const

export function StatCard({
  label, value, suffix, icon: Icon, hint, progress, tone = "default", onClick,
}: {
  label: string
  value: ReactNode
  suffix?: ReactNode
  icon?: ElementType
  hint?: ReactNode
  progress?: number
  tone?: keyof typeof TONES
  onClick?: () => void
}) {
  const styles = TONES[tone]
  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-xl border p-3 text-left sm:p-4",
        styles.card,
        onClick && "transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-sm font-medium", styles.label)}>{label}</span>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
        <span className="text-xl font-bold tracking-tight sm:text-2xl">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Wrapper>
  )
}
