// server.js — Backend for Appointment Reminder System
// Run with: node server.js
// Requires: npm install express cors @supabase/supabase-js twilio node-cron dotenv

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const twilio  = require('twilio');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── Serve the frontend (index.html, app.js, config.js) ──────────────────────
app.use(express.static(path.join(__dirname)));

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Twilio client ────────────────────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.USE_WHATSAPP === 'true'
  ? `whatsapp:${process.env.TWILIO_FROM_NUMBER}`
  : process.env.TWILIO_FROM_NUMBER;

// ── Helper: format phone for WhatsApp ────────────────────────────────────────
function formatTo(phone) {
  const clean = phone.replace(/\s+/g, '');
  return process.env.USE_WHATSAPP === 'true' ? `whatsapp:${clean}` : clean;
}

// ── Helper: send message via Twilio ─────────────────────────────────────────
async function sendMessage(toPhone, body) {
  const message = await twilioClient.messages.create({
    from: FROM_NUMBER,
    to:   formatTo(toPhone),
    body: body,
  });
  console.log(`[MSG SENT] To: ${toPhone} | SID: ${message.sid}`);
  return message.sid;
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/appointments — Save new appointment + send confirmation
// ────────────────────────────────────────────────────────────────────────────
app.post('/api/appointments', async (req, res) => {
  const { name, phone, appt_time, notes } = req.body;

  if (!name || !phone || !appt_time) {
    return res.status(400).json({ error: 'name, phone, and appt_time are required.' });
  }

  try {
    // 1. Save appointment to Supabase
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        customer_name:  name,
        phone:          phone,
        appt_time:      appt_time,
        notes:          notes || null,
        message_status: 'pending',
        created_at:     new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Format a human-readable date for the message
    const apptDate = new Date(appt_time);
    const dateStr  = apptDate.toLocaleString('en-IN', {
      weekday: 'long', day: '2-digit', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // 3. Send confirmation message via Twilio
    const msgBody = `Hi ${name}! ✅ Your appointment is confirmed for ${dateStr}. Reply CONFIRM to confirm or CANCEL to cancel. — Better Call Centers`;

    let messageSid = null;
    try {
      messageSid = await sendMessage(phone, msgBody);

      // 4. Update message_status to 'sent' in Supabase
      await supabase
        .from('appointments')
        .update({ message_status: 'sent', message_sid: messageSid })
        .eq('id', data.id);

    } catch (msgErr) {
      // Message failed — log but don't crash the whole request
      console.error('[MSG ERROR]', msgErr.message);
      // Still return success for the DB save, but note the message issue
      return res.status(200).json({
        ...data,
        message_status: 'send_failed',
        message_error:  msgErr.message
      });
    }

    return res.status(201).json({ ...data, message_status: 'sent', message_sid: messageSid });

  } catch (err) {
    console.error('[DB ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/appointments — Fetch all appointments from Supabase (live)
// ────────────────────────────────────────────────────────────────────────────
app.get('/api/appointments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appt_time', { ascending: true });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[FETCH ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// BONUS: Cron job — every minute, check for appointments within 1 hour
// and send a reminder if not already reminded
// ────────────────────────────────────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const now      = new Date();
  const oneHour  = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: upcoming, error } = await supabase
    .from('appointments')
    .select('*')
    .gte('appt_time', now.toISOString())
    .lte('appt_time', oneHour.toISOString())
    .is('reminder_sent', null);   // Only those not yet reminded

  if (error) { console.error('[CRON ERROR]', error.message); return; }

  for (const appt of upcoming) {
    const dateStr = new Date(appt.appt_time).toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
    const reminderMsg = `⏰ Reminder: Hi ${appt.customer_name}, your appointment is in less than 1 hour at ${dateStr}. See you soon! — Better Call Centers`;

    try {
      await sendMessage(appt.phone, reminderMsg);
      await supabase
        .from('appointments')
        .update({ reminder_sent: new Date().toISOString() })
        .eq('id', appt.id);
      console.log(`[REMINDER SENT] → ${appt.customer_name} (${appt.phone})`);
    } catch (err) {
      console.error(`[REMINDER FAIL] ${appt.customer_name}: ${err.message}`);
    }
  }
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Appointment Reminder Server running at http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/index.html`);
  console.log(`   API:       http://localhost:${PORT}/api/appointments`);
  console.log(`   Reminder cron: checking every minute for upcoming appointments\n`);
});
