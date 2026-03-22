const express = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { db } = require('../config/database');

const router = express.Router();

router.use(authenticate);

// --- Validation Schemas ---

const EVENT_TYPES = [
  'shabbat', 'rosh_hashana', 'yom_kippur', 'sukkot', 'shmini_atzeret',
  'simchat_torah', 'chanukah', 'tu_bishvat', 'purim', 'pesach',
  'yom_hashoah', 'yom_hazikaron', 'yom_haatzmaut', 'lag_baomer',
  'yom_yerushalayim', 'shavuot', 'tisha_bav', 'tu_bav', 'rosh_chodesh', 'custom',
];

const createScheduleSchema = Joi.object({
  eventType: Joi.string().valid(...EVENT_TYPES).required(),
  name: Joi.string().allow('').optional(),
  enabled: Joi.boolean().optional(),
  sendTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  targetGroups: Joi.array().items(Joi.string()).optional(),
  excludeContacts: Joi.array().items(Joi.string()).optional(),
  template: Joi.string().optional(),
  captionTemplate: Joi.string().allow('').optional(),
  usePersonalization: Joi.boolean().optional(),
});

const updateScheduleSchema = createScheduleSchema.fork(
  ['eventType'],
  (field) => field.optional()
);

// --- Helpers ---

function mapScheduleBody(body) {
  const mapped = {};
  if (body.eventType !== undefined) mapped.event_type = body.eventType;
  if (body.name !== undefined) mapped.name = body.name;
  if (body.enabled !== undefined) mapped.enabled = body.enabled;
  if (body.sendTime !== undefined) mapped.send_time = body.sendTime;
  if (body.excludeContacts !== undefined) mapped.exclude_contacts = JSON.stringify(body.excludeContacts);
  if (body.template !== undefined) mapped.template_id = body.template ? Number(body.template) : null;
  if (body.captionTemplate !== undefined) mapped.caption_template = body.captionTemplate;
  if (body.usePersonalization !== undefined) mapped.use_personalization = body.usePersonalization;
  return mapped;
}

function formatSchedule(row, template, targetGroups) {
  if (!row) return row;
  return {
    id: row.id,
    eventType: row.event_type,
    name: row.name,
    enabled: row.enabled,
    sendTime: row.send_time,
    excludeContacts: typeof row.exclude_contacts === 'string' ? JSON.parse(row.exclude_contacts) : (row.exclude_contacts || []),
    template: template || null,
    captionTemplate: row.caption_template,
    usePersonalization: row.use_personalization,
    lastRun: row.last_run,
    nextRun: row.next_run,
    targetGroups: targetGroups || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Load template + target groups for schedule(s)
async function enrichSchedules(schedules) {
  if (!schedules.length) return [];

  const scheduleIds = schedules.map((s) => s.id);

  // Load target groups per schedule
  const sgRows = await db('schedule_groups')
    .join('groups', 'schedule_groups.group_id', 'groups.id')
    .whereIn('schedule_groups.schedule_id', scheduleIds)
    .select('schedule_groups.schedule_id', 'groups.id', 'groups.name', 'groups.color');

  const sgMap = {};
  for (const r of sgRows) {
    if (!sgMap[r.schedule_id]) sgMap[r.schedule_id] = [];
    sgMap[r.schedule_id].push({ id: r.id, name: r.name, color: r.color });
  }

  // Load templates
  const templateIds = [...new Set(schedules.map((s) => s.template_id).filter(Boolean))];
  const templates = templateIds.length
    ? await db('templates').whereIn('id', templateIds).select('id', 'name', 'event_type', 'preview_url')
    : [];
  const tplMap = {};
  for (const t of templates) {
    tplMap[t.id] = { id: t.id, name: t.name, eventType: t.event_type, previewUrl: t.preview_url };
  }

  return schedules.map((s) =>
    formatSchedule(s, tplMap[s.template_id] || null, sgMap[s.id] || [])
  );
}

// --- Routes ---

// GET /upcoming — must be before /:id to avoid conflict
router.get('/upcoming', async (req, res, next) => {
  try {
    const schedules = await db('schedules')
      .where({ enabled: true })
      .whereNotNull('next_run')
      .orderBy('next_run', 'asc')
      .limit(20);

    const enriched = await enrichSchedules(schedules);
    res.json({ schedules: enriched });
  } catch (err) {
    next(err);
  }
});

// GET / — list schedules
router.get('/', async (req, res, next) => {
  try {
    const schedules = await db('schedules').orderBy('event_type', 'asc');
    const enriched = await enrichSchedules(schedules);
    res.json({ schedules: enriched });
  } catch (err) {
    next(err);
  }
});

// POST / — create schedule
router.post('/', validate(createScheduleSchema), async (req, res, next) => {
  try {
    const targetGroups = req.body.targetGroups || [];
    const mapped = mapScheduleBody(req.body);

    const [id] = await db('schedules').insert(mapped);

    if (targetGroups.length) {
      await db('schedule_groups').insert(
        targetGroups.map((gId) => ({ schedule_id: id, group_id: Number(gId) }))
      );
    }

    const schedule = await db('schedules').where({ id }).first();
    const enriched = await enrichSchedules([schedule]);
    res.status(201).json({ schedule: enriched[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update schedule
router.put('/:id', validate(updateScheduleSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const targetGroups = req.body.targetGroups;
    const mapped = mapScheduleBody(req.body);

    const updated = await db('schedules').where({ id }).update(mapped);
    if (!updated) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Replace target groups if provided
    if (targetGroups !== undefined) {
      await db('schedule_groups').where({ schedule_id: id }).del();
      if (targetGroups.length) {
        await db('schedule_groups').insert(
          targetGroups.map((gId) => ({ schedule_id: id, group_id: Number(gId) }))
        );
      }
    }

    const schedule = await db('schedules').where({ id }).first();
    const enriched = await enrichSchedules([schedule]);
    res.json({ schedule: enriched[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete schedule (schedule_groups cascade automatically)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db('schedules').where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/run — manual trigger
router.post('/:id/run', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schedule = await db('schedules').where({ id }).first();
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await db('schedules').where({ id }).update({ last_run: new Date() });

    const updated = await db('schedules').where({ id }).first();
    const enriched = await enrichSchedules([updated]);
    res.json({ message: 'Schedule triggered', schedule: enriched[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
