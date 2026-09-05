import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, MapPin, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ALL_LOCATION_CITIES,
  LOCATION_GROUPS,
  type LocationGroup,
} from '../../../../shared/types';

interface LocationMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * 工作地区多选：参考成熟招聘平台的城市选择器 ——
 * 搜索过滤 + 热门城市 + 按大区分组 + 不在列表中的城市可直接录入。
 */
export function LocationMultiSelect({ value, onChange }: LocationMultiSelectProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');

  const normalizedKeyword: string = keyword.trim().toLowerCase();
  const toggle = (location: string) => {
    onChange(
      value.includes(location)
        ? value.filter((item: string) => item !== location)
        : [...value, location],
    );
  };

  const filteredGroups: LocationGroup[] = useMemo(() => {
    if (!normalizedKeyword) return LOCATION_GROUPS;
    return LOCATION_GROUPS.map((group: LocationGroup) => ({
      ...group,
      cities: group.cities.filter((city: string) =>
        city.toLowerCase().includes(normalizedKeyword),
      ),
    })).filter((group: LocationGroup) => group.cities.length > 0);
  }, [normalizedKeyword]);

  const matchedCities: Set<string> = useMemo(
    () =>
      new Set(
        ALL_LOCATION_CITIES.filter((city: string) =>
          city.toLowerCase().includes(normalizedKeyword),
        ),
      ),
    [normalizedKeyword],
  );
  const canAddCustom: boolean =
    Boolean(keyword.trim()) &&
    !ALL_LOCATION_CITIES.some(
      (city: string) => city.toLowerCase() === normalizedKeyword,
    );

  const addCustom = () => {
    const custom: string = keyword.trim();
    if (!custom) return;
    if (!value.includes(custom)) onChange([...value, custom]);
    setKeyword('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="选择工作地区"
          className="flex min-h-[40px] w-full cursor-pointer items-center gap-1.5 rounded-[10px] border border-border-strong bg-surface-elevated px-2.5 py-1.5 text-left text-sm transition hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-ring"
        >
          {value.length === 0 ? (
            <span className="flex flex-1 items-center gap-1.5 text-foreground-muted">
              <MapPin className="size-3.5" />
              选择工作地区（可多选，支持自定义）
            </span>
          ) : (
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {value.map((location: string) => (
                <span
                  key={location}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary"
                >
                  <span className="max-w-[120px] truncate">{location}</span>
                  <X
                    className="size-3 cursor-pointer opacity-60 hover:opacity-100"
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      toggle(location);
                    }}
                    aria-label={`移除${location}`}
                  />
                </span>
              ))}
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 text-foreground-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(92vw,460px)] flex-col overflow-hidden rounded-2xl border-border p-0"
      >
        <div className="shrink-0 border-b border-border p-3">
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-muted" />
            <input
              value={keyword}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setKeyword(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (canAddCustom) addCustom();
                }
              }}
              placeholder="搜索城市，或输入新城市后回车"
              className="h-9 w-full rounded-[10px] border border-border bg-surface-muted pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:bg-surface-elevated focus:ring-2 focus:ring-ring"
            />
          </div>
          {canAddCustom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8 w-full justify-start"
              onClick={addCustom}
            >
              <Plus />
              添加「{keyword.trim()}」
            </Button>
          )}
        </div>

        <div className="min-h-0 max-h-[320px] overflow-y-auto p-3 [scrollbar-width:thin]">
          {filteredGroups.length === 0 && !canAddCustom && (
            <p className="py-6 text-center text-sm text-foreground-muted">
              没有匹配的城市，可回车直接添加
            </p>
          )}
          {filteredGroups.map((group: LocationGroup) => (
            <section key={group.region} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[11px] font-bold tracking-wide text-foreground-muted">
                {group.region}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.cities.map((city: string) => {
                  const selected: boolean = value.includes(city);
                  const dimmed: boolean =
                    Boolean(normalizedKeyword) && !matchedCities.has(city);
                  return (
                    <button
                      key={`${group.region}-${city}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggle(city)}
                      className={cn(
                        'inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        dimmed && 'opacity-40',
                        selected
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border bg-surface-elevated text-foreground-secondary hover:border-border-strong hover:bg-surface-muted hover:text-foreground',
                      )}
                    >
                      {selected && <Check className="size-3" />}
                      {city}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2">
          <span className="text-[11px] text-foreground-muted">
            已选 {value.length} 个地区
          </span>
          {value.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange([])}
            >
              清空
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
