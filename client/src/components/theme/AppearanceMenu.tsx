import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ACCENT_OPTIONS, useAccent } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

type AppearanceMode = 'system' | 'light' | 'dark';

const APPEARANCE_OPTIONS: {
  value: AppearanceMode;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
];

/** 侧边栏底部的紧凑外观入口：上半选外观模式，下半选品牌配色。 */
export function AppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const currentMode: AppearanceMode =
    theme === 'light' || theme === 'dark' ? theme : 'system';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label="外观"
          variant="outline"
          className="appearance-trigger w-full justify-start gap-2 border-border bg-surface-elevated text-foreground-secondary hover:bg-surface-elevated "
        >
          <Palette className="size-4" />
          <span className="appearance-label">外观</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        collisionPadding={12}
        className="w-64 max-w-[calc(100vw-24px)] max-h-[calc(100dvh-32px)] overflow-y-auto space-y-3 p-3"
      >
        <section aria-label="外观模式">
          <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">
            外观模式
          </p>
          <div className="space-y-1">
            {APPEARANCE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active: boolean = option.value === currentMode;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-primary/60 bg-primary-soft font-semibold text-primary'
                      : 'border-transparent text-foreground-secondary hover:bg-muted',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1 text-left">{option.label}</span>
                  {active && <Check className="size-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>
        <section aria-label="品牌配色" className="border-t border-border pt-3">
          <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">
            品牌配色
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ACCENT_OPTIONS.map((option) => {
              const active: boolean = option.value === accent;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccent(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-primary/60 bg-primary-soft font-semibold text-primary'
                      : 'border-border text-foreground-secondary hover:bg-muted',
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full ring-1 ring-border-strong"
                    style={{ background: option.swatch }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-left">
                    {option.label}
                  </span>
                  {active && <Check className="size-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}


