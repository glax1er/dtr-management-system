import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4 relative",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center items-center h-8 relative w-full",
        caption_label: "text-sm font-semibold tracking-tight text-foreground select-none",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-8 px-1 z-10 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-background p-0 opacity-70 hover:opacity-100 hover:bg-accent pointer-events-auto rounded-md shadow-xs"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-background p-0 opacity-70 hover:opacity-100 hover:bg-accent pointer-events-auto rounded-md shadow-xs"
        ),
        month_grid: "w-full border-collapse space-y-1 select-none",
        weekdays: "flex justify-between w-full mb-1",
        weekday:
          "text-muted-foreground w-9 text-center font-medium text-[0.8rem] py-1 select-none",
        weeks: "flex flex-col gap-1 w-full",
        week: "flex w-full justify-between mt-0.5",
        day: "h-9 w-9 p-0 text-center text-sm relative flex items-center justify-center focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal rounded-lg text-foreground transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none text-xs sm:text-sm"
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-medium [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:shadow-xs rounded-lg",
        today:
          "[&:not([data-selected])>button]:bg-accent/70 [&:not([data-selected])>button]:text-accent-foreground [&:not([data-selected])>button]:font-bold [&:not([data-selected])>button]:border [&:not([data-selected])>button]:border-primary/40",
        outside:
          "opacity-35 [&>button]:text-muted-foreground [&>button]:opacity-40 [&>button]:hover:bg-transparent [&>button]:hover:text-muted-foreground",
        disabled:
          "opacity-25 [&>button]:text-muted-foreground [&>button]:cursor-not-allowed [&>button]:pointer-events-none",
        range_start:
          "rounded-l-lg [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-l-lg [&>button]:rounded-r-none",
        range_end:
          "rounded-r-lg [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-r-lg [&>button]:rounded-l-none",
        range_middle:
          "bg-accent text-accent-foreground rounded-none [&>button]:bg-transparent [&>button]:text-accent-foreground [&>button]:rounded-none [&>button]:hover:bg-accent/80",
        hidden: "invisible pointer-events-none",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) => {
          if (orientation === "left") {
            return <ChevronLeft className={cn("size-4", className)} {...chevronProps} />
          }
          if (orientation === "right") {
            return <ChevronRight className={cn("size-4", className)} {...chevronProps} />
          }
          if (orientation === "up") {
            return <ChevronUp className={cn("size-4", className)} {...chevronProps} />
          }
          return <ChevronDown className={cn("size-4", className)} {...chevronProps} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
