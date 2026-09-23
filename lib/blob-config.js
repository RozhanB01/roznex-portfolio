function findEnvKey(suffix, preferredPrefix = 'ROZNEX') {
  const keys = Object.keys(process.env);

  const preferred = [
    preferredPrefix + '_' + suffix,
    preferredPrefix + suffix,
    suffix
  ];

  for (const key of preferred) {
    if (process.env[key]) return key;
  }

  const prefixed = keys.find(key =>
    key.toUpperCase().startsWith(preferredPrefix) &&
    key.toUpperCase().endsWith(suffix) &&
    process.env[key]
  );
  if (prefixed) return prefixed;

  return keys.find(key => key.toUpperCase().endsWith(suffix) && process.env[key]) || '';
}

function getBlobTokenKey() {
  return findEnvKey('BLOB_READ_WRITE_TOKEN');
}

function getBlobStoreIdKey() {
  return findEnvKey('BLOB_STORE_ID');
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
