import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heuse-gold focus-visible:ring-offset-2 focus-visible:ring-offset-heuse-dark disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-heuse-gold text-heuse-dark hover:bg-heuse-gold/90 shadow-sm",
        secondary:
          "bg-heuse-dark text-heuse-text border border-heuse-border hover:bg-heuse-dark/80",
        outline:
          "border border-heuse-gold text-heuse-gold bg-transparent hover:bg-heuse-gold/10",
        ghost:
          "text-heuse-text hover:bg-heuse-dark hover:text-heuse-gold",
        destructive:
          "bg-heuse-crimson text-heuse-cream hover:bg-heuse-crimson/90",
        link: "text-heuse-gold underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded",
        default: "h-10 px-5 py-2 rounded-sm",
        lg: "h-12 px-8 text-base rounded-sm",
        icon: "h-10 w-10 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
