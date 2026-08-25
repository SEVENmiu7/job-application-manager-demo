const APPLICATION_TIME_ZONE = 'Asia/Shanghai';

export function parseApplicationTime(value?: string | null): Date | null {
  if (!value) return null;
  const normalizedValue: string = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasRecordedClockTime(value: string): boolean {
  const match: RegExpMatchArray | null = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return false;
  return match[2] !== '00' || (match[3] || '00') !== '00';
}

export function formatApplicationTime(value?: string | null): string {
  const date: Date | null = parseApplicationTime(value);
  if (!date) return '时间未记录';
  if (!hasRecordedClockTime(value || '')) {
    const calendarDate: string = date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      timeZone: APPLICATION_TIME_ZONE,
    });
    return `${calendarDate}（未记录具体时间）`;
  }
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: APPLICATION_TIME_ZONE,
  });
}

export function formatRelativeApplicationTime(
  value?: string | null,
  now: number = Date.now(),
): string {
  const date: Date | null = parseApplicationTime(value);
  if (!date) return '时间未记录';
  const elapsedSeconds: number = Math.max(
    0,
    Math.floor((now - date.getTime()) / 1000),
  );
  if (elapsedSeconds < 60) return '刚刚';
  const elapsedMinutes: number = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes} 分钟前`;
  const elapsedHours: number = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} 小时前`;
  return formatApplicationTime(value);
}

export function toDatetimeLocalValue(value?: string | null): string {
  const date: Date | null = parseApplicationTime(value);
  if (!date) return '';
  const parts: Intl.DateTimeFormatPart[] = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: APPLICATION_TIME_ZONE,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item: Intl.DateTimeFormatPart) => item.type === type)?.value ||
    '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function toUtcTimestamp(value?: string | null): string {
  if (!value) return '';
  if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value)) {
    return new Date(value).toISOString();
  }
  const localValue: string = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00`
    : value.includes('T')
      ? value
      : `${value}T00:00:00`;
  const normalizedValue: string = `${localValue}+08:00`;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
