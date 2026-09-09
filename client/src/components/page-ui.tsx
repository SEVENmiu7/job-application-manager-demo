import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * 四个核心页面共用的视觉语言：
 * - PageHeader：紧凑玻璃页头（28px/700 标题）
 * - StatTintCard：极浅状态色统计卡
 * - SegmentedControl：看板/列表等分段切换
 * - CompactStepper：横向紧凑步骤条
 * - SectionTitle：16px/600 分区标题
 */

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  leading,
  actions,
}: PageHeaderProps) {
  return (
    <header className="glass-panel relative overflow-hidden px-5 py-4 md:px-6">
      <span className="glass-sheen" aria-hidden="true" />
      <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {leading && <div className="shrink-0">{leading}</div>}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-[0.14em] text-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-0.5 truncate text-[28px] font-bold leading-tight tracking-[-0.02em] text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm leading-6 text-foreground-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

type TintTone = 'slate' | 'blue' | 'purple' | 'teal' | 'green' | 'red';

const TINT_STYLES: Record<TintTone, { surface: string; icon: string }> = {
  slate: {
    surface: 'border-border bg-surface-muted',
    icon: 'bg-surface-muted text-foreground-secondary',
  },
  blue: {
    surface: 'border-blue-200/60 bg-blue-50/70',
    icon: 'bg-blue-100 text-blue-600',
  },
  purple: {
    surface: 'border-purple-200/60 bg-purple-50/70',
    icon: 'bg-purple-100 text-purple-600',
  },
  teal: {
    surface: 'border-teal-200/60 bg-teal-50/70',
    icon: 'bg-teal-100 text-teal-700',
  },
  green: {
    surface: 'border-emerald-200/60 bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  red: {
    surface: 'border-red-200/60 bg-red-50/70',
    icon: 'bg-red-100 text-red-500',
  },
};

interface StatTintCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: TintTone;
}

export function StatTintCard({
  label,
  value,
  icon,
  tone = 'slate',
}: StatTintCardProps) {
  const styles = TINT_STYLES[tone];
  return (
    <div
      className={cn(
        'flex min-w-[96px] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5',
        styles.surface,
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4',
            styles.icon,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-foreground-muted">
          {label}
        </div>
        <div className="text-xl font-bold leading-tight tabular-nums text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-surface-muted p-0.5"
    >
      {options.map((option) => {
        const active: boolean = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm'
                ? 'min-h-7 px-2.5 text-xs'
                : 'min-h-8 px-3 text-[13px]',
              active
                ? 'bg-surface-elevated text-foreground shadow-[var(--shadow)]'
                : 'text-foreground-muted hover:bg-surface-elevated/60 hover:text-foreground',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface CompactStepperProps {
  steps: { label: string; hint?: string }[];
  activeIndex?: number;
  onStepClick?: (index: number) => void;
}

export function CompactStepper({
  steps,
  activeIndex,
  onStepClick,
}: CompactStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-y-1" aria-label="流程步骤">
      {steps.map((step, index: number) => {
        const active: boolean = activeIndex === index;
        const done: boolean = activeIndex !== undefined && index < activeIndex;
        return (
          <li key={step.label} className="flex items-center">
            {index > 0 && (
              <span
                className={cn(
                  'mx-2 h-px w-6 sm:w-8',
                  done ? 'bg-primary' : 'bg-surface-muted',
                )}
                aria-hidden="true"
              />
            )}
            {onStepClick ? (
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => onStepClick(index)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <StepperContent
                  index={index}
                  label={step.label}
                  hint={step.hint}
                  active={active}
                  done={done}
                />
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1"
                aria-current={active ? 'step' : undefined}
              >
                <StepperContent
                  index={index}
                  label={step.label}
                  hint={step.hint}
                  active={active}
                  done={done}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepperContent({
  index,
  label,
  hint,
  active,
  done,
}: {
  index: number;
  label: string;
  hint?: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
          active
            ? 'bg-primary text-primary-foreground'
            : done
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-muted text-foreground-muted',
        )}
      >
        {index + 1}
      </span>
      <span
        className={cn(
          'text-[13px] font-semibold transition-colors',
          active ? 'text-primary' : 'text-foreground-secondary',
        )}
      >
        {label}
      </span>
      {hint && (
        <span className="hidden text-xs text-foreground-muted sm:inline">
          {hint}
        </span>
      )}
    </>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}
