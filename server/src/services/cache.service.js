const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { CACHE_TTL_DAYS } = require('../config/constants');

const CACHE_DIR = path.join(__dirname, '../../cache');

function _ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheKey(templateId, name) {
  const sanitized = name.replace(/[^a-zA-Z0-9\u0590-\u05FF\u0600-\u06FF_-]/g, '_');
  return `${templateId}_${sanitized}`;
}

function _getCachePath(templateId, name) {
  return path.join(CACHE_DIR, getCacheKey(templateId, name));
}

function get(templateId, name) {
  const cachePath = _getCachePath(templateId, name);
  if (!fs.existsSync(cachePath)) return null;

  const stat = fs.statSync(cachePath);
  const ageMs = Date.now() - stat.mtimeMs;
  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

  if (ageMs > ttlMs) {
    fs.unlinkSync(cachePath);
    return null;
  }

  return cachePath;
}

function set(templateId, name, imagePath) {
  _ensureCacheDir();
  const cachePath = _getCachePath(templateId, name);
  fs.copyFileSync(imagePath, cachePath);
  logger.info(`Cached image: ${cachePath}`);
  return cachePath;
}

function clear() {
  if (!fs.existsSync(CACHE_DIR)) return;
  const files = fs.readdirSync(CACHE_DIR);
  for (const file of files) {
    fs.unlinkSync(path.join(CACHE_DIR, file));
  }
  logger.info(`Cache cleared: ${files.length} files removed`);
}

function clearExpired() {
  if (!fs.existsSync(CACHE_DIR)) return;
  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(CACHE_DIR);
  let removed = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const stat = fs.statSync(filePath);
    if (Date.now() - stat.mtimeMs > ttlMs) {
      fs.unlinkSync(filePath);
      removed++;
    }
  }

  if (removed > 0) {
    logger.info(`Cache cleanup: ${removed} expired files removed`);
  }
}

module.exports = { getCacheKey, get, set, clear, clearExpired };
