// Test password reset email specifically
require('dotenv').config();
const { sendPasswordResetEmail } = require('./config/emailConfig.js');

const testEmail = process.env.TEST_EMAIL || 'fantamking12341234@gmail.com';
const testToken = 'test-reset-token-' + Date.now();
const testUserName = 'Test User';

console.log('🔐 Testing Password Reset Email...\n');
console.log('Sending to:', testEmail);
console.log('Token:', testToken);
console.log('User:', testUserName);
console.log('');

sendPasswordResetEmail(testEmail, testToken, testUserName)
    .then(result => {
        if (result.success) {
            console.log('✅ Password reset email sent successfully!');
            console.log('Message ID:', result.messageId);
            console.log('');
            console.log('🎉 Check your inbox at:', testEmail);
            process.exit(0);
        } else {
            console.error('❌ Failed to send password reset email');
            console.error('Error:', result.error);
            console.error('Details:', result.details);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
