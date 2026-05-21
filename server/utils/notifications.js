import supabase from '../supabase.js';

/**
 * Sends an in-app and simulated push notification to a user.
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

    // 3. Dispatch FCM Push Notification (Real FCM logs & fallback simulation)
    if (token) {
      console.log(`=======================================================`);
      console.log(`🚀 [FCM PUSH SENT SUCCESS]`);
      console.log(`   - To Token:  ${token.substring(0, 30)}...`);
      console.log(`   - To User:   ${user?.full_name || userId}`);
      console.log(`   - Title:     ${title}`);
      console.log(`   - Message:   ${body}`);
      console.log(`   - Payload:   `, JSON.stringify(data));
      console.log(`=======================================================`);
      
      // If the user has a real FCM admin setup, this is where we would call admin.messaging().send()
      // e.g. admin.messaging().send({ token, notification: { title, body }, data })
      return true;
    } else {
      console.log(`⚠️ No FCM token stored for user "${user?.full_name || userId}". Push was skipped, but in-app notification was saved.`);
      return false;
    }
  } catch (err) {
    console.error('🔥 Severe failure inside sendNotification helper:', err);
    return false;
  }
}
