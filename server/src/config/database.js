const knex = require('knex');
const bcrypt = require('bcryptjs');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'whatsapp_bot',
    password: process.env.MYSQL_PASSWORD || 'botpass123',
    database: process.env.MYSQL_DATABASE || 'whatsapp_holiday_bot',
    typeCast: function (field, next) {
      if (field.type === 'TINY' && field.length === 1) {
        return field.string() === '1';
      }
      return next();
    },
  },
  pool: { min: 2, max: 10 },
});

async function initTables() {
  // users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('username', 255).unique().notNullable();
      t.string('password', 255).notNullable();
      t.string('role', 50).defaultTo('admin');
      t.timestamps(true, true);
    });
  }

  // contacts
  if (!(await db.schema.hasTable('contacts'))) {
    await db.schema.createTable('contacts', (t) => {
      t.increments('id').primary();
      t.string('phone', 30).unique().notNullable();
      t.string('display_name', 255);
      t.string('first_name', 255);
      t.string('last_name', 255);
      t.string('name_on_design', 255);
      t.json('tags');
      t.string('language', 5).defaultTo('he');
      t.boolean('active').defaultTo(true);
      t.boolean('auto_reply_enabled').defaultTo(true);
      t.string('source', 50);
      t.integer('total_sent').defaultTo(0);
      t.integer('total_delivered').defaultTo(0);
      t.integer('total_read').defaultTo(0);
      t.integer('total_failed').defaultTo(0);
      t.integer('total_incoming').defaultTo(0);
      t.datetime('last_message_sent');
      t.datetime('last_message_received');
      t.string('last_message_status', 50);
      t.text('notes');
      t.timestamps(true, true);
    });
  }

  // templates (must be created before groups and schedules which reference it)
  if (!(await db.schema.hasTable('templates'))) {
    await db.schema.createTable('templates', (t) => {
      t.increments('id').primary();
      t.string('name', 255);
      t.string('event_type', 50);
      t.string('canva_design_id', 255);
      t.string('canva_brand_template_id', 255);
      t.string('placeholder_field', 100).defaultTo('{NAME}');
      t.text('preview_url');
      t.string('export_format', 10).defaultTo('png');
      t.integer('export_width').defaultTo(1080);
      t.integer('export_height').defaultTo(1080);
      t.text('local_fallback_path');
      t.string('font_family', 100).defaultTo('Arial');
      t.integer('font_size').defaultTo(48);
      t.string('font_color', 20).defaultTo('#FFFFFF');
      t.integer('name_x').defaultTo(540);
      t.integer('name_y').defaultTo(900);
      t.text('svg_template_path');
      t.boolean('active').defaultTo(true);
      t.integer('usage_count').defaultTo(0);
      t.datetime('last_used');
      t.timestamps(true, true);
    });
  }

  // Add svg_template_path column if missing (existing databases)
  if (await db.schema.hasTable('templates')) {
    const hasSvgCol = await db.schema.hasColumn('templates', 'svg_template_path');
    if (!hasSvgCol) {
      await db.schema.alterTable('templates', (t) => {
        t.text('svg_template_path').after('local_fallback_path');
      });
      console.log('[MySQL] Added svg_template_path column to templates');
    }
  }

  // groups
  if (!(await db.schema.hasTable('groups'))) {
    await db.schema.createTable('groups', (t) => {
      t.increments('id').primary();
      t.string('name', 255).unique().notNullable();
      t.text('description');
      t.string('color', 50);
      t.string('icon', 50);
      t.boolean('auto_send_shabbat').defaultTo(true);
      t.boolean('auto_send_holiday').defaultTo(true);
      t.boolean('auto_reply_enabled').defaultTo(true);
      t.integer('default_template_id').unsigned().references('id').inTable('templates').onDelete('SET NULL');
      t.timestamps(true, true);
    });
  }

  // contact_groups (join table)
  if (!(await db.schema.hasTable('contact_groups'))) {
    await db.schema.createTable('contact_groups', (t) => {
      t.integer('contact_id').unsigned().notNullable().references('id').inTable('contacts').onDelete('CASCADE');
      t.integer('group_id').unsigned().notNullable().references('id').inTable('groups').onDelete('CASCADE');
      t.primary(['contact_id', 'group_id']);
    });
  }

  // schedules
  if (!(await db.schema.hasTable('schedules'))) {
    await db.schema.createTable('schedules', (t) => {
      t.increments('id').primary();
      t.string('event_type', 50);
      t.string('name', 255);
      t.boolean('enabled').defaultTo(true);
      t.string('send_time', 10).defaultTo('10:00');
      t.integer('template_id').unsigned().references('id').inTable('templates').onDelete('SET NULL');
      t.text('caption_template');
      t.boolean('use_personalization').defaultTo(true);
      t.datetime('last_run');
      t.datetime('next_run');
      t.timestamps(true, true);
    });
  }

  // schedule_groups (join table)
  if (!(await db.schema.hasTable('schedule_groups'))) {
    await db.schema.createTable('schedule_groups', (t) => {
      t.integer('schedule_id').unsigned().notNullable().references('id').inTable('schedules').onDelete('CASCADE');
      t.integer('group_id').unsigned().notNullable().references('id').inTable('groups').onDelete('CASCADE');
      t.primary(['schedule_id', 'group_id']);
    });
  }

  // schedule_excluded_contacts (join table)
  if (!(await db.schema.hasTable('schedule_excluded_contacts'))) {
    await db.schema.createTable('schedule_excluded_contacts', (t) => {
      t.integer('schedule_id').unsigned().notNullable().references('id').inTable('schedules').onDelete('CASCADE');
      t.integer('contact_id').unsigned().notNullable().references('id').inTable('contacts').onDelete('CASCADE');
      t.primary(['schedule_id', 'contact_id']);
    });
  }

  // pending_approvals (must be created before message_logs which references it)
  if (!(await db.schema.hasTable('pending_approvals'))) {
    await db.schema.createTable('pending_approvals', (t) => {
      t.increments('id').primary();
      t.integer('contact_id').unsigned().notNullable().references('id').inTable('contacts').onDelete('CASCADE');
      t.string('trigger_type', 50).defaultTo('incoming_message');
      t.text('incoming_body');
      t.datetime('incoming_timestamp');
      t.boolean('incoming_has_media').defaultTo(false);
      t.text('image_path');
      t.string('image_source', 20);
      t.text('caption');
      t.integer('template_id').unsigned().references('id').inTable('templates').onDelete('SET NULL');
      t.string('status', 50).defaultTo('pending');
      t.json('admin_notified_via');
      t.string('admin_decision', 20);
      t.datetime('admin_responded_at');
      t.string('admin_responded_via', 50);
      t.text('admin_edited_caption');
      t.datetime('expires_at');
      t.datetime('sent_at');
      t.timestamps(true, true);

      t.index(['status', 'expires_at']);
      t.index(['contact_id', 'status']);
    });
  }

  // message_logs
  if (!(await db.schema.hasTable('message_logs'))) {
    await db.schema.createTable('message_logs', (t) => {
      t.increments('id').primary();
      t.integer('contact_id').unsigned().notNullable().references('id').inTable('contacts').onDelete('CASCADE');
      t.string('direction', 20);
      t.string('trigger_type', 50).defaultTo('scheduled');
      t.integer('schedule_id').unsigned().references('id').inTable('schedules').onDelete('SET NULL');
      t.integer('approval_id').unsigned().references('id').inTable('pending_approvals').onDelete('SET NULL');
      t.string('event_type', 50);
      t.string('message_type', 50);
      t.string('status', 50).defaultTo('queued');
      t.string('canva_source', 20);
      t.text('image_path');
      t.text('caption');
      t.text('error_message');
      t.integer('retry_count').defaultTo(0);
      t.datetime('sent_at');
      t.datetime('delivered_at');
      t.datetime('read_at');
      t.timestamps(true, true);

      t.index('contact_id');
      t.index('status');
      t.index('event_type');
    });
  }

  // settings
  if (!(await db.schema.hasTable('settings'))) {
    await db.schema.createTable('settings', (t) => {
      t.increments('id').primary();
      t.string('key_', 100).unique().defaultTo('global');
      t.json('data');
      t.timestamps(true, true);
    });
  }

  // whatsapp_sessions
  if (!(await db.schema.hasTable('whatsapp_sessions'))) {
    await db.schema.createTable('whatsapp_sessions', (t) => {
      t.increments('id').primary();
      t.string('session_id', 255).unique();
      t.specificType('data', 'longtext');
      t.timestamps(true, true);
    });
  }

  // Seed default admin user if not exists
  const adminExists = await db('users').where('username', process.env.ADMIN_USERNAME || 'admin').first();
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt);
    await db('users').insert({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('[MySQL] Default admin user seeded');
  }

  // Seed default settings if not exists
  const settingsExist = await db('settings').where('key_', 'global').first();
  if (!settingsExist) {
    await db('settings').insert({
      key_: 'global',
      data: JSON.stringify({
        whatsapp: {
          rateLimit: parseInt(process.env.WA_RATE_LIMIT, 10) || 30,
          delayMin: parseInt(process.env.WA_DELAY_MIN, 10) || 3000,
          delayMax: parseInt(process.env.WA_DELAY_MAX, 10) || 8000,
          maxRetries: parseInt(process.env.WA_MAX_RETRIES, 10) || 3,
        },
        autoReply: {
          enabled: process.env.AUTO_REPLY_ENABLED !== 'false',
          adminPhone: process.env.ADMIN_PHONE || '',
          approvalTimeout: parseInt(process.env.AUTO_REPLY_TIMEOUT_MINUTES, 10) || 240,
          cooldownHours: parseInt(process.env.AUTO_REPLY_COOLDOWN_HOURS, 10) || 24,
          activeWindow: {
            start: process.env.AUTO_REPLY_WINDOW_START || '07:00',
            end: process.env.AUTO_REPLY_WINDOW_END || '22:00',
          },
          autoAddContacts: true,
          notifyVia: ['whatsapp', 'websocket'],
        },
        sending: {
          defaultSendTime: '10:00',
        },
      }),
    });
    console.log('[MySQL] Default settings seeded');
  }
}

async function connect() {
  try {
    await db.raw('SELECT 1');
    console.log('[MySQL] Connection established');
    await initTables();
    console.log('[MySQL] All tables initialized');
  } catch (err) {
    console.error('[MySQL] Connection failed:', err.message);
    throw err;
  }
}

module.exports = { db, connect, initTables };
