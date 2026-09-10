import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, LoaderCircle, Milestone, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateTimePicker } from '@/components/application/DateTimePicker';
import {
  PROCESS_TIME_STAGES,
  type ApplicationProcessStage,
  type ApplicationProcessTimes,
} from '@shared/types';
import {
  formatApplicationTime,
  toDatetimeLocalValue,
  toUtcTimestamp,
} from '@/lib/application-time';
import { cn } from '@/lib/utils';

interface ApplicationProcessTimelineProps {
  value?: ApplicationProcessTimes;
  currentStatus?: string;
  compact?: boolean;
  disabled?: boolean;
  onSave: (value: ApplicationProcessTimes) => Promise<boolean | void>;
}

const EMPTY_PROCESS_TIMES: ApplicationProcessTimes = {};

export function ApplicationProcessTimeline({
  value,
  currentStatus,
  compact = false,
  disabled = false,
  onSave,
}: ApplicationProcessTimelineProps) {
  const processTimes: ApplicationProcessTimes = value || EMPTY_PROCESS_TIMES;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<ApplicationProcessStage, string>>(
    () =>
      Object.fromEntries(
        PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => [
          stage,
          toDatetimeLocalValue(processTimes[stage], true),
        ]),
      ) as Record<ApplicationProcessStage, string>,
  );

  useEffect(() => {
    if (!open) {
      setDraft(
        Object.fromEntries(
          PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => [
            stage,
            toDatetimeLocalValue(processTimes[stage], true),
          ]),
        ) as Record<ApplicationProcessStage, string>,
      );
    }
  }, [open, processTimes]);

  const recordedStages: ApplicationProcessStage[] = useMemo(
    () =>
      PROCESS_TIME_STAGES.filter((stage: ApplicationProcessStage) =>
        Boolean(processTimes[stage]),
      ),
    [processTimes],
  );
  const focusStage: ApplicationProcessStage | undefined =
    PROCESS_TIME_STAGES.includes(currentStatus as ApplicationProcessStage)
      ? (currentStatus as ApplicationProcessStage)
      : recordedStages.at(-1);

  const save = async () => {
    const nextValue: ApplicationProcessTimes = {};
    for (const stage of PROCESS_TIME_STAGES) {
      const originalTime: string = processTimes[stage] || '';
      const time: string =
        draft[stage] === toDatetimeLocalValue(originalTime, true)
          ? originalTime
          : toUtcTimestamp(draft[stage]);
      if (time) nextValue[stage] = time;
    }
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
            'inline-flex min-w-0 items-center gap-1.5 rounded-md text-left text-xs text-foreground-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
            compact
              ? 'max-w-full'
              : 'rounded-lg border border-border bg-surface-muted px-2.5 py-2',
          )}
          aria-label="编辑流程时间"
          title="单击记录测评与各轮面试时间"
        >
          <Milestone className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {focusStage && processTimes[focusStage]
              ? `${focusStage} · ${formatApplicationTime(processTimes[focusStage])}`
              : recordedStages.length
                ? `已记录 ${recordedStages.length} 个流程节点`
                : '记录测评 / 面试时间'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(92vw,430px)] rounded-2xl border-border p-0 shadow-2xl"
      >
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <CalendarClock className="size-4 text-primary" />
            流程时间轴
          </div>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            只记录实际发生或已约定的节点；手动时间始终保留为基准。
          </p>
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto p-4">
          {PROCESS_TIME_STAGES.map(
            (stage: ApplicationProcessStage, index: number) => (
              <div
                key={stage}
                className="grid grid-cols-[72px_1fr] items-center gap-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground-secondary">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      draft[stage] ? 'bg-primary' : 'bg-surface-muted',
                    )}
                  />
                  {stage}
                  {index < PROCESS_TIME_STAGES.length - 1 && (
                    <span className="sr-only">之后</span>
                  )}
                </div>
                <DateTimePicker
                  size="sm"
                  value={draft[stage]}
                  placeholder="选择时间"
                  onChange={(next: string) =>
                    setDraft((current) => ({
                      ...current,
                      [stage]: next,
                    }))
                  }
                />
              </div>
            ),
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-[11px] text-foreground-muted">
            Asia/Shanghai · UTC+8
          </span>
          <div className="flex gap-1.5">
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
