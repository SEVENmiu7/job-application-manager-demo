import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { zhCN } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}
const DATETIME_VALUE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;
const DATETIME_MONTH_NAMES: string[] = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDateTimeValue(value?: string | null): DateTimeParts | null {
  if (!value) return null;
  const match: RegExpMatchArray | null = value.match(DATETIME_VALUE_PATTERN);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0),
    second: Number(match[6] || 0),
  };
}

function partsFromDate(date: Date): DateTimeParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function hasClockTime(parts: DateTimeParts): boolean {
  return parts.hour !== 0 || parts.minute !== 0 || parts.second !== 0;
}

function formatDateTimeValue(
  parts: DateTimeParts,
  withSeconds: boolean,
): string {
  const date: string = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  const clock: string = withSeconds
    ? `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
    : `${pad(parts.hour)}:${pad(parts.minute)}`;
  return `${date}T${clock}`;
}

function formatDisplayValue(
  parts: DateTimeParts,
  withSeconds: boolean,
): string {
  const date: string = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  if (!hasClockTime(parts)) return date;
  const clock: string = withSeconds
    ? `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
    : `${pad(parts.hour)}:${pad(parts.minute)}`;
  return `${date} ${clock}`;
}

interface DateTimePanelProps {
  value?: string | null;
  onChange: (value: string) => void;
  withSeconds?: boolean;
  onConfirm?: () => void;
}

