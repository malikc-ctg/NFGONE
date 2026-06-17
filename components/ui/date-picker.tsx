"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date",
  minDate,
  required,
}: {
  value?: string | Date
  onChange: (date: string) => void
  className?: string
  placeholder?: string
  minDate?: string | Date
  required?: boolean
}) {
  const dateValue = value ? new Date(value) : undefined
  const [open, setOpen] = React.useState(false)

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Keep it simple: send back YYYY-MM-DD
      const localDateString = format(date, "yyyy-MM-dd")
      onChange(localDateString)
    } else {
      onChange("")
    }
    setOpen(false)
  }

  const min = minDate ? new Date(minDate) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-10 border-slate-200",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
          {dateValue ? format(dateValue, "MMM d, yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-slate-100 shadow-xl rounded-2xl overflow-hidden" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          disabled={(date) => {
            if (min) {
              const d1 = new Date(date)
              d1.setHours(0,0,0,0)
              const d2 = new Date(min)
              d2.setHours(0,0,0,0)
              return d1 < d2
            }
            return false
          }}
        />
      </PopoverContent>
      {required && (
        <input
          type="text"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          required={required}
          value={value ? String(value) : ""}
          onChange={() => {}}
          tabIndex={-1}
        />
      )}
    </Popover>
  )
}
