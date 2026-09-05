import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ListFilter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type StageSortKey =
  | 'manual'
  | 'applied-desc'
  | 'applied-asc'
  | 'stage-desc'
  | 'stage-asc'
  | 'company-desc'
  | 'company-asc';

export interface StageViewSettings {
  pinnedOnly: boolean;
  sortKey: StageSortKey;
}

interface StageColumnControlsProps {
  groupLabel: string;
  settings: StageViewSettings;
  onChange: (settings: StageViewSettings) => void;
}

type StageSortField = 'manual' | 'applied' | 'stage' | 'company';
type StageSortDirection = 'asc' | 'desc';

const SORT_OPTIONS: Array<{ value: StageSortField; label: string }> = [
  { value: 'manual', label: '默认顺序' },
  { value: 'applied', label: '投递时间' },
  { value: 'stage', label: '最新环节时间' },
  { value: 'company', label: '公司名称' },
];
const SORT_DIRECTIONS: StageSortDirection[] = ['desc', 'asc'];
const SORT_KEY_BY_FIELD_DIRECTION: Record<
  Exclude<StageSortField, 'manual'>,
  Record<StageSortDirection, StageSortKey>
> = {
  applied: { asc: 'applied-asc', desc: 'applied-desc' },
  stage: { asc: 'stage-asc', desc: 'stage-desc' },
  company: { asc: 'company-asc', desc: 'company-desc' },
};

function getSortField(sortKey: StageSortKey): StageSortField {
  if (sortKey === 'manual') return 'manual';
  if (sortKey.startsWith('applied-')) return 'applied';
  if (sortKey.startsWith('stage-')) return 'stage';
  return 'company';
}

function getSortDirection(sortKey: StageSortKey): StageSortDirection {
  return sortKey.endsWith('-asc') ? 'asc' : 'desc';
}

function getDirectionLabels(field: StageSortField): {
  asc: string;
  desc: string;
} {
  return field === 'company'
    ? { asc: 'A → Z', desc: 'Z → A' }
    : { asc: '旧 → 新', desc: '新 → 旧' };
}

const iconButtonClassName =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md border ' +
  'border-transparent text-foreground-muted transition-colors hover:bg-surface-muted ' +
  'hover:text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1';

export function StageColumnControls({
  groupLabel,
  settings,
  onChange,
}: StageColumnControlsProps) {
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [sortOpen, setSortOpen] = useState<boolean>(false);
  const [draftPinnedOnly, setDraftPinnedOnly] = useState<boolean>(
    settings.pinnedOnly,
  );

  const handleFilterOpenChange = (open: boolean): void => {
    if (open) setDraftPinnedOnly(settings.pinnedOnly);
    setFilterOpen(open);
  };

  const resetFilter = (): void => {
    setDraftPinnedOnly(false);
    onChange({ ...settings, pinnedOnly: false });
    setFilterOpen(false);
  };

  const applyFilter = (): void => {
    onChange({ ...settings, pinnedOnly: draftPinnedOnly });
    setFilterOpen(false);
  };

  const sortField: StageSortField = getSortField(settings.sortKey);
  const sortDirection: StageSortDirection = getSortDirection(settings.sortKey);
  const directionLabels: { asc: string; desc: string } =
    getDirectionLabels(sortField);
  const sortFieldLabel: string =
    SORT_OPTIONS.find(
      (option: { value: StageSortField; label: string }) =>
        option.value === sortField,
    )?.label || '默认顺序';

  const selectSortField = (field: StageSortField): void => {
    if (field === 'manual') {
      onChange({ ...settings, sortKey: 'manual' });
      setSortOpen(false);
      return;
    }
    const nextDirection: StageSortDirection =
      sortField === field
        ? sortDirection
        : field === 'company'
          ? 'asc'
          : 'desc';
    onChange({
      ...settings,
      sortKey: SORT_KEY_BY_FIELD_DIRECTION[field][nextDirection],
    });
  };

  const selectSortDirection = (direction: StageSortDirection): void => {
    if (sortField === 'manual') return;
    onChange({
      ...settings,
      sortKey: SORT_KEY_BY_FIELD_DIRECTION[sortField][direction],
    });
  };

  return (
    <div className="flex h-8 shrink-0 items-center gap-1">
      <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              iconButtonClassName,
              settings.pinnedOnly &&
                'border-primary bg-primary-soft text-primary hover:bg-primary-soft',
            )}
            aria-label={`${groupLabel}筛选${
              settings.pinnedOnly ? '，已启用仅看重点投递' : ''
            }`}
            aria-pressed={settings.pinnedOnly}
            title={`${groupLabel}筛选`}
          >
            <ListFilter className="size-3.5" strokeWidth={1.9} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="w-56 rounded-xl border-border p-3 shadow-xl"
        >
          <div className="text-sm font-bold text-foreground">筛选</div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground-secondary hover:bg-surface-muted">
            <Checkbox
              checked={draftPinnedOnly}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setDraftPinnedOnly(checked === true)
              }
            />
            <span>仅看重点投递</span>
          </label>
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilter}
            >
              重置
            </Button>
            <Button type="button" size="sm" onClick={applyFilter}>
              应用
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              iconButtonClassName,
              settings.sortKey !== 'manual' &&
                'border-primary bg-primary-soft text-primary hover:bg-primary-soft',
            )}
            aria-label={`${groupLabel}排序${
              sortField === 'manual'
                ? ''
                : `，${sortFieldLabel}，${directionLabels[sortDirection]}`
            }`}
            aria-pressed={settings.sortKey !== 'manual'}
            title={`${groupLabel}排序`}
          >
            <ArrowUpDown className="size-3.5" strokeWidth={1.9} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="w-56 rounded-xl border-border p-2 shadow-xl"
        >
          <div className="px-2 pb-1.5 pt-1 text-sm font-bold text-foreground">
            排序
          </div>
          <div className="space-y-0.5">
            {SORT_OPTIONS.map(
              (option: { value: StageSortField; label: string }) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                    sortField === option.value
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'text-foreground-secondary hover:bg-surface-muted',
                  )}
                  onClick={() => selectSortField(option.value)}
                >
                  <span>{option.label}</span>
                  {sortField === option.value && (
                    <Check className="size-3.5 shrink-0" />
                  )}
                </button>
              ),
            )}
          </div>
          {sortField !== 'manual' && (
            <div className="mt-2 border-t border-border px-2 pb-1 pt-3">
              <div className="mb-2 text-xs font-medium text-foreground-muted">
                排列方向
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1">
                {SORT_DIRECTIONS.map((direction: StageSortDirection) => (
                  <button
                    key={direction}
                    type="button"
                    className={cn(
                      'flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                      sortDirection === direction
                        ? 'bg-surface-elevated text-primary shadow-sm'
                        : 'text-foreground-muted hover:text-foreground-secondary',
                    )}
                    onClick={() => selectSortDirection(direction)}
                    aria-pressed={sortDirection === direction}
                  >
                    {direction === 'desc' ? (
                      <ArrowDown className="size-3.5" />
                    ) : (
                      <ArrowUp className="size-3.5" />
                    )}
                    <span>{directionLabels[direction]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}


