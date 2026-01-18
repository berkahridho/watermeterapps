-- Fix username constraint issue
-- This script handles empty/null usernames that are causing unique constraint violations

-- Step 1: Remove the existing unique index if it exists
DROP INDEX IF EXISTS idx_user_profiles_username;

-- Step 2: Update any empty or null usernames with a generated value
UPDATE user_profiles 
SET username = CONCAT('user_', SUBSTRING(id::text, 1, 8))
WHERE username IS NULL OR username = '' OR TRIM(username) = '';

-- Step 3: Ensure all usernames are unique by adding a suffix to duplicates
WITH duplicate_usernames AS (
  SELECT username, ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM user_profiles
  WHERE username IS NOT NULL AND username != ''
)
UPDATE user_profiles 
SET username = CONCAT(user_profiles.username, '_', dup.rn)
FROM duplicate_usernames dup
WHERE user_profiles.username = dup.username 
AND dup.rn > 1;

-- Step 4: Create unique constraint on non-empty usernames only
CREATE UNIQUE INDEX idx_user_profiles_username 
ON user_profiles(username) 
WHERE username IS NOT NULL AND username != '';

-- Step 5: Add check constraint to prevent empty usernames
ALTER TABLE user_profiles 
ADD CONSTRAINT chk_username_not_empty 
CHECK (username IS NOT NULL AND TRIM(username) != '');

-- Step 6: Update any remaining null usernames (safety check)
UPDATE user_profiles 
SET username = CONCAT('user_', SUBSTRING(id::text, 1, 8))
WHERE username IS NULL OR TRIM(username) = '';