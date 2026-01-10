const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const FaceRegistrationRequest = require('../models/FaceRegistrationRequest');
const jwt = require('jsonwebtoken');
// NOTE: Server-side face recognition disabled due to TensorFlow version conflicts
// const faceRecognitionService = require('../utils/faceRecognitionService');

// Middleware to verify admin authentication
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Middleware to verify admin with write protection
const verifyAdminWithWriteProtection = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Helper function to calculate Euclidean distance between two face descriptors
function euclideanDistance(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
        throw new Error('Descriptors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
    }
    return Math.sqrt(sum);
}

// Configuration for face matching
const FACE_CONFIG = {
    // Threshold levels - lower is more strict
    STRICT_THRESHOLD: 0.4,      // Very strict - same lighting, angle
    NORMAL_THRESHOLD: 0.5,      // Normal - allows minor variations
    LENIENT_THRESHOLD: 0.6,     // Lenient - allows glasses, expressions

    // Use normal threshold by default for good security/usability balance
    MATCH_THRESHOLD: 0.5,

    // Maximum descriptors to store per admin
    MAX_DESCRIPTORS: 5
};

// Helper function to find matching admin by face descriptor
// Supports multiple stored descriptors per admin for better recognition
async function findMatchingAdmin(faceDescriptor) {
    // Get all admins with face recognition enabled
    const admins = await Admin.find({
        'faceRecognition.enabled': true,
        $or: [
            { 'faceRecognition.descriptor': { $exists: true, $ne: null } },
            { 'faceRecognition.additionalDescriptors': { $exists: true, $not: { $size: 0 } } }
        ]
    });

    let bestMatch = null;
    let bestDistance = Infinity;
    let matchedDescriptorIndex = -1;

    console.log(`\n🔍 Attempting face match against ${admins.length} registered admin(s)...`);

    for (const admin of admins) {
        // Check primary descriptor
        if (admin.faceRecognition.descriptor && admin.faceRecognition.descriptor.length > 0) {
            try {
                const distance = euclideanDistance(faceDescriptor, admin.faceRecognition.descriptor);
                console.log(`  📊 ${admin.email} (primary): distance = ${distance.toFixed(4)}`);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    if (distance < FACE_CONFIG.MATCH_THRESHOLD) {
                        bestMatch = admin;
                        matchedDescriptorIndex = 0;
                    }
                }
            } catch (err) {
                console.error(`  ⚠️ Error comparing with ${admin.email}:`, err.message);
            }
        }

        // Check additional descriptors (for glasses, different angles, etc.)
        if (admin.faceRecognition.additionalDescriptors && Array.isArray(admin.faceRecognition.additionalDescriptors)) {
            for (let i = 0; i < admin.faceRecognition.additionalDescriptors.length; i++) {
                const additionalDesc = admin.faceRecognition.additionalDescriptors[i];
                if (additionalDesc && additionalDesc.length > 0) {
                    try {
                        const distance = euclideanDistance(faceDescriptor, additionalDesc);
                        console.log(`  📊 ${admin.email} (variant ${i + 1}): distance = ${distance.toFixed(4)}`);

                        if (distance < bestDistance) {
                            bestDistance = distance;
                            if (distance < FACE_CONFIG.MATCH_THRESHOLD) {
                                bestMatch = admin;
                                matchedDescriptorIndex = i + 1;
                            }
                        }
                    } catch (err) {
                        console.error(`  ⚠️ Error comparing variant ${i + 1} with ${admin.email}:`, err.message);
                    }
                }
            }
        }
    }

    // Log result
    if (bestMatch) {
        console.log(`✅ Match found: ${bestMatch.email} (descriptor #${matchedDescriptorIndex}, distance: ${bestDistance.toFixed(4)})`);
    } else {
        console.log(`❌ No match found. Best distance was: ${bestDistance.toFixed(4)} (threshold: ${FACE_CONFIG.MATCH_THRESHOLD})`);
    }

    return {
        admin: bestMatch,
        distance: bestDistance,
        confidence: bestMatch ? Math.round((1 - bestDistance / FACE_CONFIG.MATCH_THRESHOLD) * 100) : 0,
        matchedDescriptorIndex
    };
}

// ========== PUBLIC ROUTES ==========

