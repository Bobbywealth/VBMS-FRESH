const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // Adjust path

const MONGO_URI = 'your-mongo-uri-here';

mongoose.connect(MONGO_URI)
  .then(async () => {
    const hash = await bcrypt.hash('Xrprich12$', 10);
    // Create main admin (founder) account
    await User.create({
      name: 'Bobby Admin',
      email: 'BobbyAdmin@vbms.com',
      password: hash,
      role: 'main_admin',
      status: 'Active',
      position: 'Founder',
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
    console.log('Admin created!');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
