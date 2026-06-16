import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-sm bg-heuse-dark/60",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
