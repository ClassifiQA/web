import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const MAX_GRADE = 20
const DEFAULT_RADIUS = 25
const STROKE_WIDTH = 4

export const MemberGrade = ({
  grade,
  radius = DEFAULT_RADIUS,
  tooltipLabel = "Nota média",
}: {
  grade: number
  radius?: number
  tooltipLabel?: string
}) => {
  // safe radius
  const safeRadius = Number.isFinite(radius)
    ? Math.max(radius, STROKE_WIDTH)
    : DEFAULT_RADIUS

  // normalize grade
  const normalizedGrade = Number.isFinite(grade)
    ? Math.min(Math.max(grade, 0), MAX_GRADE)
    : 0

  // progress & radius
  const progress = normalizedGrade / MAX_GRADE
  const circleRadius = safeRadius - STROKE_WIDTH / 2
  const circumference = 2 * Math.PI * circleRadius
  const size = safeRadius * 2

  // ui
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          aria-label={`${normalizedGrade} de ${MAX_GRADE}`}
          className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-card font-bold"
          role="img"
          tabIndex={0}
          style={{
            width: size,
            height: size,
            fontSize: Math.max(10, safeRadius * 0.8),
          }}>
          <svg
            aria-hidden="true"
            className="absolute inset-0 -rotate-90"
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            width={size}>
            <circle
              className="fill-transparent stroke-amber-100"
              cx={safeRadius}
              cy={safeRadius}
              r={circleRadius}
              strokeWidth={STROKE_WIDTH}
            />
            {progress > 0 && (
              <circle
                className="fill-none stroke-accent"
                cx={safeRadius}
                cy={safeRadius}
                r={circleRadius}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeWidth={STROKE_WIDTH}
              />
            )}
          </svg>
          <span className="relative">{normalizedGrade}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipLabel}: {grade}
      </TooltipContent>
    </Tooltip>
  )
}