/**
 * POST /api/admin/auth/face-login
 * Login using face recognition
 */
router.post('/auth/face-login', async (req, res) => {
    try {
        const { faceDescriptor } = req.body;

        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
            return res.status(400).json({ message: 'Invalid face descriptor' });
        }

        // Find matching admin
        const { admin, distance, confidence, matchedDescriptorIndex } = await findMatchingAdmin(faceDescriptor);

        if (!admin) {
            console.log('❌ No matching face found - login rejected');
            return res.status(401).json({
                message: 'Face not recognized. Please try again or use password login.',
                hint: 'Make sure you are in good lighting and looking directly at the camera.'
            });
        }

        // Check if admin is active
        if (!admin.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        // Update last used timestamp
        admin.faceRecognition.lastUsed = new Date();
        await admin.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ Face login successful for ${admin.email} (confidence: ${confidence}%)`);

        res.json({
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                profilePicture: admin.profilePicture
            },
            confidence,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Face login error:', error);
        res.status(500).json({ message: 'Server error during face recognition' });
    }
});

/**
 * POST /api/admin/face-recognition/auth/face-login-image
 * NOTE: Server-side face processing is disabled due to TensorFlow version conflicts
 * Use the client-side /auth/face-login endpoint instead
 */
router.post('/auth/face-login-image', async (req, res) => {
    return res.status(503).json({
        message: 'Server-side face processing is temporarily unavailable. Please use client-side face login.',
        useClientSide: true,
        hint: 'Your browser will process the face recognition locally.'
    });
});

/**
 * POST /api/admin/face-recognition/register-image
 * NOTE: Server-side face processing is disabled due to TensorFlow version conflicts
 * Use the client-side registration flow instead
 */
router.post('/register-image', verifyAdmin, async (req, res) => {
    return res.status(503).json({
        message: 'Server-side face registration is temporarily unavailable. Please use the standard registration flow.',
        useClientSide: true
    });
});

// ========== AUTHENTICATED ROUTES ==========

/**
 * GET /api/admin/face-recognition/status
 * Get current user's face recognition status
 */
router.get('/status', verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('faceRecognition');

        res.json({
            enabled: admin.faceRecognition.enabled,
            requestStatus: admin.faceRecognition.requestStatus,
            registeredAt: admin.faceRecognition.registeredAt,
            lastUsed: admin.faceRecognition.lastUsed,
            rejectionReason: admin.faceRecognition.rejectionReason
        });
    } catch (error) {
        console.error('Error fetching face recognition status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/face-recognition/request
 * Submit face registration request
 */
router.post('/request', verifyAdmin, async (req, res) => {
    try {
        const { faceDescriptor, faceImage } = req.body;

        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
            return res.status(400).json({ message: 'Invalid face descriptor' });
        }

        const admin = await Admin.findById(req.admin.id);

        // Check if already has face recognition enabled
        if (admin.faceRecognition.enabled) {
            return res.status(400).json({ message: 'Face recognition already enabled' });
        }

        // Check if already has pending request
        if (admin.faceRecognition.requestStatus === 'pending') {
            return res.status(400).json({ message: 'You already have a pending request' });
        }

        // Create registration request
        const request = new FaceRegistrationRequest({
            adminId: admin._id,
            adminName: admin.username,
            adminEmail: admin.email,
            adminRole: admin.role,
            faceDescriptor,
            faceImage
        });

        await request.save();

        // Update admin's request status
        admin.faceRecognition.requestStatus = 'pending';
        admin.faceRecognition.requestedAt = new Date();
        await admin.save();

        res.json({ message: 'Face registration request submitted successfully' });

    } catch (error) {
        console.error('Error submitting face registration request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== SUPER ADMIN ROUTES ==========

/**
 * GET /api/admin/face-recognition/requests
 * Get all pending face registration requests (super admin only)
 */
router.get('/requests', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }

        const requests = await FaceRegistrationRequest.find({ status: 'pending' })
            .sort({ requestedAt: -1 });

        res.json(requests);

    } catch (error) {
        console.error('Error fetching face registration requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/face-recognition/approve/:requestId
 * Approve a face registration request (super admin only)
 */
router.post('/approve/:requestId', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }

        const request = await FaceRegistrationRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        // Update admin's face recognition
        const admin = await Admin.findById(request.adminId);
        admin.faceRecognition.enabled = true;
        admin.faceRecognition.descriptor = request.faceDescriptor;
        admin.faceRecognition.registeredAt = new Date();
        admin.faceRecognition.approvedBy = req.admin.id;
        admin.faceRecognition.approvedAt = new Date();
        admin.faceRecognition.requestStatus = 'approved';
        await admin.save();

        // Update request status
        request.status = 'approved';
        request.reviewedBy = req.admin.id;
        request.reviewedAt = new Date();
        await request.save();

        res.json({ message: 'Face registration approved successfully' });

    } catch (error) {
        console.error('Error approving face registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/face-recognition/reject/:requestId
 * Reject a face registration request (super admin only)
 */
router.post('/reject/:requestId', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }

        const { reason } = req.body;
        const request = await FaceRegistrationRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        // Update admin's request status
        const admin = await Admin.findById(request.adminId);
        admin.faceRecognition.requestStatus = 'rejected';
        admin.faceRecognition.rejectionReason = reason || 'No reason provided';
        await admin.save();

        // Update request status
        request.status = 'rejected';
        request.reviewedBy = req.admin.id;
        request.reviewedAt = new Date();
        request.rejectionReason = reason;
        await request.save();

        res.json({ message: 'Face registration rejected' });

    } catch (error) {
        console.error('Error rejecting face registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/face-recognition/registered
 * Get all admins with face recognition enabled (super admin only)
 */
router.get('/registered', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }

        const admins = await Admin.find({ 'faceRecognition.enabled': true })
            .select('username email role profilePicture faceRecognition.registeredAt faceRecognition.lastUsed faceRecognition.approvedBy')
            .populate('faceRecognition.approvedBy', 'username')
            .sort({ 'faceRecognition.registeredAt': -1 });

        res.json(admins);

    } catch (error) {
        console.error('Error fetching registered faces:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * DELETE /api/admin/face-recognition/delete-my-face
 * Admin can delete their own face data instantly (no approval needed)
 * IMPORTANT: This route must be BEFORE /:adminId to prevent parameter matching
 */
router.delete('/delete-my-face', verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Clear all face recognition data
        admin.faceRecognition = {
            enabled: false,
            faceDescriptor: null,
            descriptor: null,
            additionalDescriptors: [],
            registeredAt: null,
            approvedBy: null,
            approvedAt: null,
            lastUsed: null,
            requestStatus: 'none',
            requestedAt: null,
            rejectionReason: null
        };

        await admin.save();

        // Also delete any pending face registration requests for this admin
        await FaceRegistrationRequest.deleteMany({ adminId: admin._id });

        console.log(`🗑️ Admin ${admin.email} deleted their face recognition data`);

        res.json({
            success: true,
            message: 'Face recognition data deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting face data:', error);
        res.status(500).json({ message: 'Failed to delete face data' });
    }
});

/**
 * DELETE /api/admin/face-recognition/:adminId
 * Delete an admin's face data (super admin only)
 */
router.delete('/:adminId', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }

        const admin = await Admin.findById(req.params.adminId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Reset face recognition data
        admin.faceRecognition = {
            enabled: false,
            descriptor: null,
            registeredAt: null,
            approvedBy: null,
            approvedAt: null,
            lastUsed: null,
            requestStatus: 'none',
            requestedAt: null,
            rejectionReason: null
        };

        await admin.save();

        res.json({ message: 'Face data deleted successfully' });

    } catch (error) {
        console.error('Error deleting face data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/face-recognition/update/:adminId
 * Update an admin's face data (super admin only)
 */
router.post('/update/:adminId', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }

        const { faceDescriptor } = req.body;

        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
            return res.status(400).json({ message: 'Invalid face descriptor' });
        }

        const admin = await Admin.findById(req.params.adminId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Update face descriptor
        admin.faceRecognition.descriptor = faceDescriptor;
        admin.faceRecognition.enabled = true;
        admin.faceRecognition.registeredAt = new Date();
        admin.faceRecognition.approvedBy = req.admin.id;
        admin.faceRecognition.approvedAt = new Date();
        admin.faceRecognition.requestStatus = 'approved';

        await admin.save();

        res.json({ message: 'Face data updated successfully' });

    } catch (error) {
        console.error('Error updating face data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/admin/face-recognition/add-variation/:adminId
 * Add an additional face variation (glasses, different lighting, etc.)
 * Super admin can add for any admin, admin can add for themselves
 */
router.post('/add-variation/:adminId', verifyAdmin, async (req, res) => {
    try {
        const { faceDescriptor } = req.body;
        const targetAdminId = req.params.adminId;

        // Check permissions
        if (req.admin.role !== 'super_admin' && req.admin.id !== targetAdminId) {
            return res.status(403).json({ message: 'Access denied. You can only add variations for yourself.' });
        }

        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
            return res.status(400).json({ message: 'Invalid face descriptor' });
        }

        const admin = await Admin.findById(targetAdminId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (!admin.faceRecognition.enabled) {
            return res.status(400).json({ message: 'Face recognition is not enabled for this admin. Please register first.' });
        }

        // Initialize additionalDescriptors array if not exists
        if (!admin.faceRecognition.additionalDescriptors) {
            admin.faceRecognition.additionalDescriptors = [];
        }

        // Check if max variations reached
        if (admin.faceRecognition.additionalDescriptors.length >= FACE_CONFIG.MAX_DESCRIPTORS) {
            return res.status(400).json({
                message: `Maximum ${FACE_CONFIG.MAX_DESCRIPTORS} face variations allowed. Please remove one first.`
            });
        }

        // Add the new descriptor
        admin.faceRecognition.additionalDescriptors.push(faceDescriptor);
        await admin.save();

        const variationCount = admin.faceRecognition.additionalDescriptors.length + 1; // +1 for primary

        console.log(`✅ Added face variation #${variationCount} for ${admin.email}`);

        res.json({
            message: 'Face variation added successfully',
            totalVariations: variationCount,
            maxVariations: FACE_CONFIG.MAX_DESCRIPTORS + 1
        });

    } catch (error) {
        console.error('Error adding face variation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * DELETE /api/admin/face-recognition/remove-variation/:adminId/:index
 * Remove a specific face variation by index
 */
router.delete('/remove-variation/:adminId/:index', verifyAdmin, async (req, res) => {
    try {
        const targetAdminId = req.params.adminId;
        const variationIndex = parseInt(req.params.index);

        // Check permissions
        if (req.admin.role !== 'super_admin' && req.admin.id !== targetAdminId) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const admin = await Admin.findById(targetAdminId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (!admin.faceRecognition.additionalDescriptors ||
            variationIndex < 0 ||
            variationIndex >= admin.faceRecognition.additionalDescriptors.length) {
            return res.status(400).json({ message: 'Invalid variation index' });
        }

        // Remove the variation
        admin.faceRecognition.additionalDescriptors.splice(variationIndex, 1);
        await admin.save();

        console.log(`🗑️ Removed face variation #${variationIndex + 1} for ${admin.email}`);

        res.json({
            message: 'Face variation removed successfully',
            remainingVariations: admin.faceRecognition.additionalDescriptors.length + 1
        });

    } catch (error) {
        console.error('Error removing face variation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/face-recognition/my-variations
 * Get current admin's face variations count
 */
router.get('/my-variations', verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('faceRecognition');

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const additionalCount = admin.faceRecognition.additionalDescriptors?.length || 0;

        res.json({
            enabled: admin.faceRecognition.enabled,
            totalVariations: admin.faceRecognition.enabled ? additionalCount + 1 : 0,
            maxVariations: FACE_CONFIG.MAX_DESCRIPTORS + 1,
            canAddMore: admin.faceRecognition.enabled && additionalCount < FACE_CONFIG.MAX_DESCRIPTORS
        });

    } catch (error) {
        console.error('Error fetching face variations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/face-recognition/pending-count
 * Get count of pending face registration requests (for notification badge)
 */
router.get('/pending-count', verifyAdmin, async (req, res) => {
    try {
        // Only super admin should see accurate count
        if (req.admin.role !== 'super_admin') {
            return res.json({ count: 0 });
        }

        const count = await FaceRegistrationRequest.countDocuments({ status: 'pending' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
