// Admin Seed Script - Creates Super Admin user with all access
// Run with: node seedAdmin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Admin Schema (inline to avoid path issues)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin', 'vendor'], default: 'vendor' },
    permissions: [{ type: String }],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

// Connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/basket';

async function seedAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@expressdelivery.com' });

        if (existingAdmin) {
            // Update existing admin's role to super_admin
            existingAdmin.role = 'super_admin';
            await existingAdmin.save();
            console.log('⚠️  Admin user updated to Super Admin role!');
            console.log('\n📋 Login Credentials:');
            console.log('   Email: admin@expressdelivery.com');
            console.log('   Password: Admin@123');
            console.log('   Role: Super Admin (Full Access)');
            await mongoose.connection.close();
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@123', salt);

        // Create new admin
        const newAdmin = new Admin({
            username: 'SuperAdmin',
            email: 'admin@expressdelivery.com',
            password: hashedPassword,
            role: 'super_admin',
            permissions: [
                'manage_products',
                'manage_categories',
                'manage_admins',
                'manage_admins_passwords',
                'manage_admins_roles',
                'view_reports'
            ],
            tags: ['full-access', 'system-admin'],
            isActive: true
        });

        await newAdmin.save();

        console.log('\n🎉 Super Admin user created successfully!');
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║       ADMIN LOGIN CREDENTIALS             ║');
        console.log('╠═══════════════════════════════════════════╣');
        console.log('║  Email:    admin@expressdelivery.com      ║');
        console.log('║  Password: Admin@123                      ║');
        console.log('║  Role:     Super Admin (Full Access)      ║');
        console.log('╚═══════════════════════════════════════════╝');
        console.log('\n🚀 You can now login at: http://localhost:5173/admin');

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
}

seedAdmin();
