const express = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { db } = require('../config/database');

const router = express.Router();

router.use(authenticate);

// --- Validation Schemas ---

const createGroupSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  color: Joi.string().optional(),
  icon: Joi.string().optional(),
  autoSendShabbat: Joi.boolean().optional(),
  autoSendHoliday: Joi.boolean().optional(),
  autoReplyEnabled: Joi.boolean().optional(),
  defaultTemplate: Joi.string().optional(),
});

const updateGroupSchema = createGroupSchema.fork(
  ['name'],
  (field) => field.optional()
);

const contactIdsSchema = Joi.object({
  contactIds: Joi.array().items(Joi.string()).min(1).required(),
});

// --- Helpers ---

function mapGroupBody(body) {
  const mapped = {};
  if (body.name !== undefined) mapped.name = body.name;
  if (body.description !== undefined) mapped.description = body.description;
  if (body.color !== undefined) mapped.color = body.color;
  if (body.icon !== undefined) mapped.icon = body.icon;
  if (body.autoSendShabbat !== undefined) mapped.auto_send_shabbat = body.autoSendShabbat;
  if (body.autoSendHoliday !== undefined) mapped.auto_send_holiday = body.autoSendHoliday;
  if (body.autoReplyEnabled !== undefined) mapped.auto_reply_enabled = body.autoReplyEnabled;
  if (body.defaultTemplate !== undefined) mapped.default_template_id = body.defaultTemplate ? Number(body.defaultTemplate) : null;
  return mapped;
}

function formatGroup(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    autoSendShabbat: row.auto_send_shabbat,
    autoSendHoliday: row.auto_send_holiday,
    autoReplyEnabled: row.auto_reply_enabled,
    defaultTemplate: row.default_template_id
      ? { id: row.default_template_id, name: row.template_name || null, eventType: row.template_event_type || null }
      : null,
    contactCount: row.contact_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Routes ---

// GET / — list groups with contact count
router.get('/', async (req, res, next) => {
  try {
    const groups = await db('groups')
      .leftJoin('templates', 'groups.default_template_id', 'templates.id')
      .select(
        'groups.*',
        'templates.name as template_name',
        'templates.event_type as template_event_type'
      )
      .orderBy('groups.name', 'asc');

    // Get contact counts per group
    const counts = await db('contact_groups')
      .select('group_id')
      .count('* as count')
      .groupBy('group_id');

    const countMap = {};
    for (const c of counts) {
      countMap[c.group_id] = c.count;
    }

    const result = groups.map((g) => formatGroup({
      ...g,
      contact_count: countMap[g.id] || 0,
    }));

    res.json({ groups: result });
  } catch (err) {
    next(err);
  }
});

// POST / — create group
router.post('/', validate(createGroupSchema), async (req, res, next) => {
  try {
    const mapped = mapGroupBody(req.body);
    const [id] = await db('groups').insert(mapped);
    const group = await db('groups').where({ id }).first();
    res.status(201).json({ group: formatGroup({ ...group, contact_count: 0 }) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Group with this name already exists' });
    }
    next(err);
  }
});

// PUT /:id — update group
router.put('/:id', validate(updateGroupSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const mapped = mapGroupBody(req.body);

    const updated = await db('groups').where({ id }).update(mapped);
    if (!updated) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = await db('groups').where({ id }).first();
    const [countRow] = await db('contact_groups').where({ group_id: id }).count('* as count');
    res.json({ group: formatGroup({ ...group, contact_count: countRow.count }) });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete group (contact_groups cascade automatically)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db('groups').where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ message: 'Group deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/contacts — add contacts to group
router.post('/:id/contacts', validate(contactIdsSchema), async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    const group = await db('groups').where({ id: groupId }).first();
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const contactIds = req.body.contactIds.map(Number);

    // Find which contacts are already in the group to avoid duplicates
    const existing = await db('contact_groups')
      .where({ group_id: groupId })
      .whereIn('contact_id', contactIds)
      .select('contact_id');
    const existingSet = new Set(existing.map((r) => r.contact_id));

    const toInsert = contactIds
      .filter((cId) => !existingSet.has(cId))
      .map((cId) => ({ contact_id: cId, group_id: groupId }));

    if (toInsert.length) {
      await db('contact_groups').insert(toInsert);
    }

    res.json({ modified: toInsert.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/contacts — remove contacts from group
router.delete('/:id/contacts', validate(contactIdsSchema), async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    const group = await db('groups').where({ id: groupId }).first();
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const contactIds = req.body.contactIds.map(Number);
    const deleted = await db('contact_groups')
      .where({ group_id: groupId })
      .whereIn('contact_id', contactIds)
      .del();

    res.json({ modified: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
