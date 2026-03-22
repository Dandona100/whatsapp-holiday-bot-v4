const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { db } = require('../config/database');
const googleService = require('../services/google.service');
const googleConfig = require('../config/google');
const logger = require('../utils/logger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Google OAuth Callback (no auth required — redirect from Google) ---

router.get('/import/google/callback', async (req, res, next) => {
  try {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn(`Google OAuth error: ${oauthError}`);
      return res.redirect(`/?google_import=error&message=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      return res.redirect('/?google_import=error&message=No+authorization+code');
    }

    const tokens = await googleService.exchangeCode(code);
    const result = await googleService.importContacts(tokens.access_token);

    const message = `Imported ${result.imported}, skipped ${result.skipped} of ${result.total} contacts`;
    res.redirect(`/?google_import=success&message=${encodeURIComponent(message)}`);
  } catch (err) {
    logger.error(`Google import callback error: ${err.message}`);
    res.redirect(`/?google_import=error&message=${encodeURIComponent(err.message)}`);
  }
});

// All routes below require authentication
router.use(authenticate);

// --- Validation Schemas ---

const createContactSchema = Joi.object({
  phone: Joi.string().pattern(/^\+\d{7,15}$/).required(),
  displayName: Joi.string().required(),
  firstName: Joi.string().allow('').optional(),
  lastName: Joi.string().allow('').optional(),
  nameOnDesign: Joi.string().allow('').optional(),
  groups: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  language: Joi.string().valid('he', 'en', 'ar', 'fr').optional(),
  active: Joi.boolean().optional(),
  autoReplyEnabled: Joi.boolean().optional(),
  source: Joi.string().valid('google', 'csv', 'vcard', 'whatsapp', 'manual', 'auto_reply').optional(),
  notes: Joi.string().allow('').optional(),
});

const updateContactSchema = createContactSchema.fork(
  ['phone', 'displayName'],
  (field) => field.optional()
);

const bulkUpdateSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).required(),
  update: Joi.object().required(),
});

const mergeSchema = Joi.object({
  primaryId: Joi.string().required(),
  secondaryId: Joi.string().required(),
});

// --- Helpers ---

// Map camelCase body fields to snake_case DB columns
function mapContactBody(body) {
  const mapped = {};
  if (body.phone !== undefined) mapped.phone = body.phone;
  if (body.displayName !== undefined) mapped.display_name = body.displayName;
  if (body.firstName !== undefined) mapped.first_name = body.firstName;
  if (body.lastName !== undefined) mapped.last_name = body.lastName;
  if (body.nameOnDesign !== undefined) mapped.name_on_design = body.nameOnDesign;
  if (body.tags !== undefined) mapped.tags = JSON.stringify(body.tags);
  if (body.language !== undefined) mapped.language = body.language;
  if (body.active !== undefined) mapped.active = body.active;
  if (body.autoReplyEnabled !== undefined) mapped.auto_reply_enabled = body.autoReplyEnabled;
  if (body.source !== undefined) mapped.source = body.source;
  if (body.notes !== undefined) mapped.notes = body.notes;
  return mapped;
}

// Format a contact row for API response (snake_case -> camelCase)
function formatContact(row) {
  if (!row) return row;
  return {
    id: row.id,
    phone: row.phone,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    nameOnDesign: row.name_on_design,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    language: row.language,
    active: row.active,
    autoReplyEnabled: row.auto_reply_enabled,
    source: row.source,
    totalSent: row.total_sent,
    totalDelivered: row.total_delivered,
    totalRead: row.total_read,
    totalFailed: row.total_failed,
    totalIncoming: row.total_incoming,
    lastMessageSent: row.last_message_sent,
    lastMessageReceived: row.last_message_received,
    lastMessageStatus: row.last_message_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Attached by joins
    groups: row._groups || [],
  };
}

// Attach groups info to contact(s)
async function attachGroups(contacts) {
  if (!contacts.length) return contacts;
  const contactIds = contacts.map((c) => c.id);
  const rows = await db('contact_groups')
    .join('groups', 'contact_groups.group_id', 'groups.id')
    .whereIn('contact_groups.contact_id', contactIds)
    .select('contact_groups.contact_id', 'groups.id', 'groups.name', 'groups.color');

  const groupMap = {};
  for (const r of rows) {
    if (!groupMap[r.contact_id]) groupMap[r.contact_id] = [];
    groupMap[r.contact_id].push({ id: r.id, name: r.name, color: r.color });
  }

  return contacts.map((c) => ({ ...c, _groups: groupMap[c.id] || [] }));
}

// --- Routes ---

// GET / — list contacts with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      group,
      tag,
      active,
      source,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('contacts');
    let countQuery = db('contacts');

    if (search) {
      const like = `%${search}%`;
      const applySearch = (q) =>
        q.where(function () {
          this.where('display_name', 'like', like)
            .orWhere('phone', 'like', like)
            .orWhere('first_name', 'like', like)
            .orWhere('last_name', 'like', like);
        });
      query = applySearch(query);
      countQuery = applySearch(countQuery);
    }

    if (group) {
      const groupId = Number(group);
      const applyGroup = (q) =>
        q.whereIn('id', db('contact_groups').select('contact_id').where({ group_id: groupId }));
      query = applyGroup(query);
      countQuery = applyGroup(countQuery);
    }

    if (tag) {
      const applyTag = (q) => q.whereRaw('JSON_CONTAINS(tags, ?)', [JSON.stringify(tag)]);
      query = applyTag(query);
      countQuery = applyTag(countQuery);
    }

    if (active !== undefined) {
      const isActive = active === 'true';
      query = query.where({ active: isActive });
      countQuery = countQuery.where({ active: isActive });
    }

    if (source) {
      query = query.where({ source });
      countQuery = countQuery.where({ source });
    }

    const [contacts, [{ total }]] = await Promise.all([
      query.orderBy('display_name', 'asc').offset(offset).limit(Number(limit)),
      countQuery.count('* as total'),
    ]);

    const withGroups = await attachGroups(contacts);

    res.json({
      contacts: withGroups.map(formatContact),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST / — create contact
router.post('/', validate(createContactSchema), async (req, res, next) => {
  try {
    const groupIds = req.body.groups || [];
    const mapped = mapContactBody(req.body);

    const [id] = await db('contacts').insert(mapped);

    if (groupIds.length) {
      await db('contact_groups').insert(
        groupIds.map((gId) => ({ contact_id: id, group_id: Number(gId) }))
      );
    }

    const contact = await db('contacts').where({ id }).first();
    const withGroups = await attachGroups([contact]);
    res.status(201).json({ contact: formatContact(withGroups[0]) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Contact with this phone already exists' });
    }
    next(err);
  }
});

// PUT /:id — update contact
router.put('/:id', validate(updateContactSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const groupIds = req.body.groups;
    const mapped = mapContactBody(req.body);

    const updated = await db('contacts').where({ id }).update(mapped);
    if (!updated) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (groupIds !== undefined) {
      await db('contact_groups').where({ contact_id: id }).del();
      if (groupIds.length) {
        await db('contact_groups').insert(
          groupIds.map((gId) => ({ contact_id: id, group_id: Number(gId) }))
        );
      }
    }

    const contact = await db('contacts').where({ id }).first();
    const withGroups = await attachGroups([contact]);
    res.json({ contact: formatContact(withGroups[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete contact
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db('contacts').where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /bulk-update
router.post('/bulk-update', validate(bulkUpdateSchema), async (req, res, next) => {
  try {
    const { ids, update } = req.body;
    const mapped = mapContactBody(update);
    const result = await db('contacts')
      .whereIn('id', ids.map(Number))
      .update(mapped);
    res.json({ modified: result });
  } catch (err) {
    next(err);
  }
});

// POST /import/:source — import contacts from CSV or vCard
router.post('/import/:source', upload.single('file'), async (req, res, next) => {
  try {
    const { source } = req.params;
    if (!['csv', 'vcard'].includes(source)) {
      return res.status(400).json({ error: 'Source must be csv or vcard' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const content = req.file.buffer.toString('utf-8');
    const contacts = [];

    if (source === 'csv') {
      const lines = content.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const phoneIdx = headers.indexOf('phone');
      const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('displayname');

      if (phoneIdx === -1 || nameIdx === -1) {
        return res.status(400).json({ error: 'CSV must have phone and name columns' });
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols[phoneIdx] && cols[nameIdx]) {
          contacts.push({
            phone: cols[phoneIdx],
            display_name: cols[nameIdx],
            source: 'csv',
          });
        }
      }
    } else {
      const vcards = content.split('END:VCARD').filter((v) => v.includes('BEGIN:VCARD'));
      for (const vcard of vcards) {
        const fnMatch = vcard.match(/FN:(.*)/);
        const telMatch = vcard.match(/TEL[^:]*:([\d+\s-]+)/);
        if (fnMatch && telMatch) {
          contacts.push({
            phone: telMatch[1].replace(/[\s-]/g, ''),
            display_name: fnMatch[1].trim(),
            source: 'vcard',
          });
        }
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const data of contacts) {
      try {
        await db('contacts').insert(data);
        imported++;
      } catch {
        skipped++;
      }
    }

    res.json({ imported, skipped, total: contacts.length });
  } catch (err) {
    next(err);
  }
});

// GET /export/:format — export contacts
router.get('/export/:format', async (req, res, next) => {
  try {
    const { format } = req.params;
    if (!['csv', 'vcard'].includes(format)) {
      return res.status(400).json({ error: 'Format must be csv or vcard' });
    }

    const contacts = await db('contacts').where({ active: true });
    res.json({ format, count: contacts.length, contacts: contacts.map(formatContact) });
  } catch (err) {
    next(err);
  }
});

// GET /duplicates — find duplicate contacts by phone
router.get('/duplicates', async (req, res, next) => {
  try {
    const duplicates = await db('contacts')
      .select('phone')
      .count('* as count')
      .groupBy('phone')
      .having('count', '>', 1);

    // For each duplicate phone, get the ids
    const result = [];
    for (const dup of duplicates) {
      const ids = await db('contacts').select('id').where({ phone: dup.phone });
      result.push({
        _id: dup.phone,
        count: dup.count,
        ids: ids.map((r) => r.id),
      });
    }

    res.json({ duplicates: result });
  } catch (err) {
    next(err);
  }
});

// POST /merge — merge two contacts
router.post('/merge', validate(mergeSchema), async (req, res, next) => {
  try {
    const primaryId = Number(req.body.primaryId);
    const secondaryId = Number(req.body.secondaryId);

    const [primary, secondary] = await Promise.all([
      db('contacts').where({ id: primaryId }).first(),
      db('contacts').where({ id: secondaryId }).first(),
    ]);

    if (!primary || !secondary) {
      return res.status(404).json({ error: 'One or both contacts not found' });
    }

    // Merge tags
    const primaryTags = typeof primary.tags === 'string' ? JSON.parse(primary.tags) : (primary.tags || []);
    const secondaryTags = typeof secondary.tags === 'string' ? JSON.parse(secondary.tags) : (secondary.tags || []);
    const mergedTags = [...new Set([...primaryTags, ...secondaryTags])];

    // Merge groups via contact_groups
    const primaryGroups = await db('contact_groups').where({ contact_id: primaryId }).select('group_id');
    const secondaryGroups = await db('contact_groups').where({ contact_id: secondaryId }).select('group_id');
    const primaryGroupIds = new Set(primaryGroups.map((r) => r.group_id));
    const newGroupIds = secondaryGroups
      .map((r) => r.group_id)
      .filter((gId) => !primaryGroupIds.has(gId));

    // Update primary contact
    const updateData = { tags: JSON.stringify(mergedTags) };
    if (!primary.notes && secondary.notes) {
      updateData.notes = secondary.notes;
    }
    await db('contacts').where({ id: primaryId }).update(updateData);

    // Add missing groups to primary
    if (newGroupIds.length) {
      await db('contact_groups').insert(
        newGroupIds.map((gId) => ({ contact_id: primaryId, group_id: gId }))
      );
    }

    // Reassign message logs from secondary to primary
    await db('message_logs').where({ contact_id: secondaryId }).update({ contact_id: primaryId });

    // Delete secondary contact (cascades contact_groups)
    await db('contacts').where({ id: secondaryId }).del();

    const updatedPrimary = await db('contacts').where({ id: primaryId }).first();
    const withGroups = await attachGroups([updatedPrimary]);
    res.json({ contact: formatContact(withGroups[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/history — get message history for a contact
router.get('/:id/history', async (req, res, next) => {
  try {
    const contactId = Number(req.params.id);
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [logs, [{ total }]] = await Promise.all([
      db('message_logs')
        .where({ contact_id: contactId })
        .orderBy('created_at', 'desc')
        .offset(offset)
        .limit(Number(limit)),
      db('message_logs').where({ contact_id: contactId }).count('* as total'),
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// --- Google Contacts Import ---

// GET /import/google/auth — return the OAuth consent URL
router.get('/import/google/auth', async (req, res, next) => {
  try {
    if (!googleConfig.oauth.clientId || !googleConfig.oauth.clientSecret) {
      return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    }
    const url = googleService.getAuthUrl();
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
