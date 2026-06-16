import * as React from "react"
import { toast as sonnerToast, Toaster } from "sonner"

type ToastOptions = {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

type ToastFn = {
  (props: ToastOptions): ReturnType<typeof sonnerToast>
  error: (message: string) => ReturnType<typeof sonnerToast>
  success: (message: string) => ReturnType<typeof sonnerToast>
}

const toast: ToastFn = (props: ToastOptions) => {
  if (props.variant === "destructive") {
    return sonnerToast.error(props.title ?? "", {
      description: props.description,
    })
  }
  if (props.variant === "success") {
    return sonnerToast.success(props.title ?? "", {
      description: props.description,
    })
  }
  return sonnerToast(props.title ?? "", {
    description: props.description,
  })
}

toast.error = (message: string) => sonnerToast.error(message)
toast.success = (message: string) => sonnerToast.success(message)

function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => {
      if (id !== undefined) sonnerToast.dismiss(id)
      else sonnerToast.dismiss()
    },
  }
}

export { useToast, toast }
export { Toaster }