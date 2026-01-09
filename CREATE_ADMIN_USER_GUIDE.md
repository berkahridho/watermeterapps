# Create Secure Admin User Guide

## Step 1: Create Admin User in Supabase Auth

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Fill in:
   - **Email**: `your-admin-email@yourdomain.com` (use your real email)
   - **Password**: Generate a strong password (use password manager)
   - **Email Confirm**: Set to `true` if you want email verification
5. Click **Create User**

### Option B: Using SQL (Alternative)
```sql
-- Run this in Supabase SQL Editor
-- Replace with your actual admin email and a strong password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'your-admin@yourdomain.com',
  crypt('your-strong-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

## Step 2: Add Admin to User Profiles Table

```sql
-- Run this after creating the auth user
-- Replace the email with your actual admin email
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  phone,
  assigned_rt,
  is_active,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-admin@yourdomain.com'),
  'your-admin@yourdomain.com',
  'System Administrator',
  'admin',
  '+62-xxx-xxx-xxxx',
  NULL,
  true,
  NOW(),
  NOW()
);
```

## Step 3: Update Login System (Remove Demo Admin)

The system will automatically work with the real admin user since it already supports Supabase Auth. The demo admin fallback can be removed for production.

## Step 4: Security Best Practices

### Strong Password Requirements
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Use a password manager
- Enable 2FA if available

### Environment Security
- Never commit real credentials to git
- Use environment variables for sensitive data
- Regularly rotate passwords
- Monitor login attempts

### Access Control
- Create separate admin accounts for each administrator
- Use principle of least privilege
- Regularly audit user permissions
- Disable unused accounts

## Step 5: Production Deployment Checklist

- [ ] Remove demo admin fallback from production code
- [ ] Create real admin users in Supabase Auth
- [ ] Add admin users to user_profiles table
- [ ] Test login with real credentials
- [ ] Set up password rotation policy
- [ ] Configure login monitoring/alerts
- [ ] Document admin user management procedures

## Emergency Access

Keep a secure backup of admin credentials:
1. Store in company password manager
2. Document recovery procedures
3. Have multiple admin users
4. Keep offline backup of recovery keys

## Monitoring & Auditing

- Monitor failed login attempts
- Log admin actions
- Regular security reviews
- User access audits