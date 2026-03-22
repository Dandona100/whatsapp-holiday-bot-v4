const cron = require('node-cron');
const logger = require('../utils/logger');
const { getCurrentEventType, getUpcomingEvents } = require('../utils/hebrewCalendar');
const { buildCaption } = require('../utils/caption');
const { db } = require('../config/database');

const TIMEZONE = 'Asia/Jerusalem';

class SchedulerService {
  constructor(senderService) {
    this.senderService = senderService;
    this.jobs = new Map();
  }

  async initialize() {
    const schedules = await db('schedules').where({ enabled: true });
    for (const schedule of schedules) {
      this._createCronJob(schedule);
    }
    logger.info(`Scheduler initialized with ${schedules.length} active schedules`);

    cron.schedule('0 0 * * *', async () => {
      logger.info('Running daily schedule cleanup');
      const scheduleList = await db('schedules').where({ enabled: true });
      const activeIds = scheduleList.map((s) => s.id);
      for (const [id] of this.jobs) {
        if (!activeIds.includes(parseInt(id, 10))) {
          this.removeSchedule(id);
        }
      }
    }, { timezone: TIMEZONE });
  }

  _createCronJob(schedule) {
    const id = String(schedule.id);
    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
    }

    const sendTime = schedule.send_time || schedule.sendTime || '10:00';
    const [hour, minute] = sendTime.split(':');
    const cronExpr = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;

    const job = cron.schedule(cronExpr, async () => {
      try {
        const eventType = getCurrentEventType();
        const scheduleEventType = schedule.event_type || schedule.eventType;
        if (!eventType || eventType !== scheduleEventType) return;

        logger.info(`Schedule ${id} triggered for event: ${eventType}`);

        let contactsQuery = db('contacts').where('active', true);

        // Filter by target groups via schedule_groups join
        const targetGroupIds = await db('schedule_groups')
          .where('schedule_id', schedule.id)
          .pluck('group_id');

        if (targetGroupIds.length > 0) {
          const contactIds = await db('contact_groups')
            .whereIn('group_id', targetGroupIds)
            .pluck('contact_id');
          contactsQuery = contactsQuery.whereIn('id', contactIds);
        }

        // Exclude contacts via schedule_excluded_contacts
        const excludeContactIds = await db('schedule_excluded_contacts')
          .where('schedule_id', schedule.id)
          .pluck('contact_id');

        if (excludeContactIds.length > 0) {
          contactsQuery = contactsQuery.whereNotIn('id', excludeContactIds);
        }

        const contacts = await contactsQuery;
        if (contacts.length === 0) {
          logger.info(`Schedule ${id}: no matching contacts`);
          return;
        }

        const formattedContacts = contacts.map((c) => ({
          id: c.id,
          phone: c.phone,
          displayName: c.display_name,
          firstName: c.first_name,
          lastName: c.last_name,
          nameOnDesign: c.name_on_design,
        }));

        await this._sendToContacts(formattedContacts, schedule);
        await db('schedules').where({ id: schedule.id }).update({
          last_run: new Date(),
          updated_at: new Date(),
        });
      } catch (err) {
        logger.error(`Schedule ${id} execution failed: ${err.message}`);
      }
    }, { timezone: TIMEZONE });

