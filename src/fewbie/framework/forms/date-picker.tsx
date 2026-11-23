"use client";

import * as React from "react";
import dayjs from "dayjs";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import type { Locale } from "react-day-picker";
import { enUS, zhCN } from "react-day-picker/locale";
import { cn } from "cn";
import { Button } from "@/fewbie/ui/button";
import { Calendar } from "@/fewbie/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/fewbie/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/fewbie/ui/select";

type Formatter = ReturnType<typeof useFormatter>;

const DATE_FORMAT = "YYYY-MM-DD";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const CALENDAR_LOCALES: Record<string, Locale> = { en: enUS, zh: zhCN };

interface DatePickerProps {
  id?: string;
  /** `YYYY-MM-DD`; an empty string means no selection. */
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

interface DateTimePickerProps {
  id?: string;
  /** `YYYY-MM-DDTHH:mm` (local wall clock); an empty string means no selection. */
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

function useCalendarLocale(): Locale {
  const locale = useLocale();
  return CALENDAR_LOCALES[locale] ?? enUS;
}

/** Parses a picker value into a local Date, or undefined when unset/invalid. */
function parseValue(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toDate() : undefined;
}

/**
 * Formats a picker value for display in the active UI language.
 *
 * The value is wall-clock data (no timezone semantics), so it is rebuilt as a
 * UTC instant and formatted in UTC. That keeps the rendered text identical on
 * the server and the client regardless of their local timezones.
 */
function formatValue(format: Formatter, value: string | null | undefined, withTime: boolean): string {
  if (!value) return "";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  const instant = new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), parsed.hour(), parsed.minute()));
  return withTime
    ? format.dateTime(instant, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
    : format.dateTime(instant, { dateStyle: "medium", timeZone: "UTC" });
}

export function DatePicker({ id, value, onChange, placeholder, ariaLabel, disabled, className }: DatePickerProps) {
  return (
    <DatePickerBase
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
    />
  );
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: DateTimePickerProps) {
  return (
    <DatePickerBase
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
      withTime
    />
  );
}

function DatePickerBase({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
  className,
  withTime = false,
}: DatePickerProps & { withTime?: boolean }) {
  const tc = useTranslations("framework.common");
  const format = useFormatter();
  const calendarLocale = useCalendarLocale();
  const [open, setOpen] = React.useState(false);

  const selected = parseValue(value);
  const hour = selected ? dayjs(selected).format("HH") : "00";
  const minute = selected ? dayjs(selected).format("mm") : "00";

  const commitDate = (date: Date) => {
    const day = dayjs(date).format(DATE_FORMAT);
    onChange(withTime ? `${day}T${hour}:${minute}` : day);
    if (!withTime) setOpen(false);
  };

  const commitTime = (nextHour: string, nextMinute: string) => {
    // Without a date there is nothing to attach the time to; `dayjs(undefined)`
    // used to silently produce today, submitting a date the user never picked
    // (R82-19).
    if (!selected) return;
    const day = dayjs(selected).format(DATE_FORMAT);
    onChange(`${day}T${nextHour}:${nextMinute}`);
  };

  const display = formatValue(format, value, withTime);
  const fallback = placeholder ?? (withTime ? tc("selectDateTime") : tc("selectDate"));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? fallback}
          className={cn(
            "w-45 justify-start gap-2 overflow-hidden font-normal",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="truncate">{display || fallback}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          required={false}
          selected={selected}
          onSelect={(date) => {
            if (date) commitDate(date);
          }}
          locale={calendarLocale}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {tc("clear")}
          </Button>
          {withTime && (
            <div className="flex items-center gap-1.5">
              <Select value={hour} disabled={!selected} onValueChange={(nextHour) => commitTime(nextHour, minute)}>
                <SelectTrigger size="sm" aria-label={tc("hour")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">:</span>
              <Select value={minute} disabled={!selected} onValueChange={(nextMinute) => commitTime(hour, nextMinute)}>
                <SelectTrigger size="sm" aria-label={tc("minute")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                {tc("done")}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
