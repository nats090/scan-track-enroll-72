import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { TOTP } from 'https://esm.sh/otpauth@9.2.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  role: 'admin' | 'librarian';
  code: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 TOTP Verification request received');

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Parse request
    const { role, code }: VerifyRequest = await req.json();
    
    console.log(`📝 Verification attempt for role: ${role}, IP: ${clientIP}`);

    if (!role || !code) {
      console.error('❌ Missing role or code');
      return new Response(
        JSON.stringify({ error: 'Missing role or code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      console.error('❌ Invalid code format');
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check rate limiting (max 5 attempts per IP per role in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentAttempts, error: attemptsError } = await supabaseAdmin
      .from('totp_attempts')
      .select('id')
      .eq('ip_address', clientIP)
      .eq('role', role)
      .gte('attempted_at', fiveMinutesAgo);

    if (attemptsError) {
      console.error('❌ Error checking rate limit:', attemptsError);
    }

    if (recentAttempts && recentAttempts.length >= 5) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
      
      // Log failed attempt
      await supabaseAdmin.from('totp_attempts').insert({
        ip_address: clientIP,
        role,
        success: false
      });

      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch TOTP secret from database (using service role)
    console.log(`🔍 Fetching secret for role: ${role}`);
    const { data: secretData, error: secretError } = await supabaseAdmin
      .from('totp_secrets')
      .select('secret')
      .eq('role', role)
      .single();

    if (secretError || !secretData) {
      console.error('❌ Error fetching secret:', secretError);
      
      // Log failed attempt
      await supabaseAdmin.from('totp_attempts').insert({
        ip_address: clientIP,
        role,
        success: false
      });

      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify TOTP code
    console.log('🔐 Verifying TOTP code');
    const totp = new TOTP({
      secret: secretData.secret,
      digits: 6,
      period: 30,
    });

    const isValid = totp.validate({ token: code, window: 1 }) !== null;

    // Log attempt
    await supabaseAdmin.from('totp_attempts').insert({
      ip_address: clientIP,
      role,
      success: isValid
    });

    if (isValid) {
      console.log('✅ TOTP verification successful');
      
      // Generate a verification token (timestamp + random string)
      const verificationToken = `${Date.now()}_${crypto.randomUUID()}`;
      
      return new Response(
        JSON.stringify({ 
          success: true,
          token: verificationToken,
          expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.log('❌ Invalid TOTP code');
      return new Response(
        JSON.stringify({ error: 'Invalid code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
