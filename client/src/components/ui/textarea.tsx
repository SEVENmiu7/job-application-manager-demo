import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border-strong placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-[10px] border bg-input hover:bg-input-hover px-3.5 py-2.5 text-base leading-6 transition-[color,box-shadow,border-color] outline-none focus-visible:ring-2 enabled:hover:border-ring disabled:cursor-not-allowed disabled:opacity-75 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
