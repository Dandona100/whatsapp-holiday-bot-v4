# WhatsApp Holiday Bot — User Guide

## How to Start

```bash
"/Volumes/Extreme SSD/whatsapp-holiday-bot/V4/start.sh"
```

Open browser: **http://localhost:3000**
Login: **admin** / **admin123**

---

## Step 1: Connect WhatsApp

1. Go to **WhatsApp** page
2. Click **Connect / Get QR**
3. Scan QR with your phone (WhatsApp → Settings → Linked Devices)
4. Wait for "Connected" status

After first connection, it reconnects automatically on restart.

---

## Step 2: Sync Contacts & Groups

1. Go to **WhatsApp** page
2. Click **Sync All** — imports contacts and groups from WhatsApp
3. Check **Contacts** page — you should see all your contacts
4. Check **Groups** page — you should see all your WhatsApp groups

---

## Step 3: Create a Template

### Option A: From Canva (recommended)

1. Design a greeting card in **Canva** with `{NAME}` where you want the recipient's name
2. Go to **Templates** page → **Browse Canva**
3. Find your design → click **Use as Template**
4. Choose event type (shabbat, pesach, etc.)
5. Save

### Option B: Upload Image

1. Design a greeting card in any tool (without name)
2. Go to **Templates** → **Add Template**
3. Upload the image
4. Set font, size, color, and X/Y position for where the name should appear
5. Save — the bot will overlay the name using Sharp

---

## Step 4: Send Greetings

### Manual Send (Send Now)

1. Go to **Send Now**
2. Select recipients — individual contacts or entire groups
3. Type a message or select a template
4. Click **Send**
5. Watch the progress bar

### Scheduled Send (Automatic)

1. Go to **Schedules**
2. Click **Add Schedule**
3. Choose:
   - **Event type**: shabbat, pesach, rosh_hashana, etc.
   - **Send time**: e.g., 10:00 (Israel time)
   - **Target groups**: which groups to send to
   - **Template**: which design to use
4. Enable and save
5. The bot sends automatically on erev shabbat/chag!

### Auto-Reply

When someone messages you during shabbat/holiday:
1. Bot prepares a personalized greeting
2. Sends to admin (you) for approval via WhatsApp
3. You reply ✅ to approve or ❌ to reject
4. Bot sends the greeting

Configure in **Settings → Auto-Reply**.

---

## Step 5: Connect Canva (Optional)

1. Go to **Settings**
2. Click **Connect Canva**
3. Authorize in Canva
4. Now you can browse and use Canva designs as templates

---

## Pages Overview

| Page | What it does |
|------|-------------|
| **Dashboard** | Overview: stats, WhatsApp status, next event |
| **WhatsApp** | Connection, QR, sync contacts/groups/chats |
| **Contacts** | Manage contacts, search, edit names, import CSV |
| **Groups** | Manage groups, view members |
| **Templates** | Create/manage greeting templates, Canva integration |
| **Schedules** | Set up automatic sending for shabbat/holidays |
| **Approvals** | Review and approve/reject auto-reply messages |
| **Send Now** | Send greetings manually to selected recipients |
| **Reports** | Message logs, delivery stats, charts |
| **Settings** | WhatsApp, Auto-Reply, Canva, Telegram, Backup |

---

## Hebrew Calendar Events

The bot automatically detects these events:

| Event | Default Time | Greeting |
|-------|-------------|----------|
| Shabbat | Friday 10:00 | שבת שלום |
| Rosh Hashana | Erev 09:00 | שנה טובה |
| Yom Kippur | Erev 08:00 | גמר חתימה טובה |
| Sukkot | Erev 10:00 | חג שמח |
| Simchat Torah | Erev 10:00 | חג שמח |
| Chanukah | Day 1 10:00 | חנוכה שמח |
| Purim | Day 08:00 | פורים שמח |
| Pesach | Erev 09:00 | פסח כשר ושמח |
| Yom HaAtzmaut | Erev 10:00 | חג שמח |
| Shavuot | Erev 10:00 | חג שמח |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| WhatsApp stuck on "Connecting" | Restart bot, wait 30s for QR |
| QR code not appearing | Kill Chrome processes: `pkill -f "Google Chrome for Testing"` |
| "Rate limited" errors | Wait 15 minutes, or restart bot |
| Canva "Unauthorized" | Settings → Reconnect Canva |
| Template preview not loading | Make sure template has an uploaded image |
| Bot won't start | Check MySQL: `docker start whatsapp-bot-mysql` |
