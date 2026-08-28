import {
  parseChinaTimestamp,
  serializeStoredTimestamp,
} from '../../server/modules/application/application-time';

describe('server application time conversion', () => {
  it('parses an offset-less date in China Standard Time', () => {
    expect(parseChinaTimestamp('2026-08-27')).toBe('2026-08-26T16:00:00.000Z');
  });

  it('parses an offset-less clock time in China Standard Time', () => {
    expect(parseChinaTimestamp('2026-08-27T09:30')).toBe(
      '2026-08-27T01:30:00.000Z',
    );
  });

  it('does not depend on the server timezone for stored timestamps', () => {
    expect(serializeStoredTimestamp('2026-08-27 01:30:00')).toBe(
      '2026-08-27T01:30:00.000Z',
    );
  });

  it('does not drift when a timestamp is read and submitted repeatedly', () => {
    const originalValue: string = '2026-08-27T01:30:00.000Z';
    const firstRead: string | undefined = serializeStoredTimestamp(
      '2026-08-27 01:30:00',
    );
    const firstWrite: string | null = parseChinaTimestamp(firstRead || '');
    const secondWrite: string | null = parseChinaTimestamp(firstWrite || '');

    expect(firstRead).toBe(originalValue);
    expect(firstWrite).toBe(originalValue);
    expect(secondWrite).toBe(originalValue);
  });
});
