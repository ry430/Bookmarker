const { uid, domn, fav, validHex, adj } = require('../src/logic');

describe('uid', () => {
  test('returns a non-empty string', () => {
    expect(typeof uid()).toBe('string');
    expect(uid().length).toBeGreaterThan(0);
  });

  test('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe('domn', () => {
  test('extracts hostname from valid URLs', () => {
    expect(domn('https://github.com')).toBe('github.com');
    expect(domn('https://www.google.com/search?q=test')).toBe('www.google.com');
    expect(domn('http://localhost:3000')).toBe('localhost');
  });

  test('returns empty string for invalid URLs', () => {
    expect(domn('')).toBe('');
    expect(domn('not-a-url')).toBe('');
    expect(domn(undefined)).toBe('');
  });
});

describe('fav', () => {
  test('generates Google favicon URL for valid URLs', () => {
    expect(fav('https://github.com')).toBe(
      'https://www.google.com/s2/favicons?domain=github.com&sz=64'
    );
  });

  test('returns empty string for invalid URLs', () => {
    expect(fav('')).toBe('');
    expect(fav('bad')).toBe('');
  });
});

describe('validHex', () => {
  test('accepts valid 6-digit hex colors', () => {
    expect(validHex('#000000')).toBe(true);
    expect(validHex('#FFFFFF')).toBe(true);
    expect(validHex('#1E1E2D')).toBe(true);
    expect(validHex('#abcdef')).toBe(true);
  });

  test('rejects invalid hex strings', () => {
    expect(validHex('#FFF')).toBe(false);
    expect(validHex('000000')).toBe(false);
    expect(validHex('#GGGGGG')).toBe(false);
    expect(validHex('')).toBe(false);
    expect(validHex('#1234567')).toBe(false);
  });
});

describe('adj', () => {
  test('lightens a color with positive delta', () => {
    expect(adj('#000000', 10)).toBe('#0a0a0a');
  });

  test('darkens a color with negative delta', () => {
    expect(adj('#1E1E2D', -5)).toBe('#191928');
  });

  test('clamps to 0 (does not go below #000000)', () => {
    expect(adj('#050505', -10)).toBe('#000000');
  });

  test('clamps to 255 (does not exceed #ffffff)', () => {
    expect(adj('#fafafa', 10)).toBe('#ffffff');
  });

  test('handles mid-range colors', () => {
    expect(adj('#808080', 16)).toBe('#909090');
    expect(adj('#808080', -16)).toBe('#707070');
  });
});
