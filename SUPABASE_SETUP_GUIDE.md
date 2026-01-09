# 🔑 Supabase Setup Guide - Step by Step

## 📍 Finding Your Service Role Key

### Step 1: Open Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### Step 2: Navigate to API Settings
1. In the left sidebar, click **Settings** (gear icon at bottom)
2. Click **API** from the settings menu

### Step 3: Find Project API Keys Section
Look for a section called **Project API keys**. You should see:

```
Project API keys
├── anon public (you already have this)
├── service_role (THIS IS WHAT YOU NEED) 🎯
```

### Step 4: Copy Service Role Key
1. Find the **service_role** key (NOT the anon key)
2. Click the **eye icon** 👁️ to reveal the key
3. Copy the entire key (starts with `eyJhbGciOiJIUzI1NiI...`)

### Visual Guide:
```
┌─────────────────────────────────────┐
│ Project API keys                    │
├─────────────────────────────────────┤
│ anon                               │
│ public                             │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6...    │ ← You already have this
├─────────────────────────────────────┤
│ service_role                       │ ← THIS ONE! 🎯
│ secret                             │
│ [👁️] eyJhbGciOiJIUzI1NiIsInR5... │ ← Click eye to reveal
└─────────────────────────────────────┘
```

## 🔧 Current Authentication Problem

### The Issue:
- Your current login (`admin@example.com`) is **fake/demo**
- It's not a real Supabase user
- It's just hardcoded in the app for testing

### The Solution:
We need to create a **real admin user** in Supabase

## 🚀 Let's Fix This Step by Step

### Option 1: Create Real Admin User (Recommended)

1. **Go to Supabase Dashboard** → **Authentication** → **Users**
2. **Click "Add User"**
3. **Fill in**:
   ```
   Email: admin@pamdes.com (or your preferred admin email)
   Password: YourSecurePassword123!
   Confirm Email: ✅ (checked)
   ```
4. **Click "Create User"**

### Option 2: Keep Demo System (Simpler for now)

If you want to keep it simple for now, we can continue with the demo system and create RT PIC users later.

## 📝 Add Service Role Key to Environment

Once you find your service role key:

1. **Open `.env.local`**
2. **Add this line**:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_key
   ```
3. **Save the file**

## 🧪 Test Your Setup

### Step 1: Validate Environment
```bash
npm run validate-env
```

### Step 2: Restart Server
```bash
npm run dev
```

### Step 3: Test User Creation
1. Login with `admin@example.com` / `password` (demo)
2. Go to **Admin** → **Users**
3. Try creating a test user

## 🤔 Which Option Should You Choose?

### Option A: Keep Demo System (Easier)
- ✅ **Pros**: Works immediately, no Supabase Auth setup needed
- ❌ **Cons**: Admin login is fake, not secure for production

### Option B: Real Supabase Auth (Better)
- ✅ **Pros**: Real authentication, secure, production-ready
- ❌ **Cons**: Requires creating real admin user in Supabase

## 📞 Let Me Know:

1. **Can you find the service role key** using the guide above?
2. **Which option do you prefer**:
   - A) Keep demo system for now (simpler)
   - B) Create real admin user (better)

Once you tell me, I can guide you through the next steps! 

## 🔍 If You Still Can't Find Service Role Key

If you can't find it, please tell me:
1. What do you see in **Settings** → **API**?
2. Can you see any section with "API keys" or similar?
3. What options are available in your Supabase dashboard?

I'll help you find it! 🕵️‍♂️