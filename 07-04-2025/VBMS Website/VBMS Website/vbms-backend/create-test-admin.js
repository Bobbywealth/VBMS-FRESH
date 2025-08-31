require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createTestAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create main admin user
    const mainAdmin = new User({
      name: 'VBMS Main Admin',
      email: 'admin@vbmstest.com',
      password: 'admin123',
      role: 'main_admin',
      status: 'active',
      adminPermissions: {
        canCreateAdmins: true,
        canManageCustomers: true,
        canViewAllData: true,
        canSetPricing: true,
        canToggleFeatures: true,
        canManageStaff: true,
        canAccessBilling: true,
        canViewAnalytics: true,
        canSystemSettings: true
      }
    });

    await mainAdmin.save();
    console.log('Main Admin created:', mainAdmin.email);

    // Create regular admin user
    const admin = new User({
      name: 'VBMS Admin',
      email: 'admin2@vbmstest.com',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      adminPermissions: {
        canCreateAdmins: false,
        canManageCustomers: true,
        canViewAllData: true,
        canSetPricing: false,
        canToggleFeatures: false,
        canManageStaff: false,
        canAccessBilling: true,
        canViewAnalytics: true,
        canSystemSettings: false
      }
    });

    await admin.save();
    console.log('Admin created:', admin.email);

    console.log('\nTest admin accounts created successfully!');
    console.log('Main Admin: admin@vbmstest.com / admin123');
    console.log('Admin: admin2@vbmstest.com / admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test admin:', error);
    process.exit(1);
  }
}

createTestAdmin();