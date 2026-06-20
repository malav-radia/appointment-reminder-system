# 📅 Appointment Reminder System

A full-stack WhatsApp appointment management system with two-way conversation handling, multi-stage automated reminders, and a live operations dashboard — built end-to-end with Node.js, Supabase, and Twilio.

**🔗 Live demo:** [appointment-reminder-system.onrender.com](https://appointment-reminder-system.onrender.com)
*(Free tier — first load may take 30-50 seconds to wake up)*

---

## What it does

This isn't just a "send a message" demo — it's a closed-loop system where the database, messaging, and dashboard all stay in sync automatically:

- 📝 **Book appointments** through a simple web form
- 💬 **Instant WhatsApp confirmation** sent via Twilio the moment a booking is made
- 🔄 **Two-way conversation** — when a customer replies `CONFIRM` or `CANCEL` on WhatsApp, the system listens via webhook and updates the database in real time
- ⏰ **Multi-stage reminders** — automatic reminders sent 24 hours and 1 hour before the appointment
- 🚨 **No-response escalation** — if a customer doesn't reply within 30 minutes of the 1-hour reminder, the appointment is automatically flagged as `no_response`
- 📊 **Live dashboard** — search, filter by status, edit, or cancel appointments — all reading live from the database, sorted by priority (confirmed → pending → no response → cancelled)
- ✏️ **Full CRUD** — create, read, update, and cancel appointments directly from the dashboard

---

## Architecture

```
┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Browser    │ ──────► │  Node.js/Express │ ──────► │   Supabase   │
│  (Frontend)  │ ◄────── │     Backend      │ ◄────── │ (PostgreSQL) │
└──────────────┘         └─────────────────┘         └──────────────┘
                                  │      ▲
                                  ▼      │
                          ┌──────────────────┐
                          │   Twilio API     │
                          │  (WhatsApp/SMS)  │
                          └──────────────────┘
                                  │      ▲
                                  ▼      │
                          ┌──────────────────┐
                          │  Customer's      │
                          │   WhatsApp       │
                          └──────────────────┘
```

**The full message loop:**
1. Customer books → saved to Supabase → confirmation sent via Twilio
2. Customer replies `CONFIRM`/`CANCEL` on WhatsApp → Twilio forwards it to `/webhook/whatsapp` → status updated in Supabase
3. A cron job runs every minute, checking three independent conditions: 24h reminder due, 1h reminder due, or 30-min escalation due
4. Dashboard polls the database every 30 seconds and re-renders — always showing live state, never stale or hardcoded data

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Plain HTML + JavaScript | No build step, fast to iterate |
| Backend | Node.js + Express | Lightweight, handles persistent cron jobs (unlike serverless) |
| Database | Supabase (PostgreSQL) | Free tier, hosted, real REST API out of the box |
| Messaging | Twilio WhatsApp API | Industry standard, supports both sending and receiving |
| Scheduling | node-cron | Runs reminder/escalation checks every minute |
| Hosting | Render | Free tier supports long-running Node processes (Vercel/serverless can't run persistent cron jobs) |

---

## Database Schema

`appointments` table:

| Column | Type | Purpose |
|---|---|---|
| `id` | int8 (identity) | Primary key |
| `customer_name` | text | Customer's name |
| `phone` | text | WhatsApp/SMS number |
| `appt_time` | timestamptz | Scheduled appointment time |
| `notes` | text | Optional notes |
| `status` | text | `pending` / `confirmed` / `cancelled` / `no_response` |
| `message_status` | text | Whether the initial confirmation message sent successfully |
| `message_sid` | text | Twilio message ID for tracking |
| `reminder_24h_sent` | timestamptz | When the 24-hour reminder was sent |
| `reminder_1h_sent` | timestamptz | When the 1-hour reminder was sent |
| `escalation_sent` | timestamptz | When the no-reply escalation triggered |
| `customer_replied_at` | timestamptz | When the customer's reply was received |
| `created_at` | timestamptz | Record creation time |

---

## Setup Instructions

### 1. Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Create the `appointments` table with the schema above
3. Copy your Project URL and anon public key from **Settings → API**

### 2. Twilio
1. Sign up free at [twilio.com](https://twilio.com)
2. Activate the WhatsApp Sandbox (**Messaging → Try it Out → WhatsApp**)
3. Copy your Account SID and Auth Token
4. Set the sandbox's **"When a message comes in"** webhook to:
   ```
   https://your-deployed-url.onrender.com/webhook/whatsapp
   ```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in:
```
SUPABASE_URL=
SUPABASE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
USE_WHATSAPP=true
PORT=3000
```

### 4. Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000`

### 5. Deploy
Deployed on [Render](https://render.com) as a free Web Service:
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables added in Render's dashboard

---

## What I'd build next

- Replace the polling dashboard with Supabase real-time subscriptions (WebSocket-based, no 30-second delay)
- Add authentication so the dashboard isn't publicly accessible
- Move from Twilio's shared WhatsApp sandbox to a verified business number for production use
- Use a proper job queue (Bull/Redis) instead of a blanket every-minute cron once appointment volume grows

---

## Author

Built by Malav Radia — [GitHub](https://github.com/malav-radia)
