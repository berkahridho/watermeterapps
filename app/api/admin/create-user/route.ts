import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This requires the service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Validate environment variables on startup
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
} else {
  console.log('✅ Service role key loaded:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin (basic check)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, username, password, full_name, role, assigned_rt, phone } = body;

    // Validate required fields
    if (!email || !username || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, username, password, full_name, role' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 50 characters' },
        { status: 400 }
      );
    }

    // Validate username contains only alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists. Please choose a different username.' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'rt_pic', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        assigned_rt
      }
    });

    if (authError) {
      const errorMessage = authError.message || 'Unknown authentication error';
      return NextResponse.json(
        { error: `Authentication failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 400 }
      );
    }

    // Create/update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email,
        username,
        full_name,
        phone: phone || null,
        role,
        assigned_rt: assigned_rt || null,
        is_active: true
      });

    if (profileError) {
      // User was created but profile failed - this is still a partial success
      return NextResponse.json({
        success: true,
        user: authData.user,
        warning: 'User created but profile creation failed. Profile might be created by trigger.'
      });
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      message: 'User created successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}