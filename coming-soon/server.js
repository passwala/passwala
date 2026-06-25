import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from root folder's .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3006;

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const rawSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const cleanEnvVar = (val) => {
  if (!val) return val;
  return val.replace(/^\uFEFF/, '').trim();
};

const supabaseUrl = cleanEnvVar(rawSupabaseUrl);
const supabaseKey = cleanEnvVar(rawSupabaseKey);

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// SMTP configuration with BOM cleaning
const rawSmtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const rawSmtpPort = process.env.SMTP_PORT || '587';
const rawSmtpUser = process.env.SMTP_USER;
const rawSmtpPass = process.env.SMTP_PASS;

const smtpHost = cleanEnvVar(rawSmtpHost);
const smtpPort = parseInt(cleanEnvVar(rawSmtpPort) || '587');
const smtpUser = cleanEnvVar(rawSmtpUser);
const smtpPass = cleanEnvVar(rawSmtpPass);

const transporter = (smtpUser && smtpPass) ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
}) : null;

// In-memory set to prevent duplicate emails during fallback mode
const fallbackSignups = new Set();

// Premium HTML Email Template Generator
const getWelcomeEmailHtml = (email) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Passwala</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #050811;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #ffffff;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #050811;
          padding: 40px 20px;
          box-sizing: border-box;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #0d1222;
          border-radius: 24px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 107, 0, 0.25);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        .header {
          padding: 40px 40px 20px 40px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          letter-spacing: -0.5px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .logo .brand-light { color: #ffffff; font-weight: 300; }
        .logo .brand-orange { color: #ff6b00; font-weight: 600; }
        .logo .brand-dot { color: #ff6b00; }
        .badge {
          display: inline-block;
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid #ff6b00;
          color: #ff6b00;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .content {
          padding: 0 40px 40px 40px;
          text-align: center;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 20px 0 10px 0;
          color: #ffffff;
          line-height: 1.3;
        }
        p {
          font-size: 15px;
          line-height: 1.6;
          color: #cbd5e1;
          margin: 0 0 24px 0;
        }
        .btn {
          display: inline-block;
          background: #ff6b00;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 30px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 10px;
          box-shadow: 0 10px 20px rgba(255, 107, 0, 0.2);
        }
        .footer {
          background: #090c16;
          padding: 30px 40px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer p {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 8px 0;
        }
        .footer a {
          color: #ff6b00;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">
              <span class="brand-light">Pass</span><span class="brand-orange">wala</span><span class="brand-dot">.</span>
            </div>
            <div class="badge">Namaste India</div>
          </div>
          <div class="content">
            <h1>You are on the Exclusive List! 🎉</h1>
            <p>Thank you for subscribing to early access. We are preparing India's smartest neighborhood app to bring you a community-driven marketplace and a smart local economy platform designed for modern urban neighborhoods.</p>
            
            <p style="margin-bottom: 0;">We'll drop you an update as soon as we launch in your area.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Passwala. All rights reserved.</p>
            <p>Made with ❤️ in India</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to capture email notifications
app.post('/api/notify', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    if (fallbackSignups.has(trimmedEmail)) {
      return res.status(200).json({ success: true, alreadyRegistered: true, message: 'You are already registered!' });
    }
    fallbackSignups.add(trimmedEmail);

    console.warn(`[Supabase Fallback] Credentials missing on environment. Logging signup locally: ${trimmedEmail}`);

    if (transporter) {
      try {
        const mailOptions = {
          from: `"Passwala" <${smtpUser}>`,
          to: trimmedEmail,
          subject: '🎉 Passwala App Launching Soon! Get Early Access',
          html: getWelcomeEmailHtml(trimmedEmail)
        };
        await transporter.sendMail(mailOptions);
      } catch (mailError) {
        console.error('[Fallback Mail Error] Failed to send welcome email:', mailError);
      }
    }

    return res.status(200).json({ success: true, message: 'Namaste! We will notify you when we launch.' });
  }

  try {
    // trimmedEmail already declared above — reuse it
    // Check if the user is already signed up with this email
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', trimmedEmail)
      .limit(1);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(200).json({ success: true, message: 'Namaste! We will notify you when we launch.' }); // Fallback success
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(200).json({ success: true, alreadyRegistered: true, message: 'You are already registered!' });
    }

    // Generate a unique dummy phone number matching the CS_ prefix pattern
    const randomPhone = `CS_${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        phone: randomPhone,
        email: trimmedEmail,
        role: 'BUYER',
        full_name: 'Coming Soon Subscriber'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(200).json({ success: true, message: 'Namaste! We will notify you when we launch.' }); // Fallback success
    }

    if (transporter) {
      try {
        const mailOptions = {
          from: `"Passwala" <${smtpUser}>`,
          to: trimmedEmail,
          subject: '🎉 Passwala App Launching Soon! Get Early Access',
          html: getWelcomeEmailHtml(trimmedEmail)
        };
        await transporter.sendMail(mailOptions);
      } catch (mailError) {
        console.error('Failed to send welcome email:', mailError);
      }
    }

    return res.status(200).json({ success: true, message: 'Namaste! We will notify you when we launch.' });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Start the HTTP server (works for both local dev and Render/production)
const listenPort = process.env.COMING_SOON_PORT || 3006;
app.listen(listenPort, () => {
  console.log(`🚀 Passwala Coming Soon server running on port ${listenPort}`);
});

export default app;
