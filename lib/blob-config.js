function firstExisting(keys) {
  for (const key of keys) {
    if (key && process.env[key]) return key;
  }
  return '';
}

function findEnvKeyBySuffix(suffixes, preferredPrefix = 'ROZNEX') {
  const normalized = Array.isArray(suffixes) ? suffixes : [suffixes];
  const keys = Object.keys(process.env);

  const preferred = [];
  for (const suffix of normalized) {
    preferred.push(
      preferredPrefix + '_' + suffix,
      preferredPrefix + suffix,
      suffix
    );
  }

  const direct = firstExisting(preferred);
  if (direct) return direct;

  const prefixed = keys.find(key => {
    const upper = key.toUpperCase();
    return (
      upper.startsWith(preferredPrefix + '_') &&
      normalized.some(suffix => upper.endsWith(suffix)) &&
      process.env[key]
    );
  });
  if (prefixed) return prefixed;

  return keys.find(key => {
    const upper = key.toUpperCase();
    return normalized.some(suffix => upper.endsWith(suffix)) && process.env[key];
  }) || '';
}

function getBlobTokenKey() {
  return firstExisting([
    'ROZNEX_READ_WRITE_TOKEN',
    'ROZNEX_BLOB_READ_WRITE_TOKEN',
    'BLOB_READ_WRITE_TOKEN'
  ]) || findEnvKeyBySuffix(['READ_WRITE_TOKEN', 'BLOB_READ_WRITE_TOKEN']);
}

function getBlobStoreIdKey() {
  return firstExisting([
    'ROZNEX_STORE_ID',
    'ROZNEX_BLOB_STORE_ID',
    'BLOB_STORE_ID'
  ]) || findEnvKeyBySuffix(['STORE_ID', 'BLOB_STORE_ID']);
}

function getBlobToken() {
  const key = getBlobTokenKey();
  return key ? process.env[key] || '' : '';
}

function getBlobStoreId() {
  const key = getBlobStoreIdKey();
  return key ? process.env[key] || '' : '';
}

function hasBlobStorage() {
  return Boolean(getBlobToken());
}

function blobOptions(extra = {}) {
  const token = getBlobToken();
  return token ? { ...extra, token } : { ...extra };
}

module.exports = {
  getBlobTokenKey,
  getBlobStoreIdKey,
  getBlobToken,
  getBlobStoreId,
  hasBlobStorage,
  blobOptions
};
