const { createHash } = require('crypto');

function normalizedRoomConfig(value) {
  if (typeof value !== 'string') return value ?? {};
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizedLegacyItems(items) {
  return (items || []).slice().sort((a, b) => Number(a.id) - Number(b.id)).map((item) => [
    String(item.id),
    Number(item.product_id),
    item.variant_id == null ? null : Number(item.variant_id),
    typeof item.position === 'string' ? JSON.parse(item.position || '{}') : item.position ?? {},
    Number(item.rotation) || 0,
    Number(item.scale) || 1,
  ]);
}

function projectRevision(project, legacyItems = []) {
  const roomConfig = normalizedRoomConfig(project.room_config);
  const embeddedItems = Array.isArray(roomConfig?.items);
  const snapshot = [
    String(project.id),
    project.name ?? null,
    project.room_type ?? null,
    roomConfig,
    project.thumbnail ?? null,
    embeddedItems ? null : normalizedLegacyItems(legacyItems),
  ];
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

module.exports = { projectRevision };
