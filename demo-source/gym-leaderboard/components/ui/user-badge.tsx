import * as React from "react"
import { Check, Crown } from "lucide-react"

import { cn } from "@/lib/utils"

/* Colors are inline styles (not classes) so surrounding list styles can't recolor or resize the pill. */
const COLORS = {
  gold: { background: "#fbbf24", color: "#451a03" },
  silver: { background: "#cbd5e1", color: "#0f172a" },
  bronze: { background: "#fdba74", color: "#431407" },
  red: { background: "#ef4444", color: "#ffffff" },
  blue: { background: "#3b82f6", color: "#ffffff" },
  green: { background: "#10b981", color: "#ffffff" },
  purple: { background: "#8b5cf6", color: "#ffffff" },
} as const

type UserBadgeColor = keyof typeof COLORS

interface UserBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string
  color: UserBadgeColor | string
  /** Adds a small crown (used for the Admin badge). */
  crown?: boolean
}

/** A small colored pill shown next to someone's name.
    `check` draws just a gold circle with a checkmark (the Admin badge); `label` becomes its accessible name. */
function UserBadge({ label, color, crown, check, className, style, ...props }: UserBadgeProps & { check?: boolean }) {
  if (check) {
    return (
      <span
        data-slot="user-badge"
        role="img"
        aria-label={label}
        title={label}
        className={cn("inline-grid shrink-0 place-items-center rounded-full", className)}
        style={{ width: 16, height: 16, margin: 0, ...(COLORS[color as UserBadgeColor] ?? COLORS.gold), ...style }}
        {...props}
      >
        <Check style={{ width: 11, height: 11 }} strokeWidth={3.5} aria-hidden="true" />
      </span>
    )
  }
  return (
    <span
      data-slot="user-badge"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 leading-none font-semibold whitespace-nowrap",
        className
      )}
      style={{ fontSize: 10, margin: 0, whiteSpace: "nowrap", ...(COLORS[color as UserBadgeColor] ?? COLORS.gold), ...style }}
      {...props}
    >
      {crown && <Crown className="size-2.5" aria-hidden="true" />}
      {label}
    </span>
  )
}

/** Up to `max` badges, then "+N". */
function UserBadges({
  badges,
  max = 2,
  className,
}: {
  badges: { id: string; label: string; color: string; auto?: boolean }[]
  max?: number
  className?: string
}) {
  if (!badges.length) return null
  const shown = badges.slice(0, max)
  const extra = badges.length - shown.length
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)} style={{ margin: 0 }}>
      {shown.map((b) => (
        <UserBadge key={b.id} label={b.label} color={b.color} check={b.auto} />
      ))}
      {extra > 0 && (
        <span className="text-muted-foreground shrink-0 text-[10px] font-semibold" title={badges.slice(max).map((b) => b.label).join(", ")}>
          +{extra}
        </span>
      )}
    </span>
  )
}

export { UserBadge, UserBadges, COLORS as USER_BADGE_COLORS }
export type { UserBadgeColor, UserBadgeProps }
