// Environment Validation Script
// Run with: node scripts/validate-environment.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Environment Setup...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.log('📝 Create .env.local file in project root');
  process.exit(1);
}

// Read environment file
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

// Required environment variables
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const found = {};
let allValid = true;

// Check each required variable
required.forEach(varName => {
  const line = envLines.find(line => line.startsWith(varName + '='));
  if (line) {
    const value = line.split('=')[1];
    found[varName] = value ? '✅ Found' : '⚠️  Empty';
    if (!value) allValid = false;
  } else {
    found[varName] = '❌ Missing';
    allValid = false;
  }
});

// Display results
console.log('📋 Environment Variables Check:');
console.log('================================');
Object.entries(found).forEach(([key, status]) => {
  console.log(`${key}: ${status}`);
});

console.log('\n🔑 Service Role Key Validation:');
console.log('===============================');
const serviceKey = envLines.find(line => line.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
if (serviceKey) {
  const keyValue = serviceKey.split('=')[1];
  if (keyValue && keyValue.startsWith('eyJ')) {
    console.log('✅ Service role key format looks correct');
  } else {
    console.log('⚠️  Service role key format might be incorrect');
    console.log('   Should start with "eyJ"');
    allValid = false;
  }
} else {
  console.log('❌ Service role key not found');
  allValid = false;
}

console.log('\n📁 File Structure Check:');
console.log('========================');
const criticalFiles = [
  'app/api/admin/create-user/route.ts',
  'components/UserManagement.tsx',
  'database-user-management-setup.sql',
  'lib/roleService.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
    allValid = false;
  }
});

console.log('\n🎯 Overall Status:');
console.log('==================');
if (allValid) {
  console.log('✅ Environment setup is complete!');
  console.log('🚀 You can now create RT PIC users');
  console.log('\nNext steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Login as admin: admin@example.com');
  console.log('3. Go to Admin → Users');
  console.log('4. Create your first RT PIC user');
} else {
  console.log('❌ Environment setup incomplete');
  console.log('\n📖 Please check ENVIRONMENT_SETUP.md for detailed instructions');
  console.log('🔧 Fix the issues above and run this script again');
}

console.log('\n' + '='.repeat(50));
console.log('Environment validation complete');
process.exit(allValid ? 0 : 1);