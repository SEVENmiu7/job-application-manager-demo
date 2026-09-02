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
          className="flex min-h-[40px] w-full cursor-pointer items-center gap-1.5 rounded-[10px] border border-slate-300/60 bg-white/85 px-2.5 py-1.5 text-left text-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-500/20 data-[state=open]:border-teal-500 data-[state=open]:ring-[3px] data-[state=open]:ring-teal-500/20"
        >
          {value.length === 0 ? (
            <span className="flex flex-1 items-center gap-1.5 text-slate-400">
              <MapPin className="size-3.5" />
              选择工作地区（可多选，支持自定义）
            </span>
          ) : (
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {value.map((location: string) => (
                <span
                  key={location}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-800"
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
          <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(92vw,460px)] rounded-2xl border-slate-200 p-0"
      >
        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
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
              className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-[3px] focus:ring-teal-500/20"
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

        <div className="max-h-[320px] overflow-y-auto p-3 [scrollbar-width:thin]">
          {filteredGroups.length === 0 && !canAddCustom && (
            <p className="py-6 text-center text-sm text-slate-400">
              没有匹配的城市，可回车直接添加
            </p>
          )}
          {filteredGroups.map((group: LocationGroup) => (
            <section key={group.region} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[11px] font-bold tracking-wide text-slate-400">
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
                        'inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30',
                        dimmed && 'opacity-40',
                        selected
                          ? 'border-teal-300 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
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

        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <span className="text-[11px] text-slate-400">
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
