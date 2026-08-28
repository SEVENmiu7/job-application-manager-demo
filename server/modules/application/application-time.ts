const CHINA_TIME_ZONE_OFFSET = '+08:00';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

function hasExplicitTimeZone(value: string): boolean {
  return /[T ]\d{2}:\d{2}/.test(value) && TIME_ZONE_SUFFIX_PATTERN.test(value);
}

function toIsoString(value: string): string | null {
  const date: Date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Parse user-entered timestamps in China Standard Time without consulting the
 * server's local timezone. Values that already include an offset keep their
 * original instant; date-only and offset-less values are always UTC+8.
 */
export function parseChinaTimestamp(value: string): string | null {
  const trimmedValue: string = value.trim();
  if (!trimmedValue) return null;
  if (hasExplicitTimeZone(trimmedValue)) {
    return toIsoString(trimmedValue);
  }

  const localValue: string = DATE_ONLY_PATTERN.test(trimmedValue)
    ? `${trimmedValue}T00:00:00`
    : trimmedValue.replace(' ', 'T');
  return toIsoString(`${localValue}${CHINA_TIME_ZONE_OFFSET}`);
}

/**
 * PostgreSQL stores these columns as timestamp without time zone. The service
 * writes UTC clock components, so an offset-less value read back from the
 * database must be qualified as UTC before it crosses the API boundary.
 */
export function serializeStoredTimestamp(
  value: string | null,
): string | undefined {
  if (!value) return undefined;
  const trimmedValue: string = value.trim();
  const utcValue: string = hasExplicitTimeZone(trimmedValue)
    ? trimmedValue
    : `${trimmedValue.replace(' ', 'T')}Z`;
  return toIsoString(utcValue) || undefined;
}
