import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateTimePanel } from '@/components/application/DateTimePicker';
import {
  PROCESS_TIME_STAGES,
  type ApplicationProcessStage,
} from '@shared/types';
import { cn } from '@/lib/utils';

interface StageTimeChipsProps {
  value: Record<ApplicationProcessStage, string>;
  onChange: (stage: ApplicationProcessStage, value: string) => void;
}
const CHIP_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))/;

function formatChipTime(value: string): string {
  const match: RegExpMatchArray | null = value.match(CHIP_TIME_PATTERN);
  if (!match) return value;
  return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

export function StageTimeChips({ value, onChange }: StageTimeChipsProps) {
  const recordedCount: number = PROCESS_TIME_STAGES.filter(
    (stage: ApplicationProcessStage) => Boolean(value[stage]),
  ).length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => (
          <StageChip
            key={stage}
            stage={stage}
            value={value[stage]}
            onChange={(next: string) => onChange(stage, next)}
          />
        ))}
      </div>
      {recordedCount > 0 && (
        <p className="mt-2.5 text-xs text-foreground-muted">
          已记录 {recordedCount} / {PROCESS_TIME_STAGES.length} 个节点
        </p>
      )}
    </div>
  );
}

interface StageChipProps {
  stage: ApplicationProcessStage;
  value: string;
  onChange: (value: string) => void;
}

function StageChip({ stage, value, onChange }: StageChipProps) {
  const [open, setOpen] = useState(false);
  const filled: boolean = Boolean(value);

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              filled
                ? 'border-primary/40 bg-primary-soft text-primary shadow-sm hover:border-primary/60'
                : 'border-dashed border-border text-foreground-muted hover:border-border-strong hover:text-foreground-secondary',
              filled && 'pr-6',
            )}
          >
            {!filled && <Plus className="size-3.5" />}
            <span>{stage}</span>
            {filled && (
              <span className="tabular-nums">{formatChipTime(value)}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-(--radix-popover-content-available-height) w-auto overflow-y-auto rounded-xl border-border p-0 shadow-xl"
        >
          <DateTimePanel
            value={value}
            onChange={onChange}
            withSeconds
            onConfirm={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      {filled && (
        <button
          type="button"
          aria-label={`清除${stage}时间`}
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 flex size-4.5 -translate-y-1/2 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
