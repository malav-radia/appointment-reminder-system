// ============================================================
//  CONFIGURATION — Fill in your credentials here
//  Do NOT commit this file to GitHub (add to .gitignore)
// ============================================================

const CONFIG = {

  // --- SUPABASE ---
  // 1. Go to https://supabase.com → Create a free project
  // 2. Settings → API → copy "Project URL" and "anon public" key
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_KEY: "YOUR_SUPABASE_ANON_KEY",

  // --- TWILIO (for SMS/WhatsApp) ---
  // 1. Go to https://twilio.com → Sign up free
  // 2. Dashboard → copy Account SID and Auth Token
  // 3. Get a free Twilio phone number
  // 4. For WhatsApp: activate Sandbox at https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
  TWILIO_ACCOUNT_SID: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  TWILIO_AUTH_TOKEN: "your_auth_token_here",
  TWILIO_FROM_NUMBER: "+1XXXXXXXXXX",   // Your Twilio number (SMS) or "whatsapp:+14155238886" for WhatsApp sandbox

  // Set to true to use WhatsApp sandbox, false for regular SMS
  USE_WHATSAPP: false,

  // --- BACKEND ---
  // If running the Node.js backend locally: "http://localhost:3000"
  // If deployed to Vercel/Render: paste your deployed URL here
  BACKEND_URL: "http://localhost:3000",
};
