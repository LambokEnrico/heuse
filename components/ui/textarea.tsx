import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-sm border border-heuse-border bg-heuse-dark px-3 py-2 text-sm text-heuse-text placeholder:text-heuse-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heuse-gold focus-visible:ring-offset-1 focus-visible:ring-offset-heuse-dark disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
