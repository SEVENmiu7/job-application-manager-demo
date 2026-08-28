import { Check, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LocationMultiSelectProps {
  value: string[];
  options: readonly string[];
  onChange: (value: string[]) => void;
}

export function LocationMultiSelect({
  value,
  options,
  onChange,
}: LocationMultiSelectProps) {
  const toggle = (location: string) => {
    onChange(
      value.includes(location)
        ? value.filter((item: string) => item !== location)
        : [...value, location],
    );
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="工作地区">
      {options.map((location: string) => {
        const selected: boolean = value.includes(location);
        return (
          <button
            key={location}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(location)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30',
              selected
                ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
            )}
          >
            {selected ? (
              <Check className="size-3.5" />
            ) : (
              <MapPin className="size-3.5" />
            )}
            {location}
          </button>
        );
      })}
    </div>
  );
}
