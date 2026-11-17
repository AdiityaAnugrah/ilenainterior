jest.mock('../config/db', () => ({ execute: jest.fn() }));

const queryOptimizer = require('./QueryOptimizer');

describe('QueryOptimizer slow-query log', () => {
  let warn;

  beforeEach(() => {
    queryOptimizer.clearSlowQueryLog();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  test('redacts string and object parameters from the retained log and console', () => {
    queryOptimizer.logSlowQuery('SELECT * FROM users WHERE email = ?', 1200, ['person@example.test', { secret: 'fixture' }, 7, null, false]);

    const [entry] = queryOptimizer.getSlowQueries();
    expect(entry.params).toEqual(['[REDACTED]', '[REDACTED]', 7, null, false]);
    expect(JSON.stringify(entry)).not.toContain('person@example.test');
    expect(JSON.stringify(entry)).not.toContain('fixture');
    expect(warn.mock.calls.flat().join(' ')).not.toContain('person@example.test');
  });

  test('keeps a bounded ring of the latest 100 slow queries', () => {
    for (let i = 0; i < 105; i += 1) {
      queryOptimizer.logSlowQuery(`SELECT ${i}`, 1001, []);
    }

    const entries = queryOptimizer.getSlowQueries();
    expect(entries).toHaveLength(100);
    expect(entries[0].sql).toBe('SELECT 5');
    expect(entries[99].sql).toBe('SELECT 104');
  });

  test('logs only safe metadata when a query fails', async () => {
    const error = Object.assign(new Error('bad value customer@example.test'), {
      code: 'ER_PARSE_ERROR',
      sql: 'SELECT customer@example.test',
    });
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    queryOptimizer.pool.execute.mockRejectedValueOnce(error);

    await expect(queryOptimizer.execute(
      'SELECT email FROM users WHERE email = ?',
      ['customer@example.test']
    )).rejects.toBe(error);

    const logged = errorLog.mock.calls.flat().join(' ');
    expect(logged).toContain('ER_PARSE_ERROR');
    expect(logged).not.toContain('customer@example.test');
    expect(logged).not.toContain('SELECT email FROM users');
    errorLog.mockRestore();
  });
});
