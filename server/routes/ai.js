import express from 'express';
import supabase from '../supabase.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

const SYSTEM_INSTRUCTION = `You are the Passwala Help Bot, Ahmedabad's premium neighborhood assistant.
Your goal is to help users log in, order groceries, book rides, book home services, and buy event passes.

Always start with warm, local greetings like "Jai Shree Krishna! 🙏" or "Namaste!".
You must communicate in a mix of Hindi, Gujarati, and English (Hinglish/Gujlish).

You have access to tools to book:
1. Rides: Provide pickup and dropoff areas.
2. Events: Provide the event title.
3. Services: Provide the service type (plumber, electrician, etc.).
4. Products: Provide grocery items.

When a user asks to book or buy something, search for details and trigger the correct JSON card.`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { messages, user } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const latestMessage = messages[messages.length - 1]?.text || '';
  const lowerInput = latestMessage.toLowerCase();

  // If user is not logged in, prompt for mobile number
  if (!user && !lowerInput.match(/\d{10}/) && !lowerInput.match(/\d{6}/)) {
    return res.json({
      text: "Namaste! 🙏 Please enter your 10-digit mobile number to log in and start booking:"
    });
  }

  // Smart Offline/Online hybrid logic:
  // Detect intent first to ensure instant, reliable response card generation
  let responseText = "";
  let responseCard = null;

  try {
    if (lowerInput.includes('history') || lowerInput.includes('past orders') || lowerInput.includes('my orders') || lowerInput.includes('past bookings') || lowerInput.includes('my bookings') || lowerInput.includes('order history')) {
      responseText = "Sure! I can help you view your order and booking history. I am redirecting you to your Order History page now.";
      responseCard = {
        type: 'navigation',
        title: 'Open Order History',
        price: 0,
        details: 'Go to your past orders and booking history page.',
        action: 'NAVIGATE',
        data: {
          path: '/order-history',
          pageName: 'Order History'
        }
      };
    } else if (lowerInput.includes('cancel') || lowerInput.includes('cancle') || lowerInput.includes('revert') || lowerInput.includes('abort')) {
      let resolvedUserId = user?.id || user?.uid;
      if (resolvedUserId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUserId);
        if (!isUuid) {
          const { data: byUid } = await supabase.from('users').select('id').eq('uid', resolvedUserId).maybeSingle();
          if (byUid) {
            resolvedUserId = byUid.id;
          } else if (user?.phoneNumber) {
            const cleanPhone = String(user.phoneNumber).replace(/\D/g, '').slice(-10);
            const { data: byPhone } = await supabase.from('users').select('id').eq('phone', cleanPhone).maybeSingle();
            if (byPhone) resolvedUserId = byPhone.id;
          }
        }
      }

      if (resolvedUserId) {
        const { data: bookings } = await supabase
          .from('ticket_bookings')
          .select('*')
          .eq('user_id', resolvedUserId)
          .eq('status', 'CONFIRMED')
          .ilike('qr_code_hash', '%RIDE%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (bookings && bookings.length > 0) {
          const booking = bookings[0];
          responseText = `Sure! I found your active ride booking (Reference: ${booking.qr_code_hash}) from **${booking.pickup_area}** to **${booking.drop_area}**. Would you like to cancel it?`;
          responseCard = {
            type: 'ride',
            title: 'Cancel Passwala Ride',
            price: booking.total_price,
            details: `Route: ${booking.pickup_area} ➡️ ${booking.drop_area} | Ref: ${booking.qr_code_hash}`,
            action: 'CANCEL_RIDE',
            data: {
              bookingId: booking.id,
              userId: resolvedUserId
            }
          };
        } else {
          responseText = "I couldn't find any active confirmed ride bookings under your account to cancel.";
        }
      } else {
        responseText = "Please log in to cancel your ride booking.";
      }
    } else if (lowerInput.includes('ride') || lowerInput.includes('cab') || lowerInput.includes('auto') || lowerInput.includes('rickshaw') || lowerInput.includes('go to')) {
      // Find active vehicle
      const { data: vehicles } = await supabase.from('city_vehicles').select('id, license_plate').eq('is_active', true).limit(1);
      const vehicleId = vehicles?.[0]?.id || 'mock-vehicle-uuid';
      const licensePlate = vehicles?.[0]?.license_plate || 'GJ01-PW-1234';

      // Parse pickup and drop areas
      let pickup = 'Satellite';
      let drop = 'Vastrapur';
      if (lowerInput.includes('to')) {
        const parts = lowerInput.split('to');
        
        let rawDrop = parts[1] || '';
        rawDrop = rawDrop.replace(/(ride|book|cab|auto|bike|rickshaw|now|please|trip|travel)/g, '').trim();
        if (rawDrop) drop = rawDrop;

        let rawPickup = parts[0] || '';
        if (rawPickup.includes('from')) {
          const fromParts = rawPickup.split('from');
          rawPickup = fromParts[1] || '';
        }
        rawPickup = rawPickup.replace(/(book|ride|cab|auto|bike|rickshaw|need|want|find)/g, '').trim();
        if (rawPickup) pickup = rawPickup;
      }

      const formatAreaName = (str) => {
        return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      };
      const formattedPickup = formatAreaName(pickup);
      const formattedDrop = formatAreaName(drop);

      // Precise lookup dictionary to bypass Nominatim inconsistencies and match exactly
      const AHMEDABAD_AREA_COORDS = {
        sbr: [23.0396, 72.5100],
        'sb road': [23.0396, 72.5100],
        sindhubhavan: [23.0396, 72.5028],
        'sindhu bhavan': [23.0396, 72.5028],
        thaltej: [23.0500, 72.5186],
        'sg highway': [23.0762, 72.5261],
        bopal: [23.0333, 72.4667],
        satellite: [23.0293, 72.5137],
        vastrapur: [23.0350, 72.5293],
        maninagar: [22.9996, 72.6033],
        naroda: [23.0694, 72.6560],
        'cg road': [23.0375, 72.5567],
        paldi: [23.0113, 72.5634],
        naranpura: [23.0582, 72.5612],
        gandhinagar: [23.2156, 72.6369],
        ahmedabad: [23.0225, 72.5714]
      };

      const resolveAreaCoords = async (areaName) => {
        const clean = areaName.toLowerCase().trim();
        if (AHMEDABAD_AREA_COORDS[clean]) {
          const [lat, lng] = AHMEDABAD_AREA_COORDS[clean];
          return { lat, lng };
        }
        // Fallback to nominatim
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(areaName + ', Ahmedabad, Gujarat, India')}&limit=1`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)' } });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
          }
        } catch (e) {
          console.warn('AI Geocode error:', e);
        }
        return null;
      };

      const pickupCoords = await resolveAreaCoords(formattedPickup) || { lat: 23.0284, lng: 72.5239 };
      const dropCoords = await resolveAreaCoords(formattedDrop) || { lat: 23.0372, lng: 72.5273 };

      let distanceKm = 0;
      try {
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=false`,
          {
            headers: {
              'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
            }
          }
        );
        const osrmData = await osrmRes.json();
        if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
          distanceKm = osrmData.routes[0].distance / 1000;
        }
      } catch (e) {
        console.error('OSRM route fetch error in AI route:', e);
      }

      if (distanceKm === 0) {
        const R = 6371;
        const dLat = (dropCoords.lat - pickupCoords.lat) * Math.PI / 180;
        const dLng = (dropCoords.lng - pickupCoords.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pickupCoords.lat * Math.PI / 180) * Math.cos(dropCoords.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceKm = R * c;
      }

      // Rate settings from configuration file
      let ratePerKm = 10;
      let shortRidePrice = 30;
      try {
        const settingsPath = process.cwd().endsWith('server')
          ? path.join(process.cwd(), 'platform_settings.json')
          : path.join(process.cwd(), 'server', 'platform_settings.json');
        const rawData = await fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(rawData);
        if (settings?.ridePricePerKm !== undefined) ratePerKm = parseFloat(settings.ridePricePerKm);
        if (settings?.shortRidePrice !== undefined) shortRidePrice = parseFloat(settings.shortRidePrice);
      } catch (e) {
        // ignore fallback settings
      }

      const baseFare = distanceKm <= 2 ? shortRidePrice : Math.max(15, Math.ceil(distanceKm * ratePerKm));
      const cgst = Number((baseFare * 0.025).toFixed(2));
      const sgst = Number((baseFare * 0.025).toFixed(2));
      const totalPrice = Number((baseFare + cgst + sgst).toFixed(2));

      responseText = `Sure! 🛵 I can book a local Passwala Ride from ${formattedPickup} to ${formattedDrop} for you. Here are the ride details:`;
      responseCard = {
        type: 'ride',
        title: 'Book Passwala Ride',
        price: totalPrice,
        details: `Driver Plate: ${licensePlate} | Route: ${formattedPickup} ➡️ ${formattedDrop} (${distanceKm.toFixed(2)} km)`,
        action: 'BOOK_RIDE',
        data: {
          vehicleId,
          price: totalPrice,
          pickupArea: formattedPickup,
          dropArea: formattedDrop,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropLat: dropCoords.lat,
          dropLng: dropCoords.lng
        }
      };
    } else if (
      lowerInput.includes('event') ||
      lowerInput.includes('concert') ||
      lowerInput.includes('ticket') ||
      (lowerInput.includes('pass') && !lowerInput.includes('passwala')) ||
      (lowerInput.includes('show') && 
       !lowerInput.match(/\bshow\s+(?:me|my|near|shop|store|item|product|grocery|order|history|phone|number|address|email|wallet|balance|recharge|theme|dark|light|color|language|admin|pay|revenue|earning|photo|picture|avatar|image|logout|signout)\b/i) &&
       !lowerInput.includes('near show') &&
       !lowerInput.includes('show in') &&
       !lowerInput.includes('show for') &&
       !lowerInput.includes('show me')
      )
    ) {
      // Fetch active events (with filters for showType or title)
      let queryBuilder = supabase
        .from('events')
        .select('id, title, venue_name, show_type')
        .neq('status', 'PENDING_APPROVAL')
        .neq('status', 'REJECTED');

      if (lowerInput.includes('multiple show') || lowerInput.includes('multipleshows') || lowerInput.includes('multiple shows')) {
        queryBuilder = queryBuilder.eq('show_type', 'multiple');
      } else if (lowerInput.includes('tour') || lowerInput.includes('festival') || lowerInput.includes('tour show')) {
        queryBuilder = queryBuilder.in('show_type', ['tour', 'festival']);
      } else if (lowerInput.includes('single show') || lowerInput.includes('single')) {
        queryBuilder = queryBuilder.eq('show_type', 'single');
      }

      let searchWord = '';
      const matchWords = latestMessage.match(/(?:event|concert|show|ticket|pass)\s+(?:named|called|for)?\s*([a-zA-Z0-9\s]+)/i);
      if (matchWords && matchWords[1]) {
        searchWord = matchWords[1].trim().replace(/(?:multiple|single|tour|festival|shows?|cabs?|rides?|services?)/gi, '').trim();
      }
      if (searchWord && searchWord.length > 1) {
        queryBuilder = queryBuilder.ilike('title', `%${searchWord}%`);
      }

      const { data: events } = await queryBuilder.limit(4);
      
      if (events && events.length > 0) {
        const eventItems = [];
        for (const event of events) {
          const { data: tiers } = await supabase.from('event_ticket_tiers').select('id, tier_name, price').eq('event_id', event.id).limit(1);
          const tier = tiers?.[0];
          eventItems.push({
            eventId: event.id,
            tierId: tier?.id || null,
            title: event.title,
            venue: event.venue_name || 'Ahmedabad Venue',
            price: tier?.price || 499,
            ticketCount: 1
          });
        }

        responseText = `Exciting! 🎫 I found these ${events.length} upcoming events in Ahmedabad. Would you like to buy a pass?`;
        responseCard = {
          type: 'events_list',
          items: eventItems
        };
      }

      if (!responseCard) {
        responseText = "No upcoming public events found in Ahmedabad at the moment. Please check back later!";
      }
    } else if (lowerInput.includes('plumber') || lowerInput.includes('electrician') || lowerInput.includes('electrical') || lowerInput.includes('electricity') || lowerInput.includes('clean') || lowerInput.includes('cleaning') || lowerInput.includes('ac service') || lowerInput.includes('repair') || lowerInput.includes('expert') || lowerInput.includes('service') || lowerInput.includes('plumbing') || lowerInput.includes('carpenter') || lowerInput.includes('carpentry') || lowerInput.includes('painting') || lowerInput.includes('painter')) {
      // Determine target category
      let categoryKeyword = '';
      if (lowerInput.includes('electrician') || lowerInput.includes('electrical') || lowerInput.includes('electricity')) {
        categoryKeyword = 'Electrical';
      } else if (lowerInput.includes('plumber') || lowerInput.includes('plumbing')) {
        categoryKeyword = 'Plumbing';
      } else if (lowerInput.includes('ac service') || lowerInput.includes('appliance')) {
        categoryKeyword = 'AC & Appliance';
      } else if (lowerInput.includes('carpenter') || lowerInput.includes('carpentry')) {
        categoryKeyword = 'Carpentry';
      } else if (lowerInput.includes('painting') || lowerInput.includes('painter')) {
        categoryKeyword = 'Painting';
      } else if (lowerInput.includes('clean') || lowerInput.includes('cleaning')) {
        categoryKeyword = 'Cleaning';
      }

      let serviceQuery = supabase
        .from('services')
        .select(`
          id, 
          title, 
          price, 
          description,
          service_providers (
            id,
            business_name,
            rating,
            is_verified
          )
        `);

      if (categoryKeyword) {
        serviceQuery = serviceQuery.ilike('title', `%${categoryKeyword}%`);
      }

      const { data: servicesData } = await serviceQuery.limit(1);

      if (servicesData && servicesData.length > 0) {
        const service = servicesData[0];
        const provider = service.service_providers || {};
        const providerName = provider.business_name || 'Verified Home Expert';

        responseText = `Certainly! 🛠️ I can book a local home service expert for "${service.title}" from "${providerName}".`;
        responseCard = {
          type: 'service',
          title: `Book ${service.title}`,
          price: service.price || 199,
          details: `Provider: ${providerName} | Rating: ${provider.rating || '4.5'}`,
          action: 'BOOK_SERVICE',
          data: {
            serviceId: service.id,
            providerId: provider.id,
            price: service.price || 199
          }
        };
      } else {
        // Fallback to fetch any service if category search yielded empty
        const { data: fallbackServices } = await supabase
          .from('services')
          .select(`
            id, title, price,
            service_providers (id, business_name, rating)
          `)
          .limit(1);

        if (fallbackServices && fallbackServices.length > 0) {
          const service = fallbackServices[0];
          const provider = service.service_providers || {};
          const providerName = provider.business_name || 'Verified Home Expert';
          
          responseText = `Certainly! 🛠️ I can book a local home service expert for "${service.title}" from "${providerName}".`;
          responseCard = {
            type: 'service',
            title: `Book ${service.title}`,
            price: service.price || 199,
            details: `Provider: ${providerName} | Rating: ${provider.rating || '4.5'}`,
            action: 'BOOK_SERVICE',
            data: {
              serviceId: service.id,
              providerId: provider.id,
              price: service.price || 199
            }
          };
        } else {
          responseText = "No local verified service providers are online currently. Please try again in some time!";
        }
      }
    } else if (
      lowerInput.includes('near shop') ||
      lowerInput.includes('near show') ||
      lowerInput.includes('show near') ||
      lowerInput.includes('show in') ||
      (lowerInput.includes('shop') && !lowerInput.includes('near show') && !lowerInput.includes('show near')) ||
      lowerInput.includes('store') ||
      lowerInput.includes('grocery') ||
      (lowerInput.includes('order') && !lowerInput.includes('order history') && !lowerInput.includes('my orders')) ||
      (lowerInput.includes('buy') && !lowerInput.includes('ticket') && !lowerInput.includes('event') && !lowerInput.includes('pass')) ||
      lowerInput.includes('milk') ||
      lowerInput.includes('bread') ||
      lowerInput.includes('fruit') ||
      lowerInput.includes('item') ||
      (lowerInput.includes('search') && !lowerInput.includes('event') && !lowerInput.includes('show') && !lowerInput.includes('ticket')) ||
      (lowerInput.includes('find') && !lowerInput.includes('event') && !lowerInput.includes('show') && !lowerInput.includes('ticket')) ||
      lowerInput.includes('pen') ||
      lowerInput.includes('pencil') ||
      lowerInput.includes('stationery')
    ) {
      // Attempt to extract item name from the user query
      let searchQuery = '';
      const matchWords = latestMessage.match(/(?:buy|order|search|find|get|need|want|show)\s+([a-zA-Z0-9\s]+)/i);
      if (matchWords && matchWords[1]) {
        searchQuery = matchWords[1].trim().replace(/(?:near|shop|store|grocery|items|product|cab|ride|service)/gi, '').trim();
        // Clean up leading prepositions or verbs
        searchQuery = searchQuery.replace(/^(?:in|for|at|on|of|near|show)\s+/i, '').trim();
      }

      let queryBuilder = supabase
        .from('products')
        .select('id, name, price, store_id, image_url')
        .neq('description', 'Service item auto-registered');

      if (searchQuery && searchQuery.length > 1) {
        queryBuilder = queryBuilder.ilike('name', `%${searchQuery}%`);
      }

      const { data: products } = await queryBuilder.limit(4);

      if (products && products.length > 0) {
        responseText = searchQuery 
          ? `Certainly! 🛍️ I found these items matching "${searchQuery}" at nearby shops:`
          : "Certainly! 🛍️ Here are the items available at shops near you. You can add them directly to your cart:";
        
        responseCard = {
          type: 'products_list',
          items: products.map(product => ({
            productId: product.id,
            name: product.name,
            price: product.price || 30,
            image: product.image_url || null,
            quantity: 1,
            storeId: product.store_id
          }))
        };
      } else {
        responseText = searchQuery
          ? `I couldn't find any products matching "${searchQuery}" in nearby stores right now.`
          : "No products match your query in nearby neighborhood stores right now.";
      }
    } else if (lowerInput.includes('theme') || lowerInput.includes('dark mode') || lowerInput.includes('light mode') || lowerInput.includes('color mode') || lowerInput.includes('language') || lowerInput.includes('english') || lowerInput.includes('gujarati') || lowerInput.includes('hindi') || lowerInput.includes('settings') || lowerInput.includes('profile') || lowerInput.includes('name') || lowerInput.includes('rename') || lowerInput.includes('photo') || lowerInput.includes('picture') || lowerInput.includes('avatar') || lowerInput.includes('image') || lowerInput.includes('logout') || lowerInput.includes('log out') || lowerInput.includes('signout') || lowerInput.includes('sign out') || lowerInput.includes('email') || lowerInput.includes('address') || lowerInput.includes('location') || lowerInput.includes('phone') || lowerInput.includes('number') || lowerInput.includes('wallet') || lowerInput.includes('balance') || lowerInput.includes('recharge') || lowerInput.includes('add money') || lowerInput.includes('credits') || lowerInput.includes('add balance')) {
      if (lowerInput.includes('wallet') || lowerInput.includes('balance') || lowerInput.includes('recharge') || lowerInput.includes('add money') || lowerInput.includes('credits') || lowerInput.includes('add balance')) {
        let rechargeAmount = 500;
        const amountMatch = latestMessage.match(/(?:recharge|add|add money|add balance)\s+(\d+)/i);
        if (amountMatch && amountMatch[1]) {
          rechargeAmount = parseInt(amountMatch[1]);
        }
        let resolvedUserId = user?.id || user?.uid;
        if (resolvedUserId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUserId);
          if (!isUuid) {
            const { data: byUid } = await supabase.from('users').select('id').eq('uid', resolvedUserId).maybeSingle();
            if (byUid) resolvedUserId = byUid.id;
          }
        }
        let walletBalance = 0;
        if (resolvedUserId) {
          const { data: userRecord } = await supabase.from('users').select('wallet_balance').eq('id', resolvedUserId).maybeSingle();
          walletBalance = userRecord?.wallet_balance || 0;
        }
        responseText = `💰 **Your Passwala Wallet Balance**: ₹${walletBalance.toFixed(2)}\n\nWould you like to recharge your wallet with **₹${rechargeAmount}**? (Confirm below to complete simulated payment)`;
        responseCard = {
          type: 'wallet',
          title: 'Wallet Balance & Recharge',
          price: rechargeAmount,
          details: `Current Balance: ₹${walletBalance.toFixed(2)} | Action: Recharge ₹${rechargeAmount}`,
          action: 'RECHARGE_WALLET',
          data: {
            amount: rechargeAmount
          }
        };
      } else if (lowerInput.includes('email')) {
        let newEmail = '';
        const emailMatch = latestMessage.match(/(?:email is|email to|add email|set email|update email|change email)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch && emailMatch[1]) {
          newEmail = emailMatch[1].trim();
        }
        if (newEmail) {
          responseText = `Sure! 📧 I can update your email address to **${newEmail}**. Would you like to confirm?`;
          responseCard = {
            type: 'setting_change',
            title: 'Update Email Address',
            price: 0,
            details: `Set email to: ${newEmail}`,
            action: 'UPDATE_EMAIL',
            data: { email: newEmail }
          };
        } else {
          responseText = "Sure! 📧 Please provide your email address. For example: \"add email to karan@example.com\".";
        }
      } else if (lowerInput.includes('phone') || lowerInput.includes('number')) {
        let newPhone = '';
        const phoneMatch = latestMessage.match(/(?:phone is|phone to|change phone|update phone|change number to|update number to|number is)\s+(\d{10})/i);
        if (phoneMatch && phoneMatch[1]) {
          newPhone = phoneMatch[1].trim();
        }
        if (newPhone) {
          responseText = `Sure! 📱 I can update your mobile number to **+91 ${newPhone}**. Would you like to confirm?`;
          responseCard = {
            type: 'setting_change',
            title: 'Update Phone Number',
            price: 0,
            details: `Set phone to: +91 ${newPhone}`,
            action: 'UPDATE_PHONE',
            data: { phone: newPhone }
          };
        } else {
          responseText = "Sure! 📱 Please tell me the new 10-digit mobile number you would like to set. For example: \"change my number to 9999988888\".";
        }
      } else if (lowerInput.includes('address') || lowerInput.includes('location')) {
        let newAddress = '';
        const addrMatch = latestMessage.match(/(?:address is|address to|change address to|update address to|location to|location is|set address to)\s+([a-zA-Z0-9\s,.-]+)/i);
        if (addrMatch && addrMatch[1]) {
          newAddress = addrMatch[1].trim();
        }
        if (newAddress) {
          responseText = `Sure! 📍 I can update your default delivery address to **"${newAddress}"**. Would you like to confirm?`;
          responseCard = {
            type: 'setting_change',
            title: 'Update Default Address',
            price: 0,
            details: `Set default address: ${newAddress}`,
            action: 'UPDATE_ADDRESS',
            data: { address: newAddress }
          };
        } else {
          responseText = "Sure! 📍 Please tell me the new address you would like to set. For example: \"change address to Vastrapur, Ahmedabad\".";
        }
      } else if (lowerInput.includes('logout') || lowerInput.includes('log out') || lowerInput.includes('signout') || lowerInput.includes('sign out')) {
        responseText = "Sure! 🚪 I can help you log out of your session. Would you like to confirm logout?";
        responseCard = {
          type: 'setting_change',
          title: 'Sign Out / Logout',
          price: 0,
          details: 'End your current Passwala session securely.',
          action: 'LOGOUT',
          data: {}
        };
      } else if (lowerInput.includes('photo') || lowerInput.includes('picture') || lowerInput.includes('avatar') || lowerInput.includes('image')) {
        responseText = "Sure! 📸 I can help you update your profile photo. Please click the button below to upload an image from your device:";
        responseCard = {
          type: 'setting_change',
          title: 'Update Profile Photo',
          price: 0,
          details: 'Upload a new avatar / profile picture from your files.',
          action: 'UPDATE_PHOTO',
          data: {}
        };
      } else if (lowerInput.includes('name') || lowerInput.includes('rename')) {
        let newName = '';
        const nameMatch = latestMessage.match(/(?:change name is|change name to|update name to|set name to|name is|name to)\s+([a-zA-Z0-9\s\u0900-\u097F\u0A80-\u0AFF]+)/i);
        if (nameMatch && nameMatch[1]) {
          newName = nameMatch[1].trim();
        } else {
          const myNameMatch = latestMessage.match(/(?:change my name to|update my name to)\s+([a-zA-Z0-9\s\u0900-\u097F\u0A80-\u0AFF]+)/i);
          if (myNameMatch && myNameMatch[1]) {
            newName = myNameMatch[1].trim();
          } else {
            const endMatch = latestMessage.match(/(?:change name|update name|rename)\s+([a-zA-Z0-9\s\u0900-\u097F\u0A80-\u0AFF]+)/i);
            if (endMatch && endMatch[1]) {
              newName = endMatch[1].trim();
            }
          }
        }

        if (newName) {
          responseText = `Sure! 👤 I can update your profile display name to **${newName}** for you. Would you like to confirm this name change?`;
          responseCard = {
            type: 'setting_change',
            title: 'Update Profile Name',
            price: 0,
            details: `Change display name to: ${newName}`,
            action: 'UPDATE_NAME',
            data: {
              name: newName
            }
          };
        } else {
          responseText = "Sure! 👤 Please tell me what name you would like to set. For example: \"change my name to Karan\".";
        }
      } else if (lowerInput.includes('dark') || lowerInput.includes('light') || lowerInput.includes('theme') || lowerInput.includes('color')) {
        responseText = "Sure! 🎨 I can adjust your theme settings for you. Would you like to toggle the application's dark mode?";
        responseCard = {
          type: 'setting_change',
          title: 'Toggle Dark Mode',
          price: 0,
          details: 'Switch between light and dark visual aesthetics.',
          action: 'TOGGLE_THEME',
          data: {}
        };
      } else if (lowerInput.includes('language') || lowerInput.includes('english') || lowerInput.includes('gujarati') || lowerInput.includes('hindi')) {
        let targetLang = 'en';
        let langName = 'English';
        if (lowerInput.includes('gujarati')) {
          targetLang = 'gu';
          langName = 'Gujarati (ગુજરાતી)';
        } else if (lowerInput.includes('hindi')) {
          targetLang = 'hi';
          langName = 'Hindi (हिन्दी)';
        }
        responseText = `Sure! 🌐 I can change your application language preference to ${langName}. Would you like to update it?`;
        responseCard = {
          type: 'setting_change',
          title: `Switch to ${langName}`,
          price: 0,
          details: `Updates your interface language to ${langName}.`,
          action: 'CHANGE_LANGUAGE',
          data: {
            lang: targetLang,
            langName: langName
          }
        };
      } else {
        responseText = "You can manage your notification, theme, and language preferences here in the chat assistant. What settings would you like to update?";
      }
    } else if (lowerInput.includes('admin') || lowerInput.includes('pay info') || lowerInput.includes('payment info') || lowerInput.includes('revenue') || lowerInput.includes('earnings') || lowerInput.includes('pay information')) {
      // Query admin stats dynamically from DB
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: vendorCount } = await supabase.from('vendors').select('*', { count: 'exact', head: true });
      const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      
      const { data: allOrders } = await supabase
          .from('orders')
          .select('total_amount, status');

      let totalRevenue = 0;
      let ordersCompleted = 0;
      if (allOrders) {
          allOrders.forEach(order => {
              if (order.status === 'DELIVERED' || order.status === 'COMPLETED') {
                  totalRevenue += order.total_amount || 0;
                  ordersCompleted++;
              }
          });
      }

      responseText = `Here is the current platform revenue and pay information from the Admin dashboard:
      
💰 **Total Revenue**: ₹${totalRevenue.toFixed(2)}
📦 **Completed Orders**: ${ordersCompleted}
👥 **Registered Users**: ${userCount || 0}
🏪 **Registered Vendors**: ${vendorCount || 0}
📊 **Total Orders Placed**: ${orderCount || 0}`;

      responseCard = {
        type: 'admin_stats',
        title: 'Platform Earnings & Stats',
        price: totalRevenue,
        details: `Completed: ${ordersCompleted} orders | Active Users: ${userCount || 0}`,
        action: 'VIEW_DASHBOARD',
        data: {
          revenue: totalRevenue,
          orders: ordersCompleted,
          users: userCount
        }
      };
    }

    if (responseText) {
      return res.json({ text: responseText, card: responseCard });
    }

    // Default chat fallback if no booking keywords matched
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ text: getMockFallbackResponse(latestMessage) });
    }

    // Call live Gemini 1.5 Flash API
    const contents = messages
      .filter(m => m.text && (m.sender === 'user' || m.sender === 'ai' || m.sender === 'model'))
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      })
    });

    if (!response.ok) throw new Error('Gemini API returned error');
    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || getMockFallbackResponse(latestMessage);
    return res.json({ text: replyText });

  } catch (err) {
    console.error('🔥 AI proxy route error:', err.message);
    return res.json({ text: getMockFallbackResponse(latestMessage) });
  }
});

