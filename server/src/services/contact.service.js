const logger = require('../utils/logger');
const { formatE164 } = require('../utils/phoneFormat');
const { db } = require('../config/database');
const { parse } = require('csv-parse/sync');

class ContactService {
  _formatContact(row) {
    if (!row) return null;
    return {
      id: row.id,
      phone: row.phone,
      displayName: row.display_name,
      firstName: row.first_name,
      lastName: row.last_name,
      nameOnDesign: row.name_on_design,
      tags: row.tags ? JSON.parse(row.tags) : [],
      language: row.language,
      active: !!row.active,
      autoReplyEnabled: !!row.auto_reply_enabled,
      source: row.source,
      stats: {
        totalSent: row.total_sent || 0,
        totalDelivered: row.total_delivered || 0,
        totalRead: row.total_read || 0,
        totalFailed: row.total_failed || 0,
        totalIncoming: row.total_incoming || 0,
      },
      lastMessageSent: row.last_message_sent,
      lastMessageReceived: row.last_message_received,
      lastMessageStatus: row.last_message_status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      groups: row._groups || [],
    };
  }

  _toDbRow(data) {
    const row = {};
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.displayName !== undefined) row.display_name = data.displayName;
    if (data.firstName !== undefined) row.first_name = data.firstName;
    if (data.lastName !== undefined) row.last_name = data.lastName;
    if (data.nameOnDesign !== undefined) row.name_on_design = data.nameOnDesign;
    if (data.tags !== undefined) row.tags = JSON.stringify(data.tags);
    if (data.language !== undefined) row.language = data.language;
    if (data.active !== undefined) row.active = data.active;
    if (data.autoReplyEnabled !== undefined) row.auto_reply_enabled = data.autoReplyEnabled;
    if (data.source !== undefined) row.source = data.source;
    if (data.notes !== undefined) row.notes = data.notes;
    if (data.lastMessageSent !== undefined) row.last_message_sent = data.lastMessageSent;
    if (data.lastMessageReceived !== undefined) row.last_message_received = data.lastMessageReceived;
    if (data.lastMessageStatus !== undefined) row.last_message_status = data.lastMessageStatus;
    return row;
  }

  async _loadGroups(contactId) {
    const rows = await db('contact_groups')
      .join('groups', 'contact_groups.group_id', 'groups.id')
      .where('contact_groups.contact_id', contactId)
      .select('groups.*');
    return rows.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      icon: g.icon,
    }));
  }

  async create(data) {
    data.phone = formatE164(data.phone);
    const existing = await db('contacts').where({ phone: data.phone }).first();
    if (existing) {
      throw new Error(`Contact with phone ${data.phone} already exists`);
    }

    const row = this._toDbRow(data);
    row.created_at = new Date();
    row.updated_at = new Date();

    const [id] = await db('contacts').insert(row);
    const inserted = await db('contacts').where({ id }).first();
    return this._formatContact(inserted);
  }

  async findByPhone(phone) {
    const row = await db('contacts').where({ phone: formatE164(phone) }).first();
    if (!row) return null;
    row._groups = await this._loadGroups(row.id);
    return this._formatContact(row);
  }

  async findById(id) {
    const row = await db('contacts').where({ id }).first();
    if (!row) return null;
    row._groups = await this._loadGroups(row.id);
    return this._formatContact(row);
  }

  async list(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    let baseQuery = db('contacts');

    if (query.search) {
      const search = `%${query.search}%`;
      baseQuery = baseQuery.where(function () {
        this.where('display_name', 'like', search).orWhere('phone', 'like', search);
      });
    }

    if (query.group) {
      const contactIds = db('contact_groups').where('group_id', query.group).select('contact_id');
      baseQuery = baseQuery.whereIn('id', contactIds);
    }

    if (query.tag) {
      baseQuery = baseQuery.whereRaw('JSON_CONTAINS(tags, ?)', [JSON.stringify(query.tag)]);
    }

    if (query.active !== undefined) {
      const isActive = query.active === 'true' || query.active === true;
      baseQuery = baseQuery.where('active', isActive);
    }

    if (query.source) {
      baseQuery = baseQuery.where('source', query.source);
    }

    const countResult = await baseQuery.clone().count('* as count').first();
    const total = countResult.count;

    const rows = await baseQuery.clone().orderBy('display_name', 'asc').limit(limit).offset(offset);

    // Load groups for each contact
    const contacts = [];
    for (const row of rows) {
      row._groups = await this._loadGroups(row.id);
      contacts.push(this._formatContact(row));
    }

    return {
      contacts,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async update(id, data) {
    if (data.phone) {
      data.phone = formatE164(data.phone);
    }
    const row = this._toDbRow(data);
    row.updated_at = new Date();
    await db('contacts').where({ id }).update(row);
    return this.findById(id);
  }

  async delete(id) {
    await db('contact_groups').where('contact_id', id).del();
    await db('message_logs').where('contact_id', id).del();
    return db('contacts').where({ id }).del();
  }

  async bulkUpdate(ids, data) {
    const row = this._toDbRow(data);
    row.updated_at = new Date();
    return db('contacts').whereIn('id', ids).update(row);
  }

  async importCSV(buffer) {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const record of records) {
      try {
        const phone = formatE164(record.phone);
        if (!phone) {
          errors.push({ phone: record.phone, reason: 'Invalid phone number' });
          continue;
        }

        const existing = await db('contacts').where({ phone }).first();
        if (existing) {
          skipped++;
          continue;
        }

        const [contactId] = await db('contacts').insert({
          phone,
          display_name: record.name || phone,
          source: 'csv',
          created_at: new Date(),
          updated_at: new Date(),
        });

        if (record.groups) {
          const groupNames = record.groups.split(';').map((g) => g.trim()).filter(Boolean);
          for (const name of groupNames) {
            let group = await db('groups').where({ name }).first();
            if (!group) {
              const [groupId] = await db('groups').insert({
                name,
                created_at: new Date(),
                updated_at: new Date(),
              });
              group = { id: groupId };
            }
            await db('contact_groups').insert({
              contact_id: contactId,
              group_id: group.id,
            });
          }
        }

        imported++;
      } catch (err) {
        errors.push({ phone: record.phone, reason: err.message });
      }
    }

    logger.info(`CSV import: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
    return { imported, skipped, errors };
  }

  async importVCard(buffer) {
    const text = buffer.toString('utf-8');
    const cards = text.split('BEGIN:VCARD').filter(Boolean);

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const card of cards) {
      try {
        const nameMatch = card.match(/FN[;:](.+)/);
        const telMatch = card.match(/TEL[;:][^\n]*?([\d+\-() ]+)/);

        if (!telMatch) continue;

        const phone = formatE164(telMatch[1]);
        if (!phone) {
          errors.push({ phone: telMatch[1], reason: 'Invalid phone number' });
          continue;
        }

        const existing = await db('contacts').where({ phone }).first();
        if (existing) {
          skipped++;
          continue;
        }

        const displayName = nameMatch ? nameMatch[1].trim() : phone;

        await db('contacts').insert({
          phone,
          display_name: displayName,
          source: 'vcard',
          created_at: new Date(),
          updated_at: new Date(),
        });
        imported++;
      } catch (err) {
        errors.push({ reason: err.message });
      }
    }

    logger.info(`vCard import: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
    return { imported, skipped, errors };
  }

  async autoCreate(phone, msg) {
    const formatted = formatE164(phone);
    const existing = await db('contacts').where({ phone: formatted }).first();
    if (existing) {
      existing._groups = await this._loadGroups(existing.id);
      return this._formatContact(existing);
    }

    logger.info(`Auto-creating contact for ${formatted}`);
    const [id] = await db('contacts').insert({
      phone: formatted,
      display_name: formatted,
      source: 'auto_reply',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await db('contacts').where({ id }).first();
    return this._formatContact(row);
  }

  async findDuplicates() {
    return db('contacts')
      .select('phone')
      .count('* as count')
      .groupBy('phone')
      .having('count', '>', 1);
  }

  async merge(primaryId, secondaryId) {
    const [primary, secondary] = await Promise.all([
      db('contacts').where({ id: primaryId }).first(),
      db('contacts').where({ id: secondaryId }).first(),
    ]);

    if (!primary || !secondary) {
      throw new Error('One or both contacts not found');
    }

    // Merge groups via contact_groups
    const primaryGroupIds = await db('contact_groups')
      .where('contact_id', primaryId)
      .pluck('group_id');
    const secondaryGroupIds = await db('contact_groups')
      .where('contact_id', secondaryId)
      .pluck('group_id');

    const newGroupIds = secondaryGroupIds.filter((gid) => !primaryGroupIds.includes(gid));
    for (const gid of newGroupIds) {
      await db('contact_groups').insert({ contact_id: primaryId, group_id: gid });
    }

    // Merge tags (JSON)
    const primaryTags = primary.tags ? JSON.parse(primary.tags) : [];
    const secondaryTags = secondary.tags ? JSON.parse(secondary.tags) : [];
    const mergedTags = [...new Set([...primaryTags, ...secondaryTags])];

    // Merge stats
    await db('contacts').where({ id: primaryId }).update({
      tags: JSON.stringify(mergedTags),
      total_sent: (primary.total_sent || 0) + (secondary.total_sent || 0),
      total_delivered: (primary.total_delivered || 0) + (secondary.total_delivered || 0),
      total_read: (primary.total_read || 0) + (secondary.total_read || 0),
      total_failed: (primary.total_failed || 0) + (secondary.total_failed || 0),
      total_incoming: (primary.total_incoming || 0) + (secondary.total_incoming || 0),
      updated_at: new Date(),
    });

    // Reassign message logs
    await db('message_logs').where('contact_id', secondaryId).update({ contact_id: primaryId });

    // Delete secondary
    await db('contact_groups').where('contact_id', secondaryId).del();
    await db('contacts').where({ id: secondaryId }).del();

    logger.info(`Merged contact ${secondaryId} into ${primaryId}`);
    return this.findById(primaryId);
  }

  async getHistory(contactId) {
    const rows = await db('message_logs')
      .where('contact_id', contactId)
      .orderBy('created_at', 'desc')
      .limit(100);

    return rows.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      direction: row.direction,
      triggerType: row.trigger_type,
      scheduleId: row.schedule_id,
      eventType: row.event_type,
      messageType: row.message_type,
      status: row.status,
      imagePath: row.image_path,
      caption: row.caption,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

module.exports = new ContactService();
