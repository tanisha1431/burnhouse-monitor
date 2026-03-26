"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  label: string;
  date: Date;
  onChange: (date: Date) => void;
}

const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0")
);

export function DateTimePicker({ label, date, onChange }: DateTimePickerProps) {
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = (Math.floor(date.getMinutes() / 5) * 5).toString().padStart(2, "0");

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const next = new Date(day);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    onChange(next);
  }

  function handleHourChange(hour: string) {
    const next = new Date(date);
    next.setHours(parseInt(hour, 10));
    onChange(next);
  }

  function handleMinuteChange(minute: string) {
    const next = new Date(date);
    next.setMinutes(parseInt(minute, 10));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-[220px] justify-start text-left font-normal")}
          >
            {formattedDate} {hh}:{mm}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDaySelect}
            initialFocus
          />
          <div className="flex items-center gap-2 border-t px-3 py-3">
            <span className="text-sm text-muted-foreground">Time:</span>
            <Select value={hh} onValueChange={handleHourChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm font-medium">:</span>
            <Select value={mm} onValueChange={handleMinuteChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
