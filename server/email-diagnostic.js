// Comprehensive email diagnostic
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 Email Diagnostic Report\n');
console.log('='.repeat(50));

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER);
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set (***' + process.env.EMAIL_PASSWORD.slice(-4) + ')' : '❌ Not set');
console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('   TEST_EMAIL:', process.env.TEST_EMAIL);
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL);

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true, // Enable debug output
    logger: true  // Log to console
});

console.log('\n2. Testing Connection...');
transporter.verify((error, success) => {
    if (error) {
        console.log('   ❌ Connection failed:', error.message);
        process.exit(1);
    } else {
        console.log('   ✅ Connection successful');

        // Send test email
        console.log('\n3. Sending Test Email...');
        const testEmail = process.env.TEST_EMAIL || 'fantamking12341234@gmail.com';

        const mailOptions = {
            from: `"Express Basket" <${process.env.EMAIL_USER}>`,
            to: testEmail,
            subject: '🔐 Password Reset Test - ' + new Date().toLocaleTimeString(),
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">Password Reset Test</h2>
                    <p>This is a test email sent at: <strong>${new Date().toLocaleString()}</strong></p>
                    <p>If you receive this, the email system is working!</p>
                    <a href="https://expressbasket.vercel.app/reset-password/test-token-${Date.now()}" 
                       style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">
                        Test Reset Link
                    </a>
                </div>
            `,
            text: `Password Reset Test\n\nThis is a test email sent at: ${new Date().toLocaleString()}\n\nIf you receive this, the email system is working!`
        };

        console.log('   To:', testEmail);
        console.log('   From:', mailOptions.from);
        console.log('   Subject:', mailOptions.subject);

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log('\n   ❌ Send failed:', err.message);
                console.log('   Error code:', err.code);
                console.log('   Error response:', err.response);
                process.exit(1);
            } else {
                console.log('\n   ✅ Email sent successfully!');
                console.log('   Message ID:', info.messageId);
                console.log('   Response:', info.response);
                console.log('   Accepted:', info.accepted);
                console.log('   Rejected:', info.rejected);
                console.log('\n' + '='.repeat(50));
                console.log('🎉 CHECK YOUR EMAIL NOW!');
                console.log('Email:', testEmail);
                console.log('Subject:', mailOptions.subject);
                console.log('⚠️  Check spam/junk folder if not in inbox');
                console.log('='.repeat(50));
                process.exit(0);
            }
        });
    }
});
