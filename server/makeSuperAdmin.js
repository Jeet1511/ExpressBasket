// Run this in your MongoDB or via Node.js to make an admin a super admin

const mongoose = require('mongoose');
const Admin = require('./models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Replace 'admin@example.com' with your admin email
    const admin = await Admin.findOne({ email: 'admin@example.com' });

    if (admin) {
        admin.role = 'superadmin';
        await admin.save();
        console.log('Admin upgraded to super admin:', admin.email);
    } else {
        console.log('Admin not found');
    }

    process.exit();
});
