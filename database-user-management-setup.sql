-- User Management Setup for Water Meter Monitoring System
-- Creates user profiles and RT assignments for field workers

-- Create user_profiles table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'rt_pic' CHECK (role IN ('admin', 'rt_pic', 'collector')),
    assigned_rt TEXT, -- RT that this user is responsible for (e.g., "RT 01")
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RT assignments table for more complex RT management
CREATE TABLE IF NOT EXISTS rt_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    rt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'pic' CHECK (role IN ('pic', 'collector', 'backup')),
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_rt ON user_profiles(assigned_rt);
CREATE INDEX IF NOT EXISTS idx_rt_assignments_user_rt ON rt_assignments(user_id, rt);
CREATE INDEX IF NOT EXISTS idx_rt_assignments_rt_active ON rt_assignments(rt, is_active);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_profiles_policy" ON user_profiles;
DROP POLICY IF EXISTS "rt_assignments_policy" ON rt_assignments;

-- Create RLS policies (simple for now, compatible with existing setup)
CREATE POLICY "user_profiles_policy" ON user_profiles FOR ALL USING (true);
CREATE POLICY "rt_assignments_policy" ON rt_assignments FOR ALL USING (true);

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'rt_pic')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert admin user profile (update email to match your admin)
INSERT INTO user_profiles (id, email, full_name, role, assigned_rt, is_active)
SELECT 
    id,
    email,
    'System Administrator',
    'admin',
    NULL,
    true
FROM auth.users 
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = 'System Administrator',
    updated_at = NOW();

-- Create sample RT PIC users (you can modify these)
-- Note: These are just profile records. Actual auth users need to be created through Supabase Auth

-- Function to get available RTs from customers table
CREATE OR REPLACE FUNCTION get_available_rts()
RETURNS TABLE(rt TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT c.rt
    FROM customers c
    WHERE c.rt IS NOT NULL AND c.rt != ''
    ORDER BY c.rt;
END;
$$ LANGUAGE plpgsql;

-- View to see RT assignments with user details
CREATE OR REPLACE VIEW rt_user_assignments AS
SELECT 
    up.id as user_id,
    up.email,
    up.full_name,
    up.phone,
    up.role,
    up.assigned_rt,
    up.is_active as user_active,
    ra.rt as additional_rt,
    ra.role as rt_role,
    ra.is_active as assignment_active,
    ra.assigned_date
FROM user_profiles up
LEFT JOIN rt_assignments ra ON up.id = ra.user_id
WHERE up.role IN ('rt_pic', 'collector')
ORDER BY up.assigned_rt, up.full_name;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profiles for RT PICs and collectors';
COMMENT ON TABLE rt_assignments IS 'Additional RT assignments for users who handle multiple RTs';
COMMENT ON COLUMN user_profiles.assigned_rt IS 'Primary RT assignment for this user';
COMMENT ON COLUMN user_profiles.role IS 'User role: admin, rt_pic (RT Person In Charge), or collector';

-- Verify tables were created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('user_profiles', 'rt_assignments')
ORDER BY table_name, ordinal_position;

-- Show available RTs for assignment
SELECT 'Available RTs for assignment:' as info;
SELECT * FROM get_available_rts();