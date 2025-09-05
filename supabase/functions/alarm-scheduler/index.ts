/**
 * Alarm Scheduler Edge Function
 * 
 * Handles alarm scheduling and notification delivery for the mobile app.
 * Processes alarm triggers, manages notification delivery, and handles
 * background task coordination for reliable wake-up functionality.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface AlarmTriggerRequest {
  alarm_id: string;
  user_id: string;
  trigger_time: string;
  notification_token?: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  sound?: string;
  vibrate?: boolean;
  priority?: 'high' | 'normal';
  data?: Record<string, any>;
}

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Send push notification via FCM
 */
async function sendPushNotification(
  token: string,
  payload: NotificationPayload
): Promise<boolean> {
  if (!fcmServerKey) {
    console.error('FCM server key not configured');
    return false;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: payload.sound || 'default',
        },
        data: payload.data || {},
        android: {
          priority: payload.priority || 'high',
          notification: {
            channel_id: 'alarm_channel',
            vibrate_timings: payload.vibrate ? [0, 300, 300, 300] : undefined,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: payload.sound || 'default.caf',
              'content-available': 1,
            },
          },
          headers: {
            'apns-priority': payload.priority === 'high' ? '10' : '5',
            'apns-push-type': 'alert',
          },
        },
      }),
    });

    const result = await response.json();
    
    if (result.success === 1) {
      console.log('Push notification sent successfully');
      return true;
    } else {
      console.error('FCM error:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Get alarm details and user preferences
 */
async function getAlarmContext(alarmId: string) {
  const { data: alarm, error: alarmError } = await supabase
    .from('alarms')
    .select(`
      *,
      users!inner (
        id,
        timezone,
        subscription_status,
        is_premium
      )
    `)
    .eq('id', alarmId)
    .eq('enabled', true)
    .single();

  if (alarmError || !alarm) {
    throw new Error(`Alarm not found or disabled: ${alarmError?.message}`);
  }

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', alarm.user_id)
    .single();

  return { alarm, preferences };
}

/**
 * Check if alarm should trigger based on Do Not Disturb settings
 */
function shouldTriggerAlarm(alarm: any, preferences: any, currentTime: Date): boolean {
  if (!preferences?.do_not_disturb_enabled) {
    return true;
  }

  const dndStart = preferences.do_not_disturb_start;
  const dndEnd = preferences.do_not_disturb_end;

  if (!dndStart || !dndEnd) {
    return true;
  }

  // Convert time strings to minutes
  const [currentHour, currentMinute] = [currentTime.getHours(), currentTime.getMinutes()];
  const currentMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = dndStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;

  const [endHour, endMinute] = dndEnd.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;

  // Handle overnight DND periods
  if (startMinutes > endMinutes) {
    return currentMinutes < startMinutes && currentMinutes > endMinutes;
  } else {
    return currentMinutes < startMinutes || currentMinutes > endMinutes;
  }
}

/**
 * Create active session for alarm
 */
async function createActiveSession(alarm: any) {
  const sessionData = {
    user_id: alarm.user_id,
    alarm_id: alarm.id,
    session_type: alarm.white_noise_enabled ? 'combined' : 'alarm',
    status: 'active',
    started_at: new Date().toISOString(),
    audio_file_url: alarm.audio_file_url,
    volume: alarm.volume,
    white_noise_enabled: alarm.white_noise_enabled,
    white_noise_file_url: alarm.white_noise_file_url,
    white_noise_volume: alarm.white_noise_volume,
    progress_percentage: 0,
    metadata: {
      alarm_name: alarm.name,
      trigger_time: new Date().toISOString(),
      snooze_count: 0,
      max_snooze: alarm.snooze_count_limit,
    },
  };

  const { data, error } = await supabase
    .from('active_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating active session:', error);
    throw error;
  }

  return data;
}

/**
 * Update alarm's last triggered time and calculate next trigger
 */
async function updateAlarmTrigger(alarmId: string) {
  const { error } = await supabase
    .from('alarms')
    .update({
      last_triggered_at: new Date().toISOString(),
    })
    .eq('id', alarmId);

  if (error) {
    console.error('Error updating alarm trigger:', error);
  }
}

/**
 * Process alarm trigger
 */
async function processAlarmTrigger(request: AlarmTriggerRequest) {
  try {
    console.log('Processing alarm trigger:', request);

    // Get alarm and user context
    const { alarm, preferences } = await getAlarmContext(request.alarm_id);
    const currentTime = new Date();

    // Check Do Not Disturb
    if (!shouldTriggerAlarm(alarm, preferences, currentTime)) {
      console.log('Alarm skipped due to Do Not Disturb settings');
      return {
        success: false,
        message: 'Alarm skipped due to Do Not Disturb settings',
        skipped: true,
      };
    }

    // Create active session
    const session = await createActiveSession(alarm);
    console.log('Created active session:', session.id);

    // Send push notification if token provided
    if (request.notification_token) {
      const notificationPayload: NotificationPayload = {
        title: alarm.name || 'Alarm',
        body: `It's time to wake up! ${alarm.time}`,
        sound: 'alarm_sound.wav',
        vibrate: alarm.vibration_enabled,
        priority: 'high',
        data: {
          type: 'alarm_trigger',
          alarm_id: alarm.id,
          session_id: session.id,
          snooze_enabled: alarm.snooze_enabled.toString(),
          snooze_duration: alarm.snooze_duration.toString(),
          white_noise_enabled: alarm.white_noise_enabled.toString(),
        },
      };

      const notificationSent = await sendPushNotification(
        request.notification_token,
        notificationPayload
      );

      if (!notificationSent) {
        console.warn('Push notification failed, but alarm will continue');
      }
    }

    // Update alarm trigger information
    await updateAlarmTrigger(request.alarm_id);

    return {
      success: true,
      message: 'Alarm triggered successfully',
      session_id: session.id,
      alarm: {
        id: alarm.id,
        name: alarm.name,
        time: alarm.time,
      },
    };
  } catch (error) {
    console.error('Error processing alarm trigger:', error);
    return {
      success: false,
      message: error.message,
      error: error.toString(),
    };
  }
}

/**
 * Get upcoming alarms for scheduling
 */
async function getUpcomingAlarms(minutes: number = 60) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);

  const { data: alarms, error } = await supabase
    .from('alarms')
    .select(`
      id,
      user_id,
      name,
      time,
      next_trigger_at,
      enabled,
      users!inner (
        timezone
      )
    `)
    .eq('enabled', true)
    .gte('next_trigger_at', now.toISOString())
    .lte('next_trigger_at', futureTime.toISOString())
    .order('next_trigger_at');

  if (error) {
    console.error('Error fetching upcoming alarms:', error);
    return [];
  }

  return alarms || [];
}

