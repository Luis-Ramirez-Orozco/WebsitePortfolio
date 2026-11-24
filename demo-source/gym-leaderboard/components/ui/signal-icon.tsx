import * as React from "react"

import { cn } from "@/lib/utils"

interface SignalIconProps extends React.SVGAttributes<SVGSVGElement> {
  /** 0 to 5 filled bars. Unfilled spots show as small dots, so 0 is a row of dots. */
  level: number
  label?: string
}

/** Five rising bars, like a phone's signal meter. */
function SignalIcon({ level, label, className, ...props }: SignalIconProps) {
  const filled = Math.max(0, Math.min(5, Math.round(level)))
  return (
    <svg
      viewBox="0 0 24 16"
      width={24}
      height={16}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", className)}
      {...props}
    >
      {label && <title>{label}</title>}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 1 + i * 4.6
        const h = 3 + i * 3 // 3, 6, 9, 12, 15
        return i < filled ? (
          <rect key={i} x={x} y={16 - h} width={3.2} height={h} rx={1} fill="currentColor" />
        ) : (
          <circle key={i} cx={x + 1.6} cy={14.4} r={1.3} fill="currentColor" opacity={0.35} />
        )
      })}
    </svg>
  )
}

export { SignalIcon }
export type { SignalIconProps }
