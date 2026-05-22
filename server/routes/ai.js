import express from 'express';

const router = express.Router();

const SYSTEM_INSTRUCTION = `You are the Passwala Help Bot, a friendly and knowledgeable AI neighborhood assistant for the residents of Ahmedabad, Gujarat.
You must communicate naturally in a mix of English, Hindi, and Gujarati (Gujlish/Hinglish) based on what the user prefers.
Always start with warm, local greetings like "Jai Shree Krishna! 🙏" or "Namaste!" when appropriate.

Key features of Passwala that you should mention or help users with:
1. Groceries & Essentials: Users can buy fresh milk, local produce, and daily staples from nearby neighborhood shops.
2. 7 AM Morning Delivery: Users can add items to their cart and schedule them to be delivered by 7 AM.
3. Neighborhood Floor Grouping & Discounts: If multiple neighbors in the same building/floor order together, they get automated "Floor Group" delivery discounts.
4. Verified Home Services: Book trusted neighborhood-endorsed plumbers, electricians, or appliance technicians (starting at ₹199).
5. Order Status & Live Tracking: Tell users they can view real-time delivery tracking on the "Track" tab in their app.
6. Join as a Vendor: Local shop owners can register on Passwala to start selling. If the user expresses interest in selling or listing their shop, guide them to write "vendor" or "dukaan" to open the guided WhatsApp-style registration!

Keep your responses concise, helpful, and highly engaging. Use bullet points and emojis to make text scannable.`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY is not set in env. Using smart localized fallback.');
    return res.json({ text: getMockFallbackResponse(messages[messages.length - 1]?.text) });
  }

  try {
    // Map UI messages to Gemini Chat API format
    const contents = messages
      .filter(m => m.text && (m.sender === 'user' || m.sender === 'ai' || m.sender === 'model'))
      .map(m => {
        const role = m.sender === 'user' ? 'user' : 'model';
        return {
          role,
          parts: [{ text: m.text }]
        };
      });

    // Make native fetch call to Gemini 1.5 Flash API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error('Invalid or empty response structure from Gemini API');
    }

    return res.json({ text: replyText });
  } catch (err) {
    console.error('🔥 AI proxy route error:', err.message);
    // Graceful fallback on API call failure
    return res.json({ text: getMockFallbackResponse(messages[messages.length - 1]?.text) + '\n\n*(Note: Currently running in local offline help mode)*' });
  }
});

// Resilient keyword matching fallback supporting Hindi/Gujarati/English queries
function getMockFallbackResponse(userInput = '') {
  const lower = userInput.toLowerCase();

  if (lower.includes('kem cho') || lower.includes('kevu')) {
    return "Maja ma! 🙏 Hoon tamari Ahmedabad Community Help Bot chhu. Su madad karu? (I can help you in Gujarati, Hindi & English!)";
  }

  if (lower.includes('kaise ho') || lower.includes('namaste') || lower.includes('hello')) {
    return "Namaste! Main bilkul theek hoon! 🙏 Aapki Ahmedabad neighborhood Help Bot sahayta ke liye taiyar hai. Aap plumbing repair, order status, or grocery deliveries ke baare mein pooch sakte hain.";
  }

  if (lower.includes('leak') || lower.includes('plumb') || lower.includes('tap') || lower.includes('electric') || lower.includes('light') || lower.includes('wire')) {
    return "I can help with home maintenance! 🚰⚡ We have verified, 'Neighborhood Endorsed' plumbers and electricians available in your Ahmedabad suburb starting at ₹199. Would you like me to connect you with one?";
  }

  if (lower.includes('track') || lower.includes('order status') || lower.includes('kaha hai')) {
    return "I'm checking your active orders! 📦 Your order is being prepared by our local partner and will be with you shortly. You can view the live progress and delivery route on the 'Track' tab of the app.";
  }

  if (lower.includes('morning') || lower.includes('schedule') || lower.includes('7 am') || lower.includes('group')) {
    return "Good thinking! ⏰ You can easily 'Schedule for 7 AM' directly from your cart for daily essentials like milk and bread. Additionally, keep an eye out for 'Floor Group' discounts when you and your neighbors order together!";
  }

  return "Passwala Help Bot at your service! 🏙️ I can assist you in finding fresh grocery items, booking home repair services, or scheduling deliveries in Ahmedabad. How can I help you today?";
}

export default router;
