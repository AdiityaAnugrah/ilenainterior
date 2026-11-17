const APICacheManager = require('./CacheManager');

module.exports = {
  products: new APICacheManager({ defaultTTL: 300000, maxSize: 200, enableStats: true }),
  wallpapers: new APICacheManager({ defaultTTL: 300000, maxSize: 200, enableStats: true }),
};
