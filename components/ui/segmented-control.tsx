import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Reużywalny segmentowy przełącznik (styl jak zakładki shadcn). Bezstanowy/prezentacyjny —
// stan aktywności podaje rodzic przez `active`. Element może renderować się jako dowolny węzeł
// (np. <Link>) dzięki `asChild`, więc nadaje się i do nawigacji, i do akcji button.
function SegmentedControl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="segmented-control"
      className={cn(
        "grid w-full auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1",
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  active = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="segmented-control-item"
      data-state={active ? "active" : "inactive"}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
