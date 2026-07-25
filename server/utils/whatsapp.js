/**
 * Sends a real OTP to the specified phone number.
 *
 * Supported providers (set WHATSAPP_PROVIDER in .env):
 *   'fast2sms'  — Free Indian SMS/WhatsApp OTP. Get API key at https://fast2sms.com
 *   '2factor'   — Indian OTP SMS. Get API key at https://2factor.in
 *   'ultramsg'  — WhatsApp via UltraMsg instance
 *   'twilio'    — WhatsApp/SMS via Twilio
 *   'evolution' — Self-hosted Evolution API (requires active WhatsApp session)
 *   'n8n'       — n8n workflow webhook automation (custom payload)
 *   'mock'      — Console-only fallback (development)
 */
export async function sendWhatsAppOTP(phone, otp) {
  const cleanPhone = phone.replace(/\D/g, ''); // Ensure pure digits (10-digit Indian number)
  const recipient = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const tenDigit = cleanPhone.slice(-10); // Always 10-digit for Indian APIs
  const messageText = `${otp} is your Passwala OTP. Valid for 5 minutes. Do not share with anyone.`;
  const provider = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim();

  // ─────────────────────────────────────────────────────────────────────────────
  // Option 1: Fast2SMS (Recommended — Free Indian provider, no session mgmt)
  //   Sign up at: https://fast2sms.com → Dashboard → Dev API
  //   Set: WHATSAPP_PROVIDER=fast2sms
  //        FAST2SMS_API_KEY=your_api_key_here
  // ─────────────────────────────────────────────────────────────────────────────
  if (provider === 'fast2sms' || (!provider && process.env.FAST2SMS_API_KEY)) {
    if (!process.env.FAST2SMS_API_KEY) {
      throw new Error('fast2sms provider selected but FAST2SMS_API_KEY is not configured.');
    }

    const url = 'https://www.fast2sms.com/dev/bulkV2';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: tenDigit
      })
    });

    const data = await res.json();
    if (!data.return) {
      throw new Error(`Fast2SMS API failed: ${JSON.stringify(data)}`);
    }
    console.log(`✅ OTP sent via Fast2SMS to ${tenDigit}`);
    return { success: true, provider: 'fast2sms' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Option 2: 2Factor (Reliable Indian OTP SMS provider)
  //   Sign up at: https://2factor.in → Get API Key
  //   Set: WHATSAPP_PROVIDER=2factor
  //        TWOFACTOR_API_KEY=your_api_key_here
  // ─────────────────────────────────────────────────────────────────────────────
  if (provider === '2factor' || (!provider && process.env.TWOFACTOR_API_KEY)) {
    if (!process.env.TWOFACTOR_API_KEY) {
      throw new Error('2factor provider selected but TWOFACTOR_API_KEY is not configured.');
    }

    const url = `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${tenDigit}/${otp}/OTP1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.Status !== 'Success') {
      throw new Error(`2Factor API failed: ${JSON.stringify(data)}`);
    }
    console.log(`✅ OTP sent via 2Factor to ${tenDigit}`);
    return { success: true, provider: '2factor' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Option 3: Ultramsg (WhatsApp via UltraMsg cloud instance)
  //   Sign up at: https://ultramsg.com
  //   Set: WHATSAPP_PROVIDER=ultramsg
  //        ULTRAMSG_INSTANCE_ID=your_instance_id
  //        ULTRAMSG_TOKEN=your_token
  // ─────────────────────────────────────────────────────────────────────────────
  if (provider === 'ultramsg' || (!provider && process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN)) {
    if (!process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_TOKEN) {
      throw new Error('Ultramsg provider selected but ULTRAMSG_INSTANCE_ID or ULTRAMSG_TOKEN is not configured.');
    }
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

    const params = new URLSearchParams({
      token,
      to: `+${recipient}`,
      body: messageText
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ultramsg API failed: ${errText}`);
    }
    console.log(`✅ OTP sent via UltraMsg WhatsApp to ${recipient}`);
    return { success: true, provider: 'ultramsg' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Option 4: Twilio (WhatsApp or SMS — global, requires account)
  //   Sign up at: https://console.twilio.com
  //   Set: WHATSAPP_PROVIDER=twilio
  //        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
  // ─────────────────────────────────────────────────────────────────────────────
  if (provider === 'twilio' || (!provider && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER)) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('Twilio provider selected but TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_NUMBER is not configured.');
    }
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');

    const params = new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:+${recipient}`,
      Body: messageText
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio API failed: ${errText}`);
    }
    console.log(`✅ OTP sent via Twilio WhatsApp to ${recipient}`);
    return { success: true, provider: 'twilio' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Option 5: Evolution API (Self-hosted — requires active WhatsApp session)
  //   ⚠️  WARNING: The WhatsApp QR code session MUST be active and scanned.
  //   If the connection state is not "open", this will always fail.
  //   Set: WHATSAPP_PROVIDER=evolution
  //        EVOLUTION_API_URL, EVOLUTION_INSTANCE, EVOLUTION_API_KEY
  // ─────────────────────────────────────────────────────────────────────────────
  if (provider === 'evolution' || (!provider && process.env.EVOLUTION_API_URL && process.env.EVOLUTION_INSTANCE && process.env.EVOLUTION_API_KEY)) {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_INSTANCE || !process.env.EVOLUTION_API_KEY) {
      throw new Error('Evolution provider selected but EVOLUTION_API_URL, EVOLUTION_INSTANCE, or EVOLUTION_API_KEY is not configured.');
    }
    const baseUrl = process.env.EVOLUTION_API_URL.replace(/\/+$/, '');
    const instance = process.env.EVOLUTION_INSTANCE;
    const apiKey = process.env.EVOLUTION_API_KEY;

    // ── 1. Check connection state before attempting to send ──────────────────
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey }
    });
    const stateData = await stateRes.json();
    const state = stateData?.instance?.state;
    if (state !== 'open') {
      throw new Error(
        `Evolution WhatsApp instance "${instance}" is not connected (state: "${state}"). ` +
        `Please scan the QR code at ${baseUrl} to reconnect, or switch to a different WHATSAPP_PROVIDER.`
      );
    }

    // ── 2. Send message ──────────────────────────────────────────────────────
    const url = `${baseUrl}/message/sendText/${instance}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey
      },
      body: JSON.stringify({
        number: recipient,
        text: messageText
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Evolution API failed: ${errText}`);
    }
    console.log(`✅ OTP sent via Evolution WhatsApp to ${recipient}`);
    return { success: true, provider: 'evolution' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Option 6: n8n Workflow Automation Webhook
  //   Set: WHATSAPP_PROVIDER=n8n
  //        N8N_WHATSAPP_WEBHOOK_URL=https://your-n8n-instance/webhook/path
  // ─────────────────────────────────────────────────────────────────────────────
  if (provider === 'n8n' || (!provider && process.env.N8N_WHATSAPP_WEBHOOK_URL)) {
    if (!process.env.N8N_WHATSAPP_WEBHOOK_URL) {
      throw new Error('n8n provider selected but N8N_WHATSAPP_WEBHOOK_URL is not configured.');
    }

    const url = process.env.N8N_WHATSAPP_WEBHOOK_URL;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: recipient,
        tenDigit: tenDigit,
        otp: otp,
        message: messageText
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`n8n webhook failed: ${errText}`);
    }
    console.log(`✅ OTP sent via n8n webhook automation to ${recipient}`);
    return { success: true, provider: 'n8n' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Fallback: Mock (development only — OTP is shown in server console)
  // ─────────────────────────────────────────────────────────────────────────────
  console.warn(`⚠️  [MOCK] No WhatsApp provider configured. OTP for ${tenDigit}: ${otp}`);
  return { success: true, provider: 'mock', otp };
}
