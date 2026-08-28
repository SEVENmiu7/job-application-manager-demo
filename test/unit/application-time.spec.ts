import {
  parseApplicationTime,
  toUtcTimestamp,
} from '../../client/src/lib/application-time';

describe('client application time conversion', () => {
  it('treats a date-only value as China Standard Time', () => {
    expect(toUtcTimestamp('2026-08-27')).toBe('2026-08-26T16:00:00.000Z');
  });

  it('keeps an explicitly qualified UTC timestamp unchanged', () => {
    expect(toUtcTimestamp('2026-08-27T01:30:00.000Z')).toBe(
      '2026-08-27T01:30:00.000Z',
    );
  });

  it('does not mistake a calendar day for a timezone suffix', () => {
    expect(parseApplicationTime('2026-08-27')?.toISOString()).toBe(
      '2026-08-27T00:00:00.000Z',
    );
  });
});
