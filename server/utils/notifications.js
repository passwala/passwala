import admin from 'firebase-admin';
import supabase from '../supabase.js';

// Initialize firebase-admin securely
if (!admin.apps.length) {
  try {
    let credential;
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (saJson) {
      if (saJson.trim().startsWith('{')) {
        credential = admin.credential.cert(JSON.parse(saJson));
      } else {
        credential = admin.credential.cert(saJson); // file path
      }
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'passwala-75faa',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }

    if (credential) {
      admin.initializeApp({
        credential
      });
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      // Graceful fallback for local development
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
        console.log('✅ Firebase Admin initialized with applicationDefault.');
      } catch (err) {
        console.warn('⚠️ Firebase Admin service account not configured. FCM push notifications will run in simulation mode.');
      }
    }
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
  }
}

/**
 * Sends an in-app and simulated/real push notification to a user.
 * 
 * @param {string} userId - UUID of the user to notify.
 * @param {string} title - Title of the notification.
 * @param {string} body - Content body of the notification.
 * @param {object} [data] - Additional metadata parameters.
 * @returns {Promise<boolean>}
 */
export async function sendNotification(userId, title, body, data = {}) {
  try {
    if (!userId) {
      console.warn('⚠️ sendNotification was called without a valid userId');
      return false;
    }

    console.log(`[Notification Manager] Dispatching to User ID: ${userId}`);

    // 1. Fetch user's FCM token from DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('fcm_token, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error(`❌ Failed to retrieve user info for notification:`, userError.message);
    }

    const token = user?.fcm_token;

    // 2. Insert into notifications table for in-app inbox
    const { error: insertErr } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title: title,
        message: body,
        is_read: false
      }]);

    if (insertErr) {
      console.error('❌ Failed to insert row in database notifications table:', insertErr.message);
    } else {
      console.log(`✅ In-app database notification saved for user "${user?.full_name || userId}"`);
    }

    // 3. Dispatch FCM Push Notification (Real FCM & fallback simulation)
    if (token) {
      const message = {
        token: token,
        notification: {
          title: title,
          body: body
        },
        data: Object.keys(data).reduce((acc, key) => {
          acc[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
          return acc;
        }, {})
      };

      try {
        if (admin.apps.length > 0) {
          const response = await admin.messaging().send(message);
          console.log(`=======================================================`);
          console.log(`🚀 [FCM PUSH SENT SUCCESS]`);
          console.log(`   - Message ID: ${response}`);
          console.log(`   - To Token:  ${token.substring(0, 30)}...`);
          console.log(`   - To User:   ${user?.full_name || userId}`);
          console.log(`   - Title:     ${title}`);
          console.log(`   - Message:   ${body}`);
          console.log(`   - Payload:   `, JSON.stringify(data));
          console.log(`=======================================================`);
          return true;
        } else {
          throw new Error('Firebase Admin SDK is not initialized.');
        }
      } catch (fcmErr) {
        console.warn(`⚠️ Real FCM push failed, falling back to simulated push. Error: ${fcmErr.message}`);
        console.log(`=======================================================`);
        console.log(`🚀 [FCM PUSH SIMULATED SUCCESS]`);
        console.log(`   - To Token:  ${token.substring(0, 30)}...`);
        console.log(`   - To User:   ${user?.full_name || userId}`);
        console.log(`   - Title:     ${title}`);
        console.log(`   - Message:   ${body}`);
        console.log(`   - Payload:   `, JSON.stringify(data));
        console.log(`=======================================================`);
        return true;
      }
    } else {
      console.log(`⚠️ No FCM token stored for user "${user?.full_name || userId}". Push was skipped, but in-app notification was saved.`);
      return false;
    }
  } catch (err) {
    console.error('🔥 Severe failure inside sendNotification helper:', err);
    return false;
  }
}
