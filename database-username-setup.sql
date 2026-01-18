-- Add username column to user_profiles table
-- This migration adds support for username-based login

-- Step 1: Add column as nullable first
ALTER TABLE user_profiles
ADD COLUMN username VARCHAR(50);

-- Step 2: Populate username from email for all users
UPDATE user_profiles
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE user_profiles
ALTER COLUMN username SET NOT NULL;

-- Step 4: Create unique index for faster username lookups
CREATE UNIQUE INDEX idx_user_profiles_username ON user_profiles(username);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN user_profiles.username IS 'Unique username for login, can be used instead of email';
