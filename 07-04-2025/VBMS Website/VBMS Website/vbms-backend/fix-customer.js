const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(' Connected to MongoDB');
  })
  .catch((err) => {
    console.error(' MongoDB connection error:', err);
    process.exit(1);
  });

async function fixCustomerUser() {
  try {
    console.log(' Looking for existing customer...');
    
    // Find and delete existing customer
    const existingCustomer = await User.findOne({ email: 'customer@test.com' });
    
    if (existingCustomer) {
      console.log('  Deleting existing customer with double-hashed password...');
      await User.deleteOne({ email: 'customer@test.com' });
      console.log(' Old customer deleted');
    } else {
      console.log('ℹ  No existing customer found');
    }

    console.log('\n Creating fresh customer with correct password hashing...');
    
    // Create new customer with correct password hashing
    const customer = new User({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'password123', // Will be hashed correctly by the model
      role: 'Client',
      position: 'Member',
      status: 'Active',
      business: 'Test Business'
    });

    await customer.save();
    console.log(' New customer created successfully!');
    console.log('   Email:', customer.email);
    console.log('   Role:', customer.role);
    console.log('   Password: password123');
    
    // Test the password immediately
    console.log('\n Testing new password...');
    const isPasswordValid = await customer.comparePassword('password123');
    console.log('   Password test (password123):', isPasswordValid ? ' Valid' : ' Invalid');
    
    if (isPasswordValid) {
      console.log('\n SUCCESS! Customer login should now work!');
      console.log('\n Test these credentials:');
      console.log('   Email: customer@test.com');
      console.log('   Password: password123');
      console.log('   Expected redirect: customer-dashboard.html');
    } else {
      console.log('\n ERROR: Password still not working!');
    }
    
    return customer;
  } catch (error) {
    console.error(' Error fixing customer:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log(' Starting customer fix...\n');
    
    await fixCustomerUser();
    
  } catch (error) {
    console.error(' Fix failed:', error.message);
  } finally {
    mongoose.disconnect();
    console.log('\n Disconnected from MongoDB');
  }
}


main(); 