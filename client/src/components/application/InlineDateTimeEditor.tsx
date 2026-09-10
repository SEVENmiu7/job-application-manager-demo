import { useEffect, useState } from 'react';
import { CalendarClock, Check, LoaderCircle, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateTimePanel } from '@/components/application/DateTimePicker';
import {
  formatApplicationTime,
  toDatetimeLocalValue,
  toUtcTimestamp,
} from '@/lib/application-time';
import { cn } from '@/lib/utils';

interface InlineDateTimeEditorProps {
  label: string;
  value?: string | null;
  emptyText?: string;
  disabled?: boolean;
  triggerClassName?: string;
  onSave: (value: string) => Promise<boolean | void>;
}

export function InlineDateTimeEditor({
  label,
  value,
  emptyText = '时间未记录',
  disabled = false,
  triggerClassName,
  onSave,
}: InlineDateTimeEditorProps) {
  const normalizedValue: string = value || '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(
    toDatetimeLocalValue(normalizedValue, true),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setDraft(toDatetimeLocalValue(normalizedValue, true));
  }, [open, normalizedValue]);

  const save = async () => {
    if (draft === toDatetimeLocalValue(normalizedValue, true)) {
      setOpen(false);
      return;
    }
    const nextValue: string = toUtcTimestamp(draft);
    setSaving(true);
    try {
      const result = await onSave(nextValue);
      if (result !== false) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next: boolean) => !saving && setOpen(next)}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'group/time inline-flex min-w-0 items-center gap-1.5 rounded-md text-left outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
            triggerClassName,
          )}
          aria-label={`编辑${label}`}
          title={`单击编辑${label}`}
        >
          <CalendarClock className="size-3.5 shrink-0" />
          <span className="truncate">
            {normalizedValue
              ? formatApplicationTime(normalizedValue)
              : emptyText}
          </span>
          <Pencil className="size-3 shrink-0 opacity-0 transition group-hover/time:opacity-70 group-focus-visible/time:opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-(--radix-popover-content-available-height) w-auto overflow-y-auto rounded-xl border-border p-0 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-bold text-foreground-muted">
          编辑{label}
          <span className="font-normal">UTC+8</span>
        </div>
        <DateTimePanel value={draft} onChange={setDraft} />
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t border-border bg-popover px-3 py-2">
          <p className="text-[11px] leading-4 text-foreground-muted">
            清除后可删除该时间
          </p>
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              <X />
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
              保存
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
