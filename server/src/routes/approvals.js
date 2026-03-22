const express = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { db } = require('../config/database');

const router = express.Router();

router.use(authenticate);

// --- Validation Schemas ---

const bulkIdsSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).required(),
});

const approveSchema = Joi.object({
  editedCaption: Joi.string().allow('').optional(),
});

// --- Helpers ---

function formatApproval(row) {
  if (!row) return row;
  return {
    id: row.id,
    contactId: row.contact_id,
    triggerType: row.trigger_type,
    incomingMessage: {
      body: row.incoming_body,
      timestamp: row.incoming_timestamp,
      hasMedia: row.incoming_has_media,
    },
    preparedResponse: {
      imagePath: row.image_path,
      imageSource: row.image_source,
      caption: row.caption,
      templateUsed: row.template_id || null,
    },
    status: row.status,
    adminNotifiedVia: typeof row.admin_notified_via === 'string'
      ? JSON.parse(row.admin_notified_via)
      : (row.admin_notified_via || []),
    adminResponse: {
      decision: row.admin_decision,
      respondedAt: row.admin_responded_at,
      respondedVia: row.admin_responded_via,
      editedCaption: row.admin_edited_caption,
    },
    expiresAt: row.expires_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Attached by joins
    contact: row._contact || undefined,
    templateUsedInfo: row._template || undefined,
  };
}

// --- Routes ---

// GET /stats — approval statistics (before /:id to avoid conflict)
router.get('/stats', async (req, res, next) => {
  try {
    const [statusCounts, avgResponseTime] = await Promise.all([
      db('pending_approvals')
        .select('status')
        .count('* as count')
        .groupBy('status'),
      db('pending_approvals')
        .whereNotNull('admin_responded_at')
        .select(
          db.raw('AVG(TIMESTAMPDIFF(SECOND, created_at, admin_responded_at) * 1000) as avg_ms')
        )
        .first(),
    ]);

    const counts = {};
    for (const s of statusCounts) {
      counts[s.status] = s.count;
    }

    res.json({
      counts,
      avgResponseTimeMs: avgResponseTime?.avg_ms || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET / — list approvals with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db('pending_approvals')
      .leftJoin('contacts', 'pending_approvals.contact_id', 'contacts.id')
      .leftJoin('templates', 'pending_approvals.template_id', 'templates.id')
      .select(
        'pending_approvals.*',
        'contacts.phone as contact_phone',
        'contacts.display_name as contact_display_name',
        'templates.name as tpl_name',
        'templates.event_type as tpl_event_type'
      );

    let countQuery = db('pending_approvals');

    if (status) {
      query = query.where('pending_approvals.status', status);
      countQuery = countQuery.where({ status });
    }

    const [approvals, [{ total }]] = await Promise.all([
      query
        .orderBy('pending_approvals.created_at', 'desc')
        .offset(offset)
        .limit(Number(limit)),
      countQuery.count('* as total'),
    ]);

    const formatted = approvals.map((row) => {
      const approval = formatApproval(row);
      if (row.contact_phone || row.contact_display_name) {
        approval.contact = { id: row.contact_id, phone: row.contact_phone, displayName: row.contact_display_name };
      }
      if (row.tpl_name) {
        approval.templateUsedInfo = { id: row.template_id, name: row.tpl_name, eventType: row.tpl_event_type };
      }
      return approval;
    });

    res.json({
      approvals: formatted,
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

// GET /:id — get single approval
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await db('pending_approvals')
      .leftJoin('contacts', 'pending_approvals.contact_id', 'contacts.id')
      .leftJoin('templates', 'pending_approvals.template_id', 'templates.id')
      .select(
        'pending_approvals.*',
        'contacts.phone as contact_phone',
        'contacts.display_name as contact_display_name',
        'contacts.first_name as contact_first_name',
        'contacts.last_name as contact_last_name',
        'templates.name as tpl_name',
        'templates.event_type as tpl_event_type'
      )
      .where('pending_approvals.id', id)
      .first();

    if (!row) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = formatApproval(row);
    if (row.contact_phone || row.contact_display_name) {
      approval.contact = {
        id: row.contact_id,
        phone: row.contact_phone,
        displayName: row.contact_display_name,
        firstName: row.contact_first_name,
        lastName: row.contact_last_name,
      };
    }
    if (row.tpl_name) {
      approval.templateUsedInfo = { id: row.template_id, name: row.tpl_name, eventType: row.tpl_event_type };
    }

    res.json({ approval });
  } catch (err) {
    next(err);
  }
});

// POST /:id/approve — approve a pending approval
router.post('/:id/approve', validate(approveSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const approval = await db('pending_approvals').where({ id }).first();
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve: status is ${approval.status}` });
    }

    await db('pending_approvals').where({ id }).update({
      status: 'approved',
      admin_decision: 'approved',
      admin_responded_at: new Date(),
      admin_responded_via: 'api',
      admin_edited_caption: req.body.editedCaption || null,
    });

    const updated = await db('pending_approvals').where({ id }).first();
    res.json({ approval: formatApproval(updated) });
  } catch (err) {
    next(err);
  }
});

// POST /:id/reject — reject a pending approval
router.post('/:id/reject', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const approval = await db('pending_approvals').where({ id }).first();
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject: status is ${approval.status}` });
    }

    await db('pending_approvals').where({ id }).update({
      status: 'rejected',
      admin_decision: 'rejected',
      admin_responded_at: new Date(),
      admin_responded_via: 'api',
    });

    const updated = await db('pending_approvals').where({ id }).first();
    res.json({ approval: formatApproval(updated) });
  } catch (err) {
    next(err);
  }
});

// POST /bulk-approve
router.post('/bulk-approve', validate(bulkIdsSchema), async (req, res, next) => {
  try {
    const ids = req.body.ids.map(Number);
    const result = await db('pending_approvals')
      .whereIn('id', ids)
      .where({ status: 'pending' })
      .update({
        status: 'approved',
        admin_decision: 'approved',
        admin_responded_at: new Date(),
        admin_responded_via: 'api',
      });
    res.json({ modified: result });
  } catch (err) {
    next(err);
  }
});

// POST /bulk-reject
router.post('/bulk-reject', validate(bulkIdsSchema), async (req, res, next) => {
  try {
    const ids = req.body.ids.map(Number);
    const result = await db('pending_approvals')
      .whereIn('id', ids)
      .where({ status: 'pending' })
      .update({
        status: 'rejected',
        admin_decision: 'rejected',
        admin_responded_at: new Date(),
        admin_responded_via: 'api',
      });
    res.json({ modified: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
