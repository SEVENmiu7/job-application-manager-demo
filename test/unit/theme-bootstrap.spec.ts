import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';

const html = readFileSync(
  resolve(__dirname, '../../client/index.html'),
  'utf8',
);
const script = html
  .match(/<script>\s*\/\/ 首屏[\s\S]*?<\/script>/)?.[0]
  .replace(/^<script>|<\/script>$/g, '');

function bootstrap(
  mode: string | null,
  accent: string | null,
  systemDark: boolean,
  blocked = false,
) {
  const classes = new Set<string>();
  const attributes: Record<string, string> = {};
  const style: Record<string, string> = {};
  runInNewContext(script || '', {
    localStorage: {
      getItem: (key: string) => {
        if (blocked) throw new Error('blocked');
        return key === 'qz-theme' ? mode : accent;
      },
      removeItem: jest.fn(),
    },
    window: { matchMedia: () => ({ matches: systemDark }) },
    document: {
      documentElement: {
        classList: {
          remove: (...values: string[]) =>
            values.forEach((value) => classes.delete(value)),
          add: (value: string) => classes.add(value),
        },
        style,
        setAttribute: (key: string, value: string) => {
          attributes[key] = value;
        },
      },
    },
  });
  return {
    classes: [...classes],
    accent: attributes['data-accent'],
    scheme: style.colorScheme,
  };
}

describe('theme first paint', () => {
  it('locates the actual production bootstrap', () =>
    expect(script).toBeTruthy());
  it.each(['original', 'jade', 'ocean', 'indigo', 'graphite'])(
    'preserves %s independently in dark mode',
    (accent) => {
      expect(bootstrap('dark', accent, false)).toEqual({
        classes: ['dark'],
        accent,
        scheme: 'dark',
      });
    },
  );
  it('uses original + system by default', () =>
    expect(bootstrap(null, null, true)).toEqual({
      classes: ['dark'],
      accent: 'original',
      scheme: 'dark',
    }));
  it('resolves explicitly saved system mode before paint', () =>
    expect(bootstrap('system', 'ocean', true).scheme).toBe('dark'));
  it('honors explicit light despite a dark OS', () =>
    expect(bootstrap('light', 'original', true).scheme).toBe('light'));
  it('recovers invalid stored values', () =>
    expect(bootstrap('invalid', 'invalid', false)).toEqual({
      classes: ['light'],
      accent: 'original',
      scheme: 'light',
    }));
  it('still resolves system when storage throws', () =>
    expect(bootstrap(null, null, true, true).scheme).toBe('dark'));
});


