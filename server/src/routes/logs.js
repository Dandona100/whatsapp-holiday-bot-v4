const express = require('express');
const authenticate = require('../middleware/auth');
const { db } = require('../config/database');

const router = express.Router();

router.use(authenticate);

// --- Routes ---

// GET /summary — aggregate stats (before /:id-style routes)
router.get('/summary', async (req, res, next) => {
  try {
    const [statusSummary, directionSummary, [{ total: totalCount }]] = await Promise.all([
      db('message_logs')
        .select('status')
        .count('* as count')
        .groupBy('status'),
      db('message_logs')
        .select('direction')
        .count('* as count')
        .groupBy('direction'),
      db('message_logs').count('* as total'),
    ]);

    const byStatus = {};
    for (const s of statusSummary) {
      byStatus[s.status] = s.count;
    }

    const byDirection = {};
    for (const d of directionSummary) {
      byDirection[d.direction] = d.count;
    }

    res.json({ total: totalCount, byStatus, byDirection });
  } catch (err) {
    next(err);
  }
});

// GET /delivery — delivery rate stats
router.get('/delivery', async (req, res, next) => {
  try {
    const stats = await db('message_logs')
      .where({ direction: 'outgoing' })
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("SUM(CASE WHEN status IN ('sent','delivered','read') THEN 1 ELSE 0 END) as sent"),
        db.raw("SUM(CASE WHEN status IN ('delivered','read') THEN 1 ELSE 0 END) as delivered"),
        db.raw("SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as `read`"),
        db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
      )
      .first();

    const result = {
      total: stats?.total || 0,
      sent: stats?.sent || 0,
      delivered: stats?.delivered || 0,
      read: stats?.read || 0,
      failed: stats?.failed || 0,
    };
    result.deliveryRate = result.total > 0 ? (result.delivered / result.total) * 100 : 0;
    result.readRate = result.total > 0 ? (result.read / result.total) * 100 : 0;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /by-event — group by eventType
router.get('/by-event', async (req, res, next) => {
  try {
    const results = await db('message_logs')
      .whereNotNull('event_type')
      .select(
        'event_type as _id',
        db.raw('COUNT(*) as total'),
        db.raw("SUM(CASE WHEN status IN ('sent','delivered','read') THEN 1 ELSE 0 END) as sent"),
        db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
      )
      .groupBy('event_type')
      .orderBy('total', 'desc');

    res.json({ events: results });
  } catch (err) {
    next(err);
  }
});

// GET /by-contact — group by contact
router.get('/by-contact', async (req, res, next) => {
  try {
    const results = await db('message_logs')
      .leftJoin('contacts', 'message_logs.contact_id', 'contacts.id')
      .select(
        'message_logs.contact_id as contactId',
        'contacts.display_name as displayName',
        'contacts.phone',
        db.raw('COUNT(*) as total'),
        db.raw("SUM(CASE WHEN message_logs.direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing"),
        db.raw("SUM(CASE WHEN message_logs.direction = 'incoming' THEN 1 ELSE 0 END) as incoming")
      )
      .groupBy('message_logs.contact_id', 'contacts.display_name', 'contacts.phone')
      .orderBy('total', 'desc')
      .limit(100);

    res.json({ contacts: results });
  } catch (err) {
    next(err);
  }
});

// GET /export/csv — export logs as CSV
router.get('/export/csv', async (req, res, next) => {
  try {
    const logs = await db('message_logs')
      .leftJoin('contacts', 'message_logs.contact_id', 'contacts.id')
      .select(
        'message_logs.*',
        'contacts.phone as contact_phone',
        'contacts.display_name as contact_display_name'
      )
      .orderBy('message_logs.created_at', 'desc');

    const header = 'date,direction,status,eventType,triggerType,phone,displayName,caption,errorMessage';
    const rows = logs.map((log) => {
      const phone = log.contact_phone || '';
      const name = log.contact_display_name || '';
      const caption = (log.caption || '').replace(/"/g, '""');
      const error = (log.error_message || '').replace(/"/g, '""');
      return [
        log.created_at ? new Date(log.created_at).toISOString() : '',
        log.direction || '',
        log.status || '',
        log.event_type || '',
        log.trigger_type || '',
        phone,
        `"${name}"`,
        `"${caption}"`,
        `"${error}"`,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=message-logs.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /daily — messages per day for last 30 days
router.get('/daily', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const results = await db('message_logs')
      .select(db.raw('DATE(created_at) as date'))
      .count('* as count')
      .where('created_at', '>=', db.raw(`DATE_SUB(NOW(), INTERVAL ${days} DAY)`))
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    res.json({ daily: results });
  } catch (err) {
    next(err);
  }
});

// GET / — list logs with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      direction,
      status,
      eventType,
      triggerType,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('message_logs')
      .leftJoin('contacts', 'message_logs.contact_id', 'contacts.id')
      .select(
        'message_logs.*',
        'contacts.phone as contact_phone',
        'contacts.display_name as contact_display_name'
      );

    let countQuery = db('message_logs');

    if (direction) {
      query = query.where('message_logs.direction', direction);
      countQuery = countQuery.where({ direction });
    }
    if (status) {
      query = query.where('message_logs.status', status);
      countQuery = countQuery.where({ status });
    }
    if (eventType) {
      query = query.where('message_logs.event_type', eventType);
      countQuery = countQuery.where({ event_type: eventType });
    }
    if (triggerType) {
      query = query.where('message_logs.trigger_type', triggerType);
      countQuery = countQuery.where({ trigger_type: triggerType });
    }

    if (dateFrom) {
      query = query.where('message_logs.created_at', '>=', new Date(dateFrom));
      countQuery = countQuery.where('created_at', '>=', new Date(dateFrom));
    }
    if (dateTo) {
      query = query.where('message_logs.created_at', '<=', new Date(dateTo));
      countQuery = countQuery.where('created_at', '<=', new Date(dateTo));
    }
    if (search) {
      const like = `%${search}%`;
      query = query.where(function () {
        this.where('contacts.display_name', 'like', like)
          .orWhere('contacts.phone', 'like', like);
      });
      countQuery = countQuery
        .leftJoin('contacts as c2', 'message_logs.contact_id', 'c2.id')
        .where(function () {
          this.where('c2.display_name', 'like', like)
            .orWhere('c2.phone', 'like', like);
        });
    }

    const [logs, [{ total }]] = await Promise.all([
      query
        .orderBy('message_logs.created_at', 'desc')
        .offset(offset)
        .limit(Number(limit)),
      countQuery.count('* as total'),
    ]);

    const formatted = logs.map((log) => ({
      id: log.id,
      contactId: log.contact_id,
      direction: log.direction,
      triggerType: log.trigger_type,
      scheduleId: log.schedule_id,
      approvalId: log.approval_id,
      eventType: log.event_type,
      messageType: log.message_type,
      status: log.status,
      canvaSource: log.canva_source,
      imagePath: log.image_path,
      caption: log.caption,
      errorMessage: log.error_message,
      retryCount: log.retry_count,
      sentAt: log.sent_at,
      deliveredAt: log.delivered_at,
      readAt: log.read_at,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
      contact: (log.contact_phone || log.contact_display_name)
        ? { phone: log.contact_phone, displayName: log.contact_display_name }
        : null,
    }));

    res.json({
      logs: formatted,
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

module.exports = router;
