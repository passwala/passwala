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
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Welcome to Passwala</title>
      <style type="text/css">
        /* Client-specific Styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; }

        /* Reset Styles */
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

        /* Mobile Styles */
        @media screen and (max-width: 600px) {
          .container { width: 100% !important; max-width: 100% !important; border-radius: 0px !important; border-left: none !important; border-right: none !important; }
          .header { padding: 30px 20px 15px 20px !important; }
          .content { padding: 0 20px 30px 20px !important; }
          .footer { padding: 25px 20px !important; }
          .logo { font-size: 26px !important; }
          h1 { font-size: 21px !important; }
          p { font-size: 14px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #050811;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050811; table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 24px 10px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table class="container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0d1222; border: 1px solid rgba(255, 107, 0, 0.25); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);">
              
              <!-- Header -->
              <tr>
                <td class="header" align="center" style="padding: 40px 40px 20px 40px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <div class="logo" style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: bold; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 10px;">
                          <span style="color: #ffffff; font-weight: 300;">Pass</span><span style="color: #ff6b00; font-weight: 600;">wala</span><span style="color: #ff6b00;">.</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <div class="badge" style="display: inline-block; background: rgba(255, 107, 0, 0.08); border: 1px solid #ff6b00; color: #ff6b00; padding: 4px 12px; border-radius: 12px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                          Namaste India
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td class="content" align="center" style="padding: 0 40px 40px 40px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding-top: 10px;">
                        <h1 style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 600; margin: 10px 0; color: #ffffff; line-height: 1.3;">
                          You are on the Exclusive List! 🎉
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top: 10px;">
                        <p style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0;">
                          Thank you for subscribing to early access. We are preparing India's smartest neighborhood app to bring you a community-driven marketplace and a smart local economy platform designed for modern urban neighborhoods.
                        </p>
                        <p style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #cbd5e1; margin: 0;">
                          We'll drop you an update as soon as we launch in your area.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer" align="center" style="background-color: #090c16; padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748b; line-height: 1.5; padding-bottom: 6px;">
                        &copy; ${new Date().getFullYear()} Passwala. All rights reserved.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748b; line-height: 1.5;">
                        Made with &hearts; in India
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
          </td>
        </tr>
      </table>
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