export function DateTimePanel({
  value,
  onChange,
  withSeconds = true,
  onConfirm,
}: DateTimePanelProps) {
  const parsed: DateTimeParts | null = useMemo(
    () => parseDateTimeValue(value),
    [value],
  );
  const [viewYear, setViewYear] = useState<number>(
    () => parsed?.year ?? new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState<number>(
    () => parsed?.month ?? new Date().getMonth() + 1,
  );
  const [monthGridOpen, setMonthGridOpen] = useState<boolean>(false);

  const emit = (patch: Partial<DateTimeParts>): void => {
    const base: DateTimeParts = parsed ?? {
      ...partsFromDate(new Date()),
      hour: 0,
      minute: 0,
      second: 0,
    };
    onChange(formatDateTimeValue({ ...base, ...patch }, withSeconds));
  };

  const shiftMonth = (offset: number): void => {
    const date: Date = new Date(viewYear, viewMonth - 1 + offset, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };

  const handleSelectDay = (day?: Date): void => {
    if (!day) return;
    emit({
      year: day.getFullYear(),
      month: day.getMonth() + 1,
      day: day.getDate(),
    });
  };

  const handleNow = (): void => {
    const now: DateTimeParts = partsFromDate(new Date());
    emit(now);
    setViewYear(now.year);
    setViewMonth(now.month);
    setMonthGridOpen(false);
  };

  const navButtonClass: string =
    'flex size-7 items-center justify-center rounded-md text-foreground-secondary transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="w-[288px] select-none">
      {monthGridOpen ? (
        <>
          <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
            <button
              type="button"
              aria-label="上一年"
              className={navButtonClass}
              onClick={() => setViewYear((year: number) => year - 1)}
            >
              <ChevronsLeft className="size-4" />
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm font-semibold text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMonthGridOpen(false)}
              title="返回日期视图"
            >
              {viewYear} 年
            </button>
            <button
              type="button"
              aria-label="下一年"
              className={navButtonClass}
              onClick={() => setViewYear((year: number) => year + 1)}
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {DATETIME_MONTH_NAMES.map((name: string, index: number) => {
              const monthNumber: number = index + 1;
              const isSelected: boolean =
                parsed !== null &&
                parsed.year === viewYear &&
                parsed.month === monthNumber;
              const isCurrent: boolean =
                new Date().getFullYear() === viewYear &&
                new Date().getMonth() + 1 === monthNumber;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setViewMonth(monthNumber);
                    setMonthGridOpen(false);
                  }}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                      : 'text-foreground-secondary hover:bg-accent hover:text-foreground',
                    isCurrent && !isSelected && 'font-semibold text-primary',
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
            <div className="flex items-center">
              <button
                type="button"
                aria-label="上一年"
                className={navButtonClass}
                onClick={() => shiftMonth(-12)}
              >
                <ChevronsLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="上一月"
                className={navButtonClass}
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm font-semibold text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMonthGridOpen(true)}
              title="选择月份"
            >
              {viewYear} 年 {viewMonth} 月
            </button>
            <div className="flex items-center">
              <button
                type="button"
                aria-label="下一月"
                className={navButtonClass}
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                aria-label="下一年"
                className={navButtonClass}
                onClick={() => shiftMonth(12)}
              >
                <ChevronsRight className="size-4" />
              </button>
            </div>
          </div>
          <Calendar
            mode="single"
            locale={zhCN}
            weekStartsOn={0}
            month={new Date(viewYear, viewMonth - 1, 1)}
            onMonthChange={(date: Date) => {
              setViewYear(date.getFullYear());
              setViewMonth(date.getMonth() + 1);
            }}
            selected={
              parsed
                ? new Date(parsed.year, parsed.month - 1, parsed.day)
                : undefined
            }
            onSelect={handleSelectDay}
            classNames={{
              root: 'w-full',
              month: 'flex w-full flex-col gap-3',
              month_caption: 'hidden',
              nav: 'hidden',
            }}
            className="px-3 pb-2 pt-1 [--cell-size:--spacing(7)]"
          />
          <div className="flex gap-2 border-t border-border px-3 py-2">
            <TimeColumn
              label="时"
              count={24}
              value={parsed?.hour ?? -1}
              onSelect={(hour: number) => emit({ hour })}
            />
            <TimeColumn
              label="分"
              count={60}
              value={parsed?.minute ?? -1}
              onSelect={(minute: number) => emit({ minute })}
            />
            {withSeconds && (
              <TimeColumn
                label="秒"
                count={60}
                value={parsed?.second ?? -1}
                onSelect={(second: number) => emit({ second })}
              />
            )}
          </div>
        </>
      )}
      <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-popover px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleNow}
          className="text-primary"
        >
          此刻
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
          >
            清除
          </Button>
          {onConfirm && (
            <Button type="button" size="sm" onClick={onConfirm}>
              确定
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TimeColumnProps {
  label: string;
  count: number;
  value: number;
  onSelect: (value: number) => void;
}

function TimeColumn({ label, count, value, onSelect }: TimeColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const list: HTMLDivElement | null = listRef.current;
    const selected: HTMLButtonElement | null = selectedRef.current;
    if (list && selected) {
      list.scrollTop =
        selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
    }
  }, []);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="pb-1 text-center text-[11px] font-semibold text-foreground-muted">
        {label}
      </div>
      <div
        ref={listRef}
        className="relative h-32 overflow-y-auto rounded-lg border border-border bg-surface/60 p-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-strong"
      >
        {Array.from({ length: count }, (_: unknown, item: number) => (
          <button
            key={item}
            ref={item === value ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'flex h-7 w-full items-center justify-center rounded-md text-[13px] tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              item === value
                ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                : 'text-foreground-secondary hover:bg-accent hover:text-foreground',
            )}
          >
            {pad(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface DateTimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  withSeconds?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = '选择日期时间',
  disabled = false,
  withSeconds = true,
  size = 'default',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState<boolean>(false);
  const parsed: DateTimeParts | null = useMemo(
    () => parseDateTimeValue(value),
    [value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-size={size}
          className={cn(
            'flex w-full items-center gap-2 whitespace-nowrap rounded-[10px] border border-border-strong bg-input px-3.5 py-2 text-left text-sm outline-none transition-[color,box-shadow,border-color] enabled:hover:border-ring hover:bg-input-hover focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-75 data-[size=default]:h-10 data-[size=sm]:h-8 data-[size=sm]:rounded-lg data-[size=sm]:px-3 data-[size=sm]:text-[13px]',
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate tabular-nums',
              !parsed && 'text-muted-foreground',
            )}
          >
            {parsed ? formatDisplayValue(parsed, withSeconds) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-(--radix-popover-content-available-height) w-auto overflow-y-auto rounded-xl border-border p-0 shadow-xl"
      >
        <DateTimePanel
          value={value}
          onChange={onChange}
          withSeconds={withSeconds}
          onConfirm={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