function getMockFallbackResponse(userInput = '') {
  const lower = userInput.toLowerCase();

  // Localized Greetings Fallback
  if (lower.includes('mahadev') || lower.includes('shiva') || lower.includes('har har')) {
    return "Har Har Mahadev! 🙏 Hope you are having a blessed day. How can I assist you with Passwala services today?";
  }
  if (lower.includes('radhe') || lower.includes('krishna') || lower.includes('hare')) {
    return "Jai Shree Krishna! Radhe Radhe! 🙏 How is everything in Ahmedabad? What can I help you book today?";
  }
  if (lower.includes('kem cho') || lower.includes('kevu')) {
    return "Maja ma! 🙏 Hoon tamari Ahmedabad neighborhood AI Help Bot chhu. Su madad karu? (I can help you buy grocery, book rides, or home services)";
  }
  if (lower.includes('kaise ho') || lower.includes('namaste')) {
    return "Namaste! Main bilkul theek hoon! 🙏 Aapki neighborhood helper bot haazir hai. Main rides booking, grocery orders, and plumbing repairs mein madad kar sakti hoon.";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello! Warm greetings from Passwala. 🙏 I can book local rides 🛵, home maintenance services 🛠️, event passes 🎫, or groceries 🛍️. What are you looking for?";
  }
  
  return "Passwala AI Help Bot at your service! 🏙️ I can assist you in ordering groceries 🛍️, booking home services 🛠️, event passes 🎫, or hailing local rides 🛵. How can I help you today?";
}

export default router;
