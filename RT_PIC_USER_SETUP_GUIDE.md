# RT PIC User Setup Guide

This guide explains how to create and manage RT PIC (Person In Charge) users for the Water Meter Monitoring System.

## 🎯 Overview

The system now supports multiple user types:
- **Admin**: Full system access, user management, discount management
- **RT PIC**: Meter reading for assigned RT, view reports for their RT  
- **Collector**: Money collection tracking, payment recording

## 📋 Prerequisites

✅ You have run `database-user-management-setup.sql` in Supabase SQL Editor
✅ You have admin access to the system (`admin@example.com`)
✅ You have access to Supabase Dashboard

## 🔧 Step 1: Create Auth Users in Supabase

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → Your Project → Authentication → Users
2. **Click "Add User"**
3. **Fill in user details**:
   ```
   Email: rtpic01@pamdes.com
   Password: [Generate secure password]
   Email Confirm: ✅ (checked)
   ```
4. **Add User Metadata** (optional but recommended):
   ```json
   {
     "full_name": "Budi Santoso",
     "role": "rt_pic",
     "assigned_rt": "RT 01"
   }
   ```
5. **Click "Create User"**

### Method 2: Using Supabase API (Advanced)

```javascript
// Example API call to create user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'rtpic01@pamdes.com',
  password: 'SecurePassword123!',
  email_confirm: true,
  user_metadata: {
    full_name: 'Budi Santoso',
    role: 'rt_pic',
    assigned_rt: 'RT 01'
  }
})
```

## 🏠 Step 2: Assign RT Responsibilities

### Recommended RT PIC Structure

```
RT 01 → rtpic01@pamdes.com (Budi Santoso)
RT 02 → rtpic02@pamdes.com (Siti Aminah)  
RT 03 → rtpic03@pamdes.com (Ahmad Wijaya)
RT 04 → rtpic04@pamdes.com (Dewi Sartika)
RT 05 → rtpic05@pamdes.com (Joko Susilo)
```

### User Profile Management

1. **Login as Admin** (`admin@example.com`)
2. **Go to Admin → Users** in the navigation
3. **Edit each user profile**:
   - Set correct **Full Name**
   - Set **Role** to "RT PIC"
   - Assign **RT** (e.g., "RT 01")
   - Set **Phone** number
   - Ensure **Status** is Active

## 📱 Step 3: RT PIC User Experience

### What RT PICs Can Do:
- ✅ **Meter Reading**: Input readings for customers in their assigned RT
- ✅ **Offline Capability**: Work without internet, sync when online
- ✅ **View Reports**: See billing reports for their RT only
- ✅ **Customer List**: View customers in their assigned RT
- ❌ **Cannot**: Manage discounts, create users, access other RTs

### RT PIC Login Process:
1. **Go to** your water meter system URL
2. **Login with** assigned email and password
3. **System automatically filters** to show only their RT customers
4. **Start meter reading** - data syncs automatically when online

## 🔄 Step 4: Optimize for Field Work

### Mobile-First Setup:
- **Bookmark** the system URL on mobile devices
- **Enable** "Add to Home Screen" for app-like experience
- **Test offline** functionality in areas with poor signal
- **Train users** on sync indicators and manual sync

### Data Sync Strategy:
- **Before going to field**: Ensure device is online to download latest data
- **During field work**: System works offline, stores readings locally
- **After field work**: Return to area with good signal, data syncs automatically
- **Manual sync**: Use sync button if needed

## 🛠️ Step 5: User Management Best Practices

### Security:
- ✅ Use strong passwords for all RT PIC accounts
- ✅ Change default passwords immediately
- ✅ Regular password updates (quarterly)
- ✅ Monitor user activity through admin dashboard

### Training:
- ✅ Train RT PICs on mobile app usage
- ✅ Explain offline/online indicators
- ✅ Practice meter reading input process
- ✅ Show how to handle validation errors

### Monitoring:
- ✅ Check sync status regularly
- ✅ Monitor reading completion rates per RT
- ✅ Review data quality and anomalies
- ✅ Provide feedback and support

## 🚨 Troubleshooting

### Common Issues:

**1. User can't login**
- ✅ Check email spelling
- ✅ Verify user exists in Supabase Auth
- ✅ Check user profile is active
- ✅ Reset password if needed

**2. RT PIC sees wrong customers**
- ✅ Check RT assignment in user profile
- ✅ Verify customer RT data is correct
- ✅ Refresh browser/clear cache

**3. Offline sync not working**
- ✅ Check internet connection
- ✅ Look for sync error messages
- ✅ Try manual sync button
- ✅ Clear offline data if corrupted

**4. Readings not saving**
- ✅ Check validation errors
- ✅ Verify reading is higher than previous
- ✅ Check for duplicate readings in same month
- ✅ Review anomaly warnings

## 📊 Step 6: Monitor System Usage

### Admin Dashboard Monitoring:
- **User Activity**: Track login frequency per RT PIC
- **Reading Completion**: Monitor which RTs have complete readings
- **Sync Status**: Check for users with pending sync items
- **Data Quality**: Review anomalies and validation issues

### Monthly Review Process:
1. **Check completion rates** per RT
2. **Review data quality** and anomalies  
3. **Update user assignments** if needed
4. **Provide feedback** to RT PICs
5. **Plan training** for improvement areas

## 🎯 Success Metrics

### Target KPIs:
- **Reading Completion**: >95% of customers read monthly
- **Data Quality**: <5% anomaly rate
- **Sync Success**: >98% successful sync rate
- **User Adoption**: All RT PICs actively using system

### Monthly Reports:
- RT completion rates
- User activity summary
- Data quality metrics
- System performance stats

---

## 📞 Support

For technical issues or questions:
1. **Check this guide** first
2. **Review error messages** in browser console
3. **Contact system administrator**
4. **Document issues** for system improvements

## 🔄 Updates

This system is continuously improved. Check for:
- New features and capabilities
- Updated user guides
- System performance enhancements
- Security updates

---

**Last Updated**: January 2025
**Version**: 1.0
**System**: Water Meter Monitoring System - RT PIC Management