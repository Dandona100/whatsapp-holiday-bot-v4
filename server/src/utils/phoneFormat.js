/**
 * Strip non-digit characters from a phone string, preserving leading +.
 */
function stripFormatting(phone) {
  const hasPlus = phone.startsWith('+');
  const digits = phone.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize a phone number to E.164 format.
 * Handles Israeli numbers (05x -> +9725x) and numbers starting with 972 without +.
 */
function formatE164(phone) {
  if (!phone || typeof phone !== 'string') return '';

  const cleaned = stripFormatting(phone.trim());
  if (!cleaned) return '';

  // Already in E.164
  if (cleaned.startsWith('+')) return cleaned;

  // Starts with 972 (Israeli international without +)
  if (cleaned.startsWith('972')) return `+${cleaned}`;

  // Israeli local number (05x, 07x, etc.)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+972${cleaned.slice(1)}`;
  }

  // Fallback: prepend +
  return `+${cleaned}`;
}

/**
 * Convert E.164 phone to WhatsApp ID format (e.g. 972501234567@c.us).
 */
function formatWhatsAppId(phone) {
  const e164 = formatE164(phone);
  return `${e164.replace('+', '')}@c.us`;
}

/**
 * Extract phone number from WhatsApp ID (e.g. 972501234567@c.us -> +972501234567).
 */
function extractPhone(waId) {
  if (!waId || typeof waId !== 'string') return '';
  const digits = waId.replace('@c.us', '');
  return `+${digits}`;
}

module.exports = { formatE164, formatWhatsAppId, extractPhone };
