-- Fix foreign key constraint issue preventing user creation
-- The user_profiles.id must reference an existing auth.users.id

-- Step 1: Check the current foreign key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='user_profiles';

-- Step 2: Check if the foreign key is causing issues
-- This constraint should exist and is actually correct - profiles should reference auth users
-- The issue is that we're trying to create profiles without corresponding auth users

-- Step 3: Fix the role constraint (this is still needed)
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'rt_pic', 'viewer'));

-- Step 4: Update any existing 'collector' roles to 'rt_pic'
UPDATE public.user_profiles 
SET role = 'rt_pic' 
WHERE role = 'collector';

-- Step 5: Ensure RLS policies are correct for the service role
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert for service role" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create simple, comprehensive policies
CREATE POLICY "Service role can do everything"
    ON public.user_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read own profile"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 6: Grant all necessary permissions
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_profiles TO postgres;

-- Step 7: Create a function to safely create user profiles
CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_id UUID,
    user_email TEXT,
    user_username TEXT,
    user_full_name TEXT,
    user_role TEXT DEFAULT 'rt_pic',
    user_phone TEXT DEFAULT NULL,
    user_assigned_rt TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if auth user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RAISE EXCEPTION 'Auth user with id % does not exist', user_id;
    END IF;
    
    -- Insert the profile
    INSERT INTO public.user_profiles (
        id,
        email,
        username,
        full_name,
        role,
        phone,
        assigned_rt,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        user_username,
        user_full_name,
        user_role,
        user_phone,
        user_assigned_rt,
        true,
        NOW(),
        NOW()
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;

-- Final status messages
DO $$
BEGIN
    RAISE NOTICE '=== FOREIGN KEY AND ROLE CONSTRAINT FIX COMPLETED ===';
    RAISE NOTICE 'Fixed role constraint to allow: admin, rt_pic, viewer';
    RAISE NOTICE 'Updated RLS policies for service role access';
    RAISE NOTICE 'Created helper function: create_user_profile()';
    RAISE NOTICE 'The foreign key constraint is correct - profiles must reference auth users';
    RAISE NOTICE 'User creation should now work properly';
END $$;