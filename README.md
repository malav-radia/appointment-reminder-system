# Appointment Reminder System
### Built for: Better Call Centers Practical Test

A complete WhatsApp/SMS appointment reminder system with a booking form, live database, automatic messaging, and a real-time dashboard.

---

## What This App Does

1. **Booking form** — Enter a customer name, phone number, appointment time, and notes.
2. **Database save** — Every appointment is saved to Supabase (PostgreSQL) in real time.
3. **Confirmation message** — The moment the form is submitted, Twilio sends an SMS or WhatsApp message to the customer confirming their appointment.
4. **Live dashboard** — Shows all appointments pulled live from the database, auto-refreshing every 30 seconds.
5. **BONUS: Automatic reminder** — A background cron job runs every minute and sends a reminder message to any customer whose appointment is within the next hour (only once per appointment).

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Plain HTML + JavaScript | Simple, fast, no build step |
| Backend | Node.js + Express | Lightweight API server |
| Database | Supabase (PostgreSQL) | Free tier, real-time, reliable |
| Messaging | Twilio SMS or WhatsApp sandbox | Free trial, easy API |
| Scheduling | node-cron | Runs reminder check every minute |

---

## Setup Instructions (Step by Step)

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → Sign up free → Create a new project.
2. Go to **Table Editor** → Click **New Table** → Name it `appointments`.
3. Add these columns:

| Column name | Type | Notes |
|---|---|---|
| id | int8 | Primary key, auto-increment |
| customer_name | text | |
| phone | text | |
| appt_time | timestamptz | |
| notes | text | Nullable |
| message_status | text | Default: 'pending' |
| message_sid | text | Nullable |
| reminder_sent | timestamptz | Nullable |
| created_at | timestamptz | Default: now() |

4. Go to **Settings → API** → Copy your **Project URL** and **anon public** key.

---

### Step 2 — Set up Twilio

1. Go to [twilio.com](https://twilio.com) → Sign up for free trial.
2. From the dashboard, copy your **Account SID** and **Auth Token**.
3. Get a free Twilio phone number (for SMS).
4. **For WhatsApp:** Go to Console → Messaging → Try it Out → Send a WhatsApp Message → Follow the sandbox instructions. Set `USE_WHATSAPP=true` in your `.env`.

---

### Step 3 — Configure the project

1. Copy `.env.example` to a new file called `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase URL, Supabase key, Twilio SID, Twilio token, and Twilio phone number.

3. Open `config.js` and update `BACKEND_URL` to `http://localhost:3000` for local development.

---

### Step 4 — Install and run

```bash
npm install
npm start
```

Open your browser at: **http://localhost:3000**

---

## How the Data Flows

```
User fills form
      ↓
POST /api/appointments (Express server)
      ↓
Save to Supabase → appointments table
      ↓
Twilio API call → SMS/WhatsApp sent to customer
      ↓
Supabase updated: message_status = 'sent'
      ↓
Dashboard (GET /api/appointments) reads live from Supabase
      ↓
Auto-refresh every 30 seconds

BONUS (background):
node-cron runs every 60 seconds
      ↓
Query Supabase: appointments in next 60 min where reminder_sent IS NULL
      ↓
Send reminder via Twilio
      ↓
Update reminder_sent timestamp in Supabase
```

---

## Hardest Part Solved

The trickiest part was handling the case where the database save succeeds but the Twilio message fails (e.g., invalid phone number, API error). Rather than rolling back the entire transaction or crashing, the server logs the messaging error but still returns a 200 response with `message_status: 'send_failed'` — so the appointment is always saved, and the status is honest. The dashboard can show this state clearly so the team knows to follow up manually.

---

## Time Taken

Approximately 6–8 hours total: 1 hour planning and reading docs, 4 hours coding and testing, 1–2 hours debugging Twilio sandbox setup and Supabase table configuration.

---

## Author

Built by [Your Name] for the Better Call Centers AI Automation Developer Internship practical test.
