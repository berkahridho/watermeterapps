# Environment Setup for RT PIC User Management

## 🔑 Required Environment Variables

To enable user creation functionality, you need to add the Supabase Service Role Key to your environment variables.

### Current `.env.local` (you already have these):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### **NEW: Add Service Role Key**
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔍 How to Get Your Service Role Key

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to **Settings** → **API**

### Step 2: Find Service Role Key
1. Scroll down to **Project API keys**
2. Look for **service_role** key (NOT the anon key)
3. Click the **eye icon** to reveal the key
4. Copy the entire key

### Step 3: Add to Environment File
1. Open your `.env.local` file
2. Add the new line:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Save the file

### Step 4: Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

## ⚠️ Security Important Notes

### **Service Role Key Security**
- ✅ **NEVER commit** service role key to version control
- ✅ **Add to .gitignore**: Ensure `.env.local` is in `.gitignore`
- ✅ **Server-side only**: This key is only used in API routes
- ✅ **Full database access**: This key bypasses RLS policies

### **Production Deployment**
When deploying to production (Vercel, Netlify, etc.):
1. Add `SUPABASE_SERVICE_ROLE_KEY` to your hosting platform's environment variables
2. Never expose this key in client-side code
3. Only use in server-side API routes

## 🧪 Test User Creation

After adding the service role key:

### Step 1: Restart Server
```bash
npm run dev
```

### Step 2: Test User Creation
1. Login as admin (`admin@example.com`)
2. Go to **Admin** → **Users**
3. Click **Add User**
4. Fill in the form:
   ```
   Email: test@example.com
   Full Name: Test User
   Phone: 081234567890
   Role: RT PIC
   Assigned RT: RT 01
   Password: testpass123
   ```
5. Click **Create User**

### Step 3: Verify Success
- ✅ Should see "User created successfully!" message
- ✅ New user appears in the user list
- ✅ User can login with the created credentials

## 🔧 Troubleshooting

### Error: "Missing service role key"
- ✅ Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Restart development server
- ✅ Verify key is correct (starts with `eyJ`)

### Error: "Unauthorized"
- ✅ Make sure you're logged in as admin
- ✅ Check admin email is `admin@example.com`
- ✅ Clear browser cache and try again

### Error: "Failed to create auth user"
- ✅ Check service role key is valid
- ✅ Verify Supabase project is active
- ✅ Check email doesn't already exist

### User created but no profile
- ✅ Check if trigger `on_auth_user_created` exists
- ✅ Run the user management SQL script again
- ✅ Profile should be created automatically

## 📝 Complete Environment File Example

Your final `.env.local` should look like:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_key_here

# Optional: Add other environment variables as needed
# NODE_ENV=development
```

## 🚀 Ready to Create RT PIC Users!

Once you've added the service role key and restarted the server, you can:

1. **Create RT PIC users** directly from the admin interface
2. **Assign RTs** to each user
3. **Set roles and permissions** appropriately
4. **Test login** with created users
5. **Start field work** with offline capabilities

The system will handle:
- ✅ Auth user creation in Supabase
- ✅ Profile creation with RT assignments
- ✅ Role-based access control
- ✅ Offline sync for field workers

**Your RT PIC user management system is ready! 🎉**