/**
 * Sends a real WhatsApp OTP to the specified phone number.
 * Supports Twilio and Ultramsg depending on the env variables set.
 */
export async function sendWhatsAppOTP(phone, otp) {
  const cleanPhone = phone.replace(/\D/g, ''); // Ensure pure digits
  const recipient = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const messageText = `Your Passwala verification code is ${otp}. Please do not share it with anyone.`;
  const provider = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim();

  // Option 1: Ultramsg
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
    return { success: true, provider: 'ultramsg' };
  }

  // Option 2: Twilio
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
    return { success: true, provider: 'twilio' };
  }

  // Option 3: Evolution API
  if (provider === 'evolution' || (!provider && process.env.EVOLUTION_API_URL && process.env.EVOLUTION_INSTANCE && process.env.EVOLUTION_API_KEY)) {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_INSTANCE || !process.env.EVOLUTION_API_KEY) {
      throw new Error('Evolution provider selected but EVOLUTION_API_URL, EVOLUTION_INSTANCE, or EVOLUTION_API_KEY is not configured.');
    }
    const baseUrl = process.env.EVOLUTION_API_URL.replace(/\/+$/, '');
    const instance = process.env.EVOLUTION_INSTANCE;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const url = `${baseUrl}/message/sendText/${instance}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
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
    return { success: true, provider: 'evolution' };
  }

  // Fallback / Mock
  console.warn(`⚠️ WhatsApp credentials/provider not set or set to mock in .env. Falling back to console log for OTP: ${otp}`);
  return { 
    success: true, 
    provider: 'mock', 
    otp,
    evolutionResponse: {
      key: {
        remoteJid: `${recipient}@s.whatsapp.net`,
        fromMe: true,
        id: "MOCK" + Math.random().toString(36).substring(2, 10).toUpperCase()
      },
      message: {
        extendedTextMessage: {
          text: messageText
        }
      },
      messageTimestamp: Math.floor(Date.now() / 1000).toString(),
      status: "PENDING"
    }
  };
}
