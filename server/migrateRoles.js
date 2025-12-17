// Migration Script - Updates existing admin roles to new naming convention
// Run with: node migrateRoles.js
// Old: god → New: super_admin
// Old: super_admin → New: admin  
// Old: admin → New: vendor

const mongoose = require('mongoose');
require('dotenv').config();

// Connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/basket';

async function migrateRoles() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const adminsCollection = db.collection('admins');

        // Get all admins
        const admins = await adminsCollection.find({}).toArray();
        console.log(`\n📋 Found ${admins.length} admins to check\n`);

        let updated = 0;

        for (const admin of admins) {
            let newRole = admin.role;

            // Map old roles to new roles
            if (admin.role === 'god') {
                newRole = 'super_admin';
            } else if (admin.role === 'super_admin') {
                newRole = 'admin';
            } else if (admin.role === 'admin') {
                newRole = 'vendor';
            }

            if (newRole !== admin.role) {
                await adminsCollection.updateOne(
                    { _id: admin._id },
                    { $set: { role: newRole } }
                );
                console.log(`✔ Updated "${admin.username}" (${admin.email}): ${admin.role} → ${newRole}`);
                updated++;
            } else {
                console.log(`- Skipped "${admin.username}" (${admin.email}): already has role "${admin.role}"`);
            }
        }

        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║       MIGRATION COMPLETE                   ║');
        console.log('╠═══════════════════════════════════════════╣');
        console.log(`║  Total admins: ${admins.length.toString().padEnd(26)}║`);
        console.log(`║  Updated:      ${updated.toString().padEnd(26)}║`);
        console.log('╠═══════════════════════════════════════════╣');
        console.log('║  Role Mapping:                             ║');
        console.log('║    god         → super_admin (highest)     ║');
        console.log('║    super_admin → admin                     ║');
        console.log('║    admin       → vendor (lowest)           ║');
        console.log('╚═══════════════════════════════════════════╝');

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error migrating roles:', error.message);
        process.exit(1);
    }
}

migrateRoles();
