# 🎯 Demo User Creation - Simple Setup

## 🤔 Current Situation

You're using **demo authentication** where:
- `admin@example.com` is hardcoded (not a real Supabase user)
- This is perfectly fine for testing!
- You can still create RT PIC users

## 🚀 Quick Setup (No Real Auth Needed)

### Step 1: Find Service Role Key
Follow `SUPABASE_SETUP_GUIDE.md` to find your service role key in:
**Supabase Dashboard** → **Settings** → **API** → **service_role**

### Step 2: Add to Environment
Add to `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Test User Creation
1. Login with `admin@example.com` / `password`
2. Go to **Admin** → **Users**
3. Create a test RT PIC user

## 🧪 Create Your First RT PIC User

Try creating:
```
Email: rtpic01@test.com
Full Name: Test RT PIC
Phone: 081234567890
Role: RT PIC
Assigned RT: RT 01
Password: test123
```

## ✅ What Will Happen

1. **Real Supabase user** will be created (even though admin is demo)
2. **User profile** will be created in database
3. **RT PIC can login** with the created credentials
4. **RT PIC will see** only their assigned RT customers

## 🔄 Migration Path

Later, when you're ready:
1. Create real admin user in Supabase
2. Update authentication system
3. All RT PIC users will still work

## 📞 Need Help?

Tell me:
1. **Can you find the service role key?** (Yes/No)
2. **What do you see** in Supabase Settings → API?
3. **Do you want to** try creating a test user first?

I'll help you get it working! 🚀