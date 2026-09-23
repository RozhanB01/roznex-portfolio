function getBlobToken() {
  return process.env.ROZNEX_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
}

function getBlobStoreId() {
  return process.env.ROZNEX_BLOB_STORE_ID || process.env.BLOB_STORE_ID || '';
}

function hasBlobStorage() {
  return Boolean(getBlobToken());
}

function blobOptions(extra = {}) {
  const token = getBlobToken();
  return token ? { ...extra, token } : { ...extra };
}

module.exports = {
  getBlobToken,
  getBlobStoreId,
  hasBlobStorage,
  blobOptions
};
