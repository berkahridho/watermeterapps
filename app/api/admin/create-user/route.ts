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
    console.log('🔄 API: Starting user creation process...');
    
    // Check if user is admin (basic check - you might want to improve this)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ API: No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 API: Request body received:', { 
      email: body.email, 
      username: body.username,
      role: body.role, 
      assigned_rt: body.assigned_rt 
    });
    
    const { email, username, password, full_name, role, assigned_rt, phone } = body;

    // Validate required fields
    if (!email || !username || !password || !full_name || !role) {
      console.log('❌ API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: email, username, password, full_name, role' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || username.length > 50) {
      console.log('❌ API: Username length invalid');
      return NextResponse.json(
        { error: 'Username must be between 3 and 50 characters' },
        { status: 400 }
      );
    }

    // Validate username contains only alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.log('❌ API: Username contains invalid characters');
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      console.log('❌ API: Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    console.log('🔑 API: Creating auth user...');
    
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
      console.error('❌ API: Auth error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError
      });
      return NextResponse.json(
        { error: `Database error creating new user: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.log('❌ API: No user data returned');
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 400 }
      );
    }

    console.log('✅ API: Auth user created successfully:', authData.user.id);
    console.log('👤 API: Creating user profile...');

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
      console.error('⚠️ API: Profile error:', profileError);
      // User was created but profile failed - this is still a partial success
      return NextResponse.json({
        success: true,
        user: authData.user,
        warning: 'User created but profile creation failed. Profile might be created by trigger.'
      });
    }

    console.log('✅ API: User and profile created successfully');
    return NextResponse.json({
      success: true,
      user: authData.user,
      message: 'User created successfully'
    });

  } catch (error: any) {
    console.error('💥 API: Unexpected error:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}