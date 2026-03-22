const EVENT_TYPES = {
  shabbat: { greeting: '\u05E9\u05D1\u05EA \u05E9\u05DC\u05D5\u05DD', emoji: '\u2721\uFE0F' },
  rosh_hashana: { greeting: '\u05E9\u05E0\u05D4 \u05D8\u05D5\u05D1\u05D4', emoji: '\uD83C\uDF4F' },
  yom_kippur: { greeting: '\u05D2\u05DE\u05E8 \u05D7\u05EA\u05D9\u05DE\u05D4 \u05D8\u05D5\u05D1\u05D4', emoji: '\uD83D\uDD4A\uFE0F' },
  sukkot: { greeting: '\u05D7\u05D2 \u05E1\u05D5\u05DB\u05D5\u05EA \u05E9\u05DE\u05D7', emoji: '\uD83C\uDF3F' },
  simchat_torah: { greeting: '\u05D7\u05D2 \u05E9\u05DE\u05D7\u05EA \u05EA\u05D5\u05E8\u05D4 \u05E9\u05DE\u05D7', emoji: '\uD83D\uDCDC' },
  chanukah: { greeting: '\u05D7\u05E0\u05D5\u05DB\u05D4 \u05E9\u05DE\u05D7', emoji: '\uD83D\uDD4E' },
  purim: { greeting: '\u05E4\u05D5\u05E8\u05D9\u05DD \u05E9\u05DE\u05D7', emoji: '\uD83C\uDF89' },
  pesach: { greeting: '\u05D7\u05D2 \u05E4\u05E1\u05D7 \u05E9\u05DE\u05D7', emoji: '\uD83C\uDF5E' },
  yom_haatzmaut: { greeting: '\u05D9\u05D5\u05DD \u05E2\u05E6\u05DE\u05D0\u05D5\u05EA \u05E9\u05DE\u05D7', emoji: '\uD83C\uDDEE\uD83C\uDDF1' },
  shavuot: { greeting: '\u05D7\u05D2 \u05E9\u05D1\u05D5\u05E2\u05D5\u05EA \u05E9\u05DE\u05D7', emoji: '\uD83C\uDF3E' },
  custom: { greeting: '', emoji: '' },
};

const RATE_LIMITS = {
  waRateLimit: parseInt(process.env.WA_RATE_LIMIT, 10) || 30,
  waDelayMin: parseInt(process.env.WA_DELAY_MIN, 10) || 3000,
  waDelayMax: parseInt(process.env.WA_DELAY_MAX, 10) || 8000,
  waMaxRetries: parseInt(process.env.WA_MAX_RETRIES, 10) || 3,
};

const MESSAGE_STATUSES = [
  'queued', 'generating', 'pending_approval', 'sending',
  'sent', 'delivered', 'read', 'failed', 'rejected', 'expired',
];

const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'expired', 'sent', 'failed'];

const LANGUAGES = ['he', 'en', 'ar', 'fr'];

const CONTACT_SOURCES = ['google', 'csv', 'vcard', 'whatsapp', 'manual', 'auto_reply'];

const IMAGE_CONFIG = {
  maxWidth: 1080,
  maxHeight: 1080,
  maxSize: 500000,
  format: 'webp',
  quality: 85,
};

const CACHE_TTL_DAYS = 7;

module.exports = {
  EVENT_TYPES,
  RATE_LIMITS,
  MESSAGE_STATUSES,
  APPROVAL_STATUSES,
  LANGUAGES,
  CONTACT_SOURCES,
  IMAGE_CONFIG,
  CACHE_TTL_DAYS,
};