    this.jobs.set(id, job);
    logger.info(`Cron job created for schedule ${id} at ${sendTime}`);
  }

  async _sendToContacts(contacts, schedule) {
    const captionTemplate = schedule.caption_template || schedule.captionTemplate;
    const contentFn = (contact) => {
      const caption = buildCaption(captionTemplate, contact);
      if (schedule.template) {
        const imagePath = typeof schedule.template === 'object'
          ? schedule.template.imagePath || schedule.template.image_path
          : null;
        if (imagePath) {
          return { imagePath, caption };
        }
      }
      return { text: caption };
    };

    return this.senderService.sendBulk(contacts, contentFn, {
      triggerType: 'scheduled',
      scheduleId: schedule.id,
      eventType: schedule.event_type || schedule.eventType,
    });
  }

  async addSchedule(data) {
    const row = {
      event_type: data.eventType,
      name: data.name,
      enabled: data.enabled !== undefined ? data.enabled : true,
      send_time: data.sendTime || '10:00',
      caption_template: data.captionTemplate,
      use_personalization: data.usePersonalization !== undefined ? data.usePersonalization : true,
      template_id: data.templateId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [id] = await db('schedules').insert(row);
    const saved = await db('schedules').where({ id }).first();

    // Insert target groups
    if (data.targetGroups && data.targetGroups.length > 0) {
      const groupRows = data.targetGroups.map((groupId) => ({
        schedule_id: id,
        group_id: groupId,
      }));
      await db('schedule_groups').insert(groupRows);
    }

    // Insert excluded contacts
    if (data.excludeContacts && data.excludeContacts.length > 0) {
      const excludeRows = data.excludeContacts.map((contactId) => ({
        schedule_id: id,
        contact_id: contactId,
      }));
      await db('schedule_excluded_contacts').insert(excludeRows);
    }

    if (saved.enabled) {
      this._createCronJob(saved);
    }
    return saved;
  }

  removeSchedule(id) {
    const strId = String(id);
    const job = this.jobs.get(strId);
    if (job) {
      job.stop();
      this.jobs.delete(strId);
      logger.info(`Cron job removed for schedule ${strId}`);
    }
  }

  async updateSchedule(data) {
    const id = data.id;
    const row = {};
    if (data.eventType !== undefined) row.event_type = data.eventType;
    if (data.name !== undefined) row.name = data.name;
    if (data.enabled !== undefined) row.enabled = data.enabled;
    if (data.sendTime !== undefined) row.send_time = data.sendTime;
    if (data.captionTemplate !== undefined) row.caption_template = data.captionTemplate;
    if (data.usePersonalization !== undefined) row.use_personalization = data.usePersonalization;
    if (data.templateId !== undefined) row.template_id = data.templateId;
    row.updated_at = new Date();

    await db('schedules').where({ id }).update(row);

    // Update target groups
    if (data.targetGroups !== undefined) {
      await db('schedule_groups').where('schedule_id', id).del();
      if (data.targetGroups.length > 0) {
        const groupRows = data.targetGroups.map((groupId) => ({
          schedule_id: id,
          group_id: groupId,
        }));
        await db('schedule_groups').insert(groupRows);
      }
    }

    // Update excluded contacts
    if (data.excludeContacts !== undefined) {
      await db('schedule_excluded_contacts').where('schedule_id', id).del();
      if (data.excludeContacts.length > 0) {
        const excludeRows = data.excludeContacts.map((contactId) => ({
          schedule_id: id,
          contact_id: contactId,
        }));
        await db('schedule_excluded_contacts').insert(excludeRows);
      }
    }

    const updated = await db('schedules').where({ id }).first();
    this.removeSchedule(id);
    if (updated.enabled) {
      this._createCronJob(updated);
    }
    return updated;
  }

  async getUpcoming() {
    const events = getUpcomingEvents(30);
    const schedules = await db('schedules').where({ enabled: true });

    return events
      .filter((ev) => schedules.some((s) => (s.event_type || s.eventType) === ev.eventType))
      .map((ev) => {
        const matching = schedules.filter((s) => (s.event_type || s.eventType) === ev.eventType);
        return { ...ev, schedules: matching };
      });
  }

  async runNow(scheduleId) {
    const schedule = await db('schedules').where({ id: scheduleId }).first();
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Load template if referenced
    if (schedule.template_id) {
      schedule.template = await db('templates').where({ id: schedule.template_id }).first();
    }

    let contactsQuery = db('contacts').where('active', true);

    const targetGroupIds = await db('schedule_groups')
      .where('schedule_id', scheduleId)
      .pluck('group_id');

    if (targetGroupIds.length > 0) {
      const contactIds = await db('contact_groups')
        .whereIn('group_id', targetGroupIds)
        .pluck('contact_id');
      contactsQuery = contactsQuery.whereIn('id', contactIds);
    }

    const excludeContactIds = await db('schedule_excluded_contacts')
      .where('schedule_id', scheduleId)
      .pluck('contact_id');

    if (excludeContactIds.length > 0) {
      contactsQuery = contactsQuery.whereNotIn('id', excludeContactIds);
    }

    const contacts = await contactsQuery;
    const formattedContacts = contacts.map((c) => ({
      id: c.id,
      phone: c.phone,
      displayName: c.display_name,
      firstName: c.first_name,
      lastName: c.last_name,
      nameOnDesign: c.name_on_design,
    }));

    logger.info(`Manual run for schedule ${scheduleId}: ${formattedContacts.length} contacts`);

    const result = await this._sendToContacts(formattedContacts, schedule);
    await db('schedules').where({ id: scheduleId }).update({
      last_run: new Date(),
      updated_at: new Date(),
    });
    return result;
  }
}

module.exports = SchedulerService;