/**
 * Health check endpoint
 */
async function healthCheck() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('alarms')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Alarm scheduler is healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      fcm: fcmServerKey ? 'configured' : 'not configured',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Main handler
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Health check endpoint
    if (method === 'GET' && url.pathname.endsWith('/health')) {
      const health = await healthCheck();
      return new Response(JSON.stringify(health), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: health.success ? 200 : 500,
      });
    }

    // Get upcoming alarms endpoint
    if (method === 'GET' && url.pathname.endsWith('/upcoming')) {
      const minutes = parseInt(url.searchParams.get('minutes') || '60');
      const upcomingAlarms = await getUpcomingAlarms(minutes);
      
      return new Response(JSON.stringify({
        success: true,
        data: upcomingAlarms,
        count: upcomingAlarms.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Alarm trigger endpoint
    if (method === 'POST' && url.pathname.endsWith('/trigger')) {
      const requestData = await req.json() as AlarmTriggerRequest;
      
      // Validate required fields
      if (!requestData.alarm_id || !requestData.user_id) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Missing required fields: alarm_id and user_id',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const result = await processAlarmTrigger(requestData);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400,
      });
    }

    // Route not found
    return new Response(JSON.stringify({
      success: false,
      message: 'Route not found',
      available_endpoints: [
        'GET /health - Health check',
        'GET /upcoming?minutes=60 - Get upcoming alarms',
        'POST /trigger - Trigger alarm',
      ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    });

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});