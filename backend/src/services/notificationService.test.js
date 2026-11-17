const NotificationService = require('./notificationService');

function createService(queryResults) {
  const conn = {
    query: jest.fn(),
    release: jest.fn(),
  };
  queryResults.forEach(result => conn.query.mockResolvedValueOnce(result));
  const pool = { getConnection: jest.fn().mockResolvedValue(conn) };
  const io = { sockets: { adapter: { rooms: new Map() } }, to: jest.fn() };
  return { service: new NotificationService(io, pool), conn };
}

describe('NotificationService production data handling', () => {
  test.each([
    ['mysql2 parsed JSON object', { product_id: 12 }],
    ['JSON string', '{"product_id":12}'],
  ])('returns metadata from %s without throwing', async (_label, metadata) => {
    const { service, conn } = createService([
      [[{ id: 1, metadata, is_read: 0 }]],
      [[{ total: 1 }]],
    ]);

    const result = await service.getNotifications(7);

    expect(result.data[0].metadata).toEqual({ product_id: 12 });
    expect(result.data[0].is_read).toBe(false);
    expect(result.total).toBe(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  test('marks unread notifications with explicit INSERT SELECT columns', async () => {
    const { service, conn } = createService([[{ affectedRows: 2 }]]);

    await expect(service.markAllAsRead(7)).resolves.toBe(0);

    expect(conn.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)\n         SELECT n.id, ?, NOW()'),
      [7, 7]
    );
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
});
