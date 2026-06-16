import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-sm border border-heuse-border bg-heuse-dark px-3 py-2 text-sm text-heuse-text placeholder:text-heuse-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heuse-gold focus-visible:ring-offset-1 focus-visible:ring-offset-heuse-dark disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
