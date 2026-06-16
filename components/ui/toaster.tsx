import { Toaster as SonnerToaster } from "sonner"

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full f items-center space-x-4 rounded-sm border border-heuse-border bg-heuse-dark p-4 shadow-lg",
          title: "text-sm font-medium text-heuse-cream",
          description: "text-sm text-heuse-muted",
          actionButton:
            "bg-heuse-gold text-heuse-dark text-sm font-medium px-3 py-1.5 rounded-sm hover:bg-heuse-gold/90 transition-colors",
          cancelButton:
            "bg-transparent text-heuse-muted text-sm font-medium px-3 py-1.5 rounded-sm border border-heuse-border hover:bg-heuse-dark/50 transition-colors",
          success: "border-heuse-gold/30",
          error: "border-heuse-crimson/30",
          warning: "border-heuse-gold/30",
          info: "border-heuse-border",
        },
      }}
      theme="dark"
      richColors
      closeButton
    />
  )
}

export { Toaster }
