# Production Security Setup

## 🔒 Security Improvements Implemented

### 1. Real Admin Authentication
- Removed hardcoded demo admin credentials
- All authentication now goes through Supabase Auth
- Admin users must be created in Supabase dashboard

### 2. Environment Security
```bash
# Required environment variables for production
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. User Role Security
- Admin role verification through database
- RT PIC users restricted to assigned RT only
- Proper role-based access control (RBAC)

## 🚀 Production Deployment Steps

### 1. Create Admin Users
```sql
-- Create admin user profile (after creating in Supabase Auth)
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  phone,
  is_active
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@yourdomain.com'),
  'admin@yourdomain.com',
  'System Administrator',
  'admin',
  '+62-xxx-xxx-xxxx',
  true
);
```

### 2. Environment Variables
```bash
# Production .env.local (never commit to git)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Optional: Add environment indicator
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

### 3. Database Security
```sql
-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_discounts ENABLE ROW LEVEL SECURITY;

-- Verify RLS policies are active
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

### 4. Remove Development Features
- Remove demo credentials from login page
- Remove debug buttons (Reset Data, Clear Month)
- Remove console.log statements in production
- Enable error reporting/monitoring

## 🛡️ Security Checklist

### Authentication
- [ ] Real admin users created in Supabase Auth
- [ ] Demo admin credentials removed
- [ ] Strong password policy enforced
- [ ] Email verification enabled (optional)

### Authorization
- [ ] RLS enabled on all tables
- [ ] Role-based access control working
- [ ] RT PIC users restricted to assigned RT
- [ ] Admin-only functions protected

### Data Protection
- [ ] Environment variables secured
- [ ] Service role key protected
- [ ] Database backups configured
- [ ] SSL/TLS enabled

### Monitoring
- [ ] Login attempt monitoring
- [ ] Error logging configured
- [ ] Performance monitoring
- [ ] Security audit logging

## 🚨 Security Warnings

### Never Do This:
- ❌ Commit real credentials to git
- ❌ Use demo credentials in production
- ❌ Share service role keys
- ❌ Disable RLS in production
- ❌ Use weak passwords

### Always Do This:
- ✅ Use environment variables for secrets
- ✅ Enable RLS on all tables
- ✅ Create separate admin accounts
- ✅ Monitor login attempts
- ✅ Regular security audits

## 📞 Emergency Procedures

### Lost Admin Access
1. Use Supabase dashboard to reset password
2. Check user_profiles table for role assignment
3. Verify RLS policies aren't blocking access
4. Contact Supabase support if needed

### Security Incident Response
1. Immediately change all passwords
2. Revoke compromised API keys
3. Check audit logs for unauthorized access
4. Update security policies
5. Document incident and lessons learned