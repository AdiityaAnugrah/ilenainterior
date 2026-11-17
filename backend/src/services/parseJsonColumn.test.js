const parseJsonColumn = require('./parseJsonColumn');

describe('parseJsonColumn', () => {
  test('parses serialized JSON values', () => {
    expect(parseJsonColumn('{"active":true}', {})).toEqual({ active: true });
  });

  test('passes through JSON values already decoded by mysql2', () => {
    const value = { active: true };
    expect(parseJsonColumn(value, {})).toBe(value);
  });

  test('uses the fallback for missing or malformed JSON', () => {
    expect(parseJsonColumn(null, [])).toEqual([]);
    expect(parseJsonColumn('{bad json}', {})).toEqual({});
  });
});
