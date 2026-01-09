# 🧪 Test Login System

## ✅ What's Been Updated

1. **Login Page**: Now supports both demo and real Supabase authentication
2. **User Session**: Stores complete user profile information
3. **Backward Compatibility**: Demo admin still works

## 🔧 Testing Steps

### Step 1: Test Demo Admin (Should Still Work)
1. **Go to login page**
2. **Use demo credentials**:
   ```
   Email: admin@example.com
   Password: password
   ```
3. **Should login successfully** and go to dashboard

### Step 2: Test Real RT PIC User
1. **Go to login page**
2. **Use the user you created**:
   ```
   Email: [the email you created]
   Password: [the password you set]
   ```
3. **Should login successfully** and go to dashboard

### Step 3: Check User Session
After logging in with real user:
1. **Open browser console** (F12)
2. **Type**: `JSON.parse(localStorage.getItem('user'))`
3. **Should see**:
   ```javascript
   {
     id: "uuid-here",
     email: "user@example.com",
     role: "rt_pic",
     full_name: "User Name",
     assigned_rt: "RT 01",
     phone: "123456789",
     isDemo: false
   }
   ```

## 🎯 Expected Behavior

### For Demo Admin:
- ✅ **Can login** with `admin@example.com`
- ✅ **Sees all features** (Admin menu, all RTs)
- ✅ **Can create users**
- ✅ **Session shows**: `isDemo: true`

### For RT PIC Users:
- ✅ **Can login** with created credentials
- ✅ **Sees limited features** (no Admin menu)
- ✅ **Only sees assigned RT** customers
- ✅ **Session shows**: `isDemo: false`

## 🚨 Troubleshooting

### "Invalid email or password"
- ✅ **Check spelling** of email and password
- ✅ **Verify user exists** in Supabase Auth → Users
- ✅ **Check user is active** in user_profiles table
- ✅ **Try demo admin** to verify system works

### User logs in but sees wrong data
- ✅ **Check user profile** in database
- ✅ **Verify RT assignment** is correct
- ✅ **Clear browser cache** and try again

### Console errors
- ✅ **Check browser console** for detailed errors
- ✅ **Check server logs** for API errors
- ✅ **Verify environment variables** are loaded

## 📋 Next Steps After Testing

If login works for both demo and real users:

1. **Create more RT PIC users** for each RT
2. **Test RT-specific data filtering**
3. **Test offline meter reading** functionality
4. **Train RT PICs** on the system

## 🎉 Success Criteria

- ✅ Demo admin can login and access everything
- ✅ RT PIC users can login with created credentials
- ✅ RT PIC users only see their assigned RT data
- ✅ User sessions contain correct profile information
- ✅ Navigation shows appropriate menus per user role

Let me know the results of your testing! 🧪