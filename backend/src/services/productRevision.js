const { createHash } = require('crypto');

const REVISION_FIELDS = [
  'id',
  'sku',
  'name',
  'category',
  'description',
  'price',
  'dimensions',
  'thumbnail',
  'model_3d',
  'model_2d_topdown',
  'tags',
  'stock',
  'is_active',
];

function productRevision(product) {
  const snapshot = REVISION_FIELDS.map((field) => product[field] ?? null);
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

module.exports = { productRevision };
