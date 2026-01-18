# Username Field Setup Guide

## Overview
This guide explains how to add username support to the user management system. Users can now login using either their email or username.

## Database Migration

### Step 1: Run the Migration
Execute the SQL migration in your Supabase SQL editor:

```sql
-- File: database-username-setup.sql
-- Copy and paste the entire content into Supabase SQL editor
```

**Location**: Supabase Dashboard → SQL Editor → Create new query → Paste content → Run

### What the Migration Does
1. Adds `username` column to `user_profiles` table (VARCHAR 50, UNIQUE)
2. Creates an index on username for faster lookups
3. Populates existing users with usernames derived from their email (part before @)
4. Adds documentation comment

### Step 2: Verify the Migration
After running the migration, verify the column was added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

You should see a `username` column with type `character varying`.

## Component Updates

### UserManagement.tsx Changes
- Added `username` field to the form
- Username is required when creating new users
- Username cannot be changed after creation (disabled in edit mode)
- Username is displayed in the user list with @ prefix (e.g., @john_doe)
- Username is sent to the API when creating users

### API Route Updates Required
Update `/api/admin/create-user` to handle the username field:

```typescript
// In your create-user API route, add:
username: string; // Add to request body validation

// When creating the user profile:
const { error } = await supabase
  .from('user_profiles')
  .insert([{
    id: user.user.id,
    email: email,
    username: username, // Add this line
    full_name: full_name,
    phone: phone,
    role: role,
    assigned_rt: assigned_rt,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }]);
```

## Login System Integration

The login page (`app/page.tsx`) already supports username login. It:
1. Detects if input contains @ (email) or not (username)
2. If username, looks up the email in user_profiles table
3. Uses the email for Supabase authentication

No changes needed to the login page.

## Username Naming Conventions

Recommended username format:
- Lowercase letters and numbers only
- Use underscores for spaces (e.g., `john_doe`)
- 3-20 characters long
- No special characters except underscore

Examples:
- `admin` → admin@example.com
- `rt_pic_01` → RT PIC for RT 01
- `collector_berkah` → Collector name

## Existing Users

After running the migration:
- All existing users will have usernames auto-generated from their email
- Example: `admin@example.com` → username: `admin`
- Users can login with either email or username

## Troubleshooting

### Username Already Exists Error
If you get a unique constraint error when creating a user:
- The username is already taken
- Choose a different username
- Usernames are case-insensitive in the database

### Migration Failed
If the migration fails:
1. Check that the `user_profiles` table exists
2. Verify you have admin access to the database
3. Check Supabase logs for specific error messages
4. Try running the migration in smaller steps

### Username Not Showing in List
If usernames don't appear in the user list:
1. Verify the migration ran successfully
2. Refresh the page
3. Check browser console for errors
4. Verify the component is using the latest code

## Rollback (If Needed)

To remove the username column:

```sql
-- Drop the index first
DROP INDEX IF EXISTS idx_user_profiles_username;

-- Drop the column
ALTER TABLE user_profiles
DROP COLUMN username;
```

## Next Steps

1. Run the migration in Supabase
2. Update the API route to handle username
3. Test creating a new user with a username
4. Test logging in with the username
5. Verify existing users can still login with email
