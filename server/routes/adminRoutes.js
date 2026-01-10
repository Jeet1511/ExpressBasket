const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin.js');
const Product = require('../models/Product.js');
const Category = require('../models/Category.js');
const User = require('../models/User.js');
const Order = require('../models/Order.js');
const Contribution = require('../models/Contribution.js');
const SupportChat = require('../models/SupportChat.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('🔥🔥🔥 ADMIN ROUTES FILE LOADED - NEW VERSION 🔥🔥🔥');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage with error handling
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        console.log('Uploading file to Cloudinary:', file.originalname);
        return {
            folder: 'basket-categories',
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
            transformation: [{ width: 500, height: 500, crop: 'limit' }],
            public_id: `category_${Date.now()}`
        };
    }
});

const upload = multer({
    storage,
    // Raise multer limit to a large value; Render may still enforce request limits.
    // Set to 200MB here to allow big uploads if they go through server-side.
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Verify super admin (highest level)
const verifySuperAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (verified.role !== 'super_admin') return res.status(403).json({ message: 'Super Admin access required' });
        req.admin = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Verify admin
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

// Block viewers from write operations (POST, PUT, DELETE)
// Viewers can only view (GET requests)
const blockViewers = (req, res, next) => {
    const viewerRoles = ['normal_viewer', 'special_viewer'];

    if (viewerRoles.includes(req.admin?.role)) {
        // Only allow GET requests for viewers
        if (req.method !== 'GET') {
            return res.status(403).json({
                message: 'Viewers do not have permission to modify data. You can only view content.',
                role: req.admin.role
            });
        }
    }
    next();
};

// Combined middleware: verify admin + block viewers for write operations
const verifyAdminWithWriteProtection = [verifyAdmin, blockViewers];

// Check if admin is a viewer role
const isViewerRole = (role) => {
    return role === 'normal_viewer' || role === 'special_viewer';
};

// Mask sensitive data (email, phone) for viewers
// Keeps names visible, hides contact info
const maskEmail = (email) => {
    if (!email) return '***@***.com';
    const [local, domain] = email.split('@');
    if (!domain) return '***@***.com';
    const maskedLocal = local.charAt(0) + '***';
    const domainParts = domain.split('.');
    const maskedDomain = '***.' + (domainParts[domainParts.length - 1] || 'com');
    return maskedLocal + '@' + maskedDomain;
};

const maskPhone = (phone) => {
    if (!phone) return '**********';
    const str = String(phone);
    if (str.length <= 4) return '****';
    return '******' + str.slice(-4);
};

// Apply masking to user/admin data based on requester's role
const maskSensitiveData = (data, requestingAdminRole) => {
    if (!isViewerRole(requestingAdminRole)) return data;

    // Handle array of users/admins
    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item, requestingAdminRole));
    }

    // Handle single object
    if (data && typeof data === 'object') {
        const masked = { ...data };
        if (data._doc) {
            // Mongoose document
            const obj = { ...data._doc };
            if (obj.email) obj.email = maskEmail(obj.email);
            if (obj.phone) obj.phone = maskPhone(obj.phone);
            return obj;
        }
        if (masked.email) masked.email = maskEmail(masked.email);
        if (masked.phone) masked.phone = maskPhone(masked.phone);
        return masked;
    }

    return data;
};

// Setup first admin
router.post('/setup', async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount > 0) {
            return res.status(400).json({ message: 'Admin already exists. Use /api/admin/register to add more admins.' });
        }

        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        const admin = new Admin({
            username,
            email,
            password,
            role: 'super_admin',
            permissions: ['manage_products', 'manage_categories', 'manage_admins', 'view_reports', 'manage_admins_passwords', 'manage_admins_roles'],
            tags: []
        });

        await admin.save();
        res.json({ message: 'First admin created successfully', email: admin.email, username: admin.username });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update admin
router.put('/admins/:id', verifySuperAdmin, async (req, res) => {
    try {
        const { username, email, role, permissions, isActive, tags } = req.body;
        const currentAdminRole = req.admin.role;
        const updateData = {};

        // Define role hierarchy levels
        const roleLevels = {
            'vendor': 1,
            'admin': 2,
            'super_admin': 3
        };

        if (username) updateData.username = username;
        if (email) updateData.email = email;

        if (role) {
            const currentLevel = roleLevels[currentAdminRole] || 0;
            const requestedLevel = roleLevels[role] || 0;

            // Check if current admin can assign the requested role
            if (requestedLevel > currentLevel) {
                return res.status(403).json({
                    message: `You cannot assign role '${role}'. Your maximum allowed role is '${currentAdminRole}'.`
                });
            }
            updateData.role = role;
        }

        if (permissions) updateData.permissions = permissions;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (tags) updateData.tags = tags;

        const admin = await Admin.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        res.json({
            message: 'Admin updated successfully',
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                isActive: admin.isActive,
                tags: admin.tags
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Change admin password
router.put('/admins/:id/password', verifySuperAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ message: 'New password is required' });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        admin.password = newPassword; // Will be hashed by pre-save hook
        await admin.save();

        res.json({ message: 'Admin password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete admin
router.delete('/admins/:id', verifySuperAdmin, async (req, res) => {
    try {
        const admin = await Admin.findByIdAndDelete(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all admins
router.get('/admins', verifyAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({}, '-password');
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register new admin
router.post('/register', verifySuperAdmin, async (req, res) => {
    try {
        const { username, email, password, role, permissions, tags } = req.body;
        const currentAdminRole = req.admin.role;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Define role hierarchy levels
        const roleLevels = {
            'admin': 1,
            'super_admin': 2,
            'god': 3
        };

        const requestedRole = role || 'admin';
        const currentLevel = roleLevels[currentAdminRole] || 0;
        const requestedLevel = roleLevels[requestedRole] || 0;

        // Check if current admin can create the requested role
        if (requestedLevel > currentLevel) {
            return res.status(403).json({
                message: `You cannot create an admin with role '${requestedRole}'. Your maximum allowed role is '${currentAdminRole}'.`
            });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        const admin = new Admin({
            username,
            email,
            password,
            role: requestedRole,
            permissions: permissions || ['manage_products', 'manage_categories'],
            tags: tags || []
        });

        await admin.save();

        res.status(201).json({
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                tags: admin.tags
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt for email:', email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ email });
        console.log('Admin found:', !!admin);
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        let isValidPassword = false;
        try {
            isValidPassword = await admin.comparePassword(password);
            console.log('Password valid via bcrypt:', isValidPassword);
        } catch (error) {
            // Fallback for plain text passwords (for migration)
            isValidPassword = password === admin.password;
            console.log('Password valid via plain text fallback:', isValidPassword);
        }

        if (!isValidPassword) {
            console.log('Invalid password for admin:', admin.email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({
            id: admin._id,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Log login contribution
        await Contribution.log(admin._id, 'login', `${admin.username} logged in`);

        res.json({
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                tags: admin.tags,
                profilePicture: admin.profilePicture
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Temporary route to reset admin password (remove after use)
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and newPassword required' });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        admin.password = newPassword; // Will be hashed by pre-save
        await admin.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Provide Cloudinary signature for client-side direct uploads
router.get('/sign', verifyAdmin, (req, res) => {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = req.query.folder || 'basket-products'; // default folder
        const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);
        res.json({
            signature,
            timestamp,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            folder
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add product
router.post('/products', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        console.log('Product creation request received');
        console.log('Body:', JSON.stringify(req.body));
        console.log('File (if any):', req.file);

        const { name, description, price, originalPrice, category, stock, unit, discount, isFeatured, image } = req.body || {};

        // Basic validation with clear messages for the client
        const missing = [];
        if (!name) missing.push('name');
        if (!description) missing.push('description');
        if (price === undefined || price === null || price === '') missing.push('price');
        if (!category) missing.push('category');
        if (stock === undefined || stock === null || stock === '') missing.push('stock');
        if (!unit) missing.push('unit');
        if (!image && !req.file) missing.push('image');

        if (missing.length > 0) {
            return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
        }

        // Accept either an image URL provided by the client (direct Cloudinary upload)
        // or a server-side uploaded file (req.file.path)
        const imageUrl = req.file ? req.file.path : (image || '');

        const product = new Product({
            name,
            description,
            price: isNaN(parseFloat(price)) ? null : parseFloat(price),
            originalPrice: isNaN(parseFloat(originalPrice)) ? 0 : parseFloat(originalPrice),
            category,
            image: imageUrl,
            stock: isNaN(parseInt(stock)) ? 0 : parseInt(stock),
            unit,
            discount: isNaN(parseFloat(discount)) ? 0 : parseFloat(discount),
            isFeatured: (isFeatured === true || isFeatured === 'true')
        });

        console.log('Product object before save:', product);

        await product.save();
        await product.populate('category');

        // Log contribution
        await Contribution.log(req.admin.id, 'product_added', `Added product: ${product.name}`, { productId: product._id });

        // Broadcast to all connected clients
        const { broadcastProductUpdate } = require('../socketHandler.js');
        broadcastProductUpdate('created', product);

        console.log('Product saved successfully:', product._id);
        res.status(201).json(product);
    } catch (error) {
        console.error('Error saving product:', error);

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 200MB.' });
        }
        if (error.name === 'MulterError') {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: error.message });
    }
});

// Update product
router.put('/products/:id', verifyAdminWithWriteProtection, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, originalPrice, category, stock, unit, discount, isFeatured } = req.body;

        const updateData = {
            name,
            description,
            price: parseFloat(price),
            originalPrice: parseFloat(originalPrice),
            category,
            stock: parseInt(stock),
            unit,
            discount: parseFloat(discount) || 0,
            isFeatured: isFeatured === 'true'
        };

        if (req.file) {
            updateData.image = req.file.path; // Cloudinary URL
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'product_updated', `Updated product: ${product.name}`, { productId: product._id });

        // Broadcast to all connected clients
        const { broadcastProductUpdate } = require('../socketHandler.js');
        broadcastProductUpdate('updated', product);

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete product
router.delete('/products/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'product_deleted', `Deleted product: ${product.name}`, { productId: product._id });

        // Broadcast to all connected clients
        const { broadcastProductUpdate } = require('../socketHandler.js');
        broadcastProductUpdate('deleted', { _id: product._id, name: product.name });

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all products
router.get('/products', verifyAdmin, async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add category
router.post('/categories', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const { name, description, image } = req.body;

        console.log('Creating category:', name);
        console.log('File uploaded (if any):', req.file);

        const imageUrl = req.file ? req.file.path : (image || '');

        const category = new Category({
            name,
            description,
            image: imageUrl // Cloudinary URL expected
        });

        await category.save();

        // Log contribution
        await Contribution.log(req.admin.id, 'category_added', `Added category: ${category.name}`, { categoryId: category._id });

        // Broadcast to all connected clients
        const { broadcastCategoryUpdate } = require('../socketHandler.js');
        broadcastCategoryUpdate('created', category);

        console.log('Category saved successfully:', category._id);
        res.status(201).json(category);
    } catch (error) {
        console.error('Error saving category:', error);

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 200MB.' });
        }
        if (error.name === 'MulterError') {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: error.message });
    }
});

// Get all categories for admin (includes inactive)
router.get('/categories', verifyAdmin, async (req, res) => {
    try {
        const categories = await Category.find().sort({ isActive: -1, name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update category
router.put('/categories/:id', verifyAdminWithWriteProtection, upload.single('image'), async (req, res) => {
    try {
        const { name, description, image, isActive } = req.body;

        console.log('Category update request:', {
            categoryId: req.params.id,
            body: req.body,
            isActive: isActive,
            typeOfIsActive: typeof isActive
        });

        const updateData = {};

        // Only update fields that are provided
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        // Handle isActive - parse properly as boolean
        if (isActive !== undefined) {
            // Handle string "true"/"false" or actual boolean
            updateData.isActive = isActive === true || isActive === 'true';
            console.log('Setting isActive to:', updateData.isActive);
        }

        // Handle image update - either from file upload or direct URL
        if (req.file) {
            console.log('Updating category image from file upload:', req.file.path);
            updateData.image = req.file.path; // Cloudinary URL from multer
        } else if (image && image.trim() !== '') {
            // Image URL provided directly (from client-side Cloudinary upload)
            console.log('Updating category image from URL:', image);
            updateData.image = image;
        }

        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'category_updated', `Updated category: ${category.name}`, { categoryId: category._id });

        // Broadcast to all connected clients
        const { broadcastCategoryUpdate } = require('../socketHandler.js');
        broadcastCategoryUpdate('updated', category);

        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: error.message });
    }
});

// Transfer all products from one category to another
router.post('/categories/:sourceId/transfer/:targetId', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const { sourceId, targetId } = req.params;

        // Validate both categories exist
        const sourceCategory = await Category.findById(sourceId);
        const targetCategory = await Category.findById(targetId);

        if (!sourceCategory) {
            return res.status(404).json({ message: 'Source category not found' });
        }
        if (!targetCategory) {
            return res.status(404).json({ message: 'Target category not found' });
        }

        if (sourceId === targetId) {
            return res.status(400).json({ message: 'Source and target categories cannot be the same' });
        }

        // Count products to transfer
        const productCount = await Product.countDocuments({ category: sourceId });

        if (productCount === 0) {
            return res.status(400).json({ message: 'No products to transfer in source category' });
        }

        // Transfer all products
        const result = await Product.updateMany(
            { category: sourceId },
            { $set: { category: targetId } }
        );

        // Log contribution
        await Contribution.log(
            req.admin.id,
            'products_transferred',
            `Transferred ${result.modifiedCount} products from "${sourceCategory.name}" to "${targetCategory.name}"`,
            { sourceId, targetId, count: result.modifiedCount }
        );

        res.json({
            message: `Successfully transferred ${result.modifiedCount} products`,
            transferredCount: result.modifiedCount,
            sourceCategory: sourceCategory.name,
            targetCategory: targetCategory.name
        });
    } catch (error) {
        console.error('Error transferring products:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete category
router.delete('/categories/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        // Check if category has products
        const productCount = await Product.countDocuments({ category: req.params.id });

        if (productCount > 0) {
            return res.status(400).json({ message: 'Cannot delete category with existing products' });
        }

        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'category_deleted', `Deleted category: ${category.name}`, { categoryId: category._id });

        // Broadcast to all connected clients
        const { broadcastCategoryUpdate } = require('../socketHandler.js');
        broadcastCategoryUpdate('deleted', { _id: category._id, name: category.name });

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password -cart');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/users/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'user_updated', `Updated user: ${user.name}`, { userId: user._id });

        res.json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'user_deleted', `Deleted user: ${user.name}`, { userId: user._id });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get dashboard stats
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

        res.json({
            totalProducts,
            totalUsers,
            totalOrders,
            totalRevenue: revenue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all orders
router.get('/orders', verifyAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email loyaltyBadge')
            .sort({ updatedAt: -1, orderDate: -1 }); // Sort by most recently updated first
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update order status (specific route - must come before /orders/:id)
router.put('/orders/:id/status', verifyAdminWithWriteProtection, async (req, res) => {
    console.log('🚨🚨🚨 ROUTE HANDLER EXECUTING 🚨🚨🚨');
    try {
        const { status } = req.body;

        console.log('🎯 ORDER STATUS UPDATE ROUTE CALLED:', {
            orderId: req.params.id,
            newStatus: status,
            timestamp: new Date().toISOString()
        });

        // Get the order to check current status and delivery timing
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log('📋 Current order state:', {
            orderId: order._id.toString().slice(-6),
            currentStatus: order.status,
            newStatus: status,
            hasDeliveryProgress: !!order.deliveryProgress
        });

        // Handle delivery progress tracking
        if (status === 'out_for_delivery') {
            // Populate user to get membership tier from loyaltyBadge
            await order.populate('userId', 'loyaltyBadge');

            console.log('🔍 Membership Detection Debug:', {
                userId: order.userId?._id,
                hasLoyaltyBadge: !!order.userId?.loyaltyBadge,
                loyaltyBadge: order.userId?.loyaltyBadge,
                badgeType: order.userId?.loyaltyBadge?.type
            });

            // Get membership tier from loyaltyBadge
            const membershipTier = order.userId?.loyaltyBadge?.type || 'none';

            // Generate random estimated delivery time based on membership tier
            let minTime, maxTime;
            switch (membershipTier.toLowerCase()) {
                case 'platinum':
                    minTime = 10;
                    maxTime = 15;
                    break;
                case 'gold':
                    minTime = 15;
                    maxTime = 20;
                    break;
                case 'silver':
                    minTime = 20;
                    maxTime = 25;
                    break;
                default: // 'none' or any other
                    minTime = 25;
                    maxTime = 30;
                    break;
            }

            // Generate random time between min and max (inclusive)
            const estimatedMinutes = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
            const startTime = new Date();

            console.log(`🚚 Initializing delivery progress:`, {
                orderId: order._id.toString().slice(-6),
                membershipTier: membershipTier.toUpperCase(),
                timeRange: `${minTime}-${maxTime} minutes`,
                assignedTime: `${estimatedMinutes} minutes`,
                startTime: startTime.toISOString()
            });

            // CRITICAL: Set deliveryProgress fields explicitly
            order.deliveryProgress = {
                startTime: startTime,
                estimatedDeliveryMinutes: estimatedMinutes,
                currentProgress: 0,
                lastUpdated: startTime
            };

            // ALSO set at order level for backward compatibility
            order.deliveryStartTime = startTime;
            order.estimatedDeliveryMinutes = estimatedMinutes;

            console.log(`📦 Update data being saved:`, JSON.stringify(order.deliveryProgress, null, 2));
        } else if (status === 'delivered') {
            // Mark delivery as complete
            order.deliveredDate = new Date();
            if (order.deliveryProgress) {
                order.deliveryProgress = {
                    ...order.deliveryProgress.toObject(),
                    currentProgress: 100,
                    completedAt: new Date(),
                    lastUpdated: new Date()
                };
            }
        }

        // Update status
        order.status = status;

        // Add to status history
        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        order.statusHistory.push({
            status: status,
            timestamp: new Date(),
            message: `Status changed to ${status}`,
            updatedBy: req.admin?.email || 'admin'
        });

        // Save the order
        const updatedOrder = await order.save();

        // Populate user details for response
        await updatedOrder.populate('userId', 'name email');

        // VERIFICATION: Log what was actually saved
        if (status === 'out_for_delivery') {
            console.log(`✅ Saved deliveryProgress:`, JSON.stringify(updatedOrder.deliveryProgress, null, 2));
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'order_updated', `Updated order #${updatedOrder.orderNumber || updatedOrder._id} to ${status}`, { orderId: updatedOrder._id, status });

        // Broadcast to the specific user
        const { broadcastOrderUpdate } = require('../socketHandler.js');
        broadcastOrderUpdate(updatedOrder.userId._id, 'status_changed', updatedOrder);

        res.json({
            message: 'Order updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        res.status(500).json({
            message: error.message,
            error: error.toString(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update order status
router.put('/orders/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };

        // Get the order to check current status and delivery timing
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Handle delivery progress tracking
        if (status === 'out_for_delivery') {
            // Populate user to get membership tier from loyaltyBadge
            await order.populate('userId', 'loyaltyBadge');

            // Get membership tier from loyaltyBadge
            const membershipTier = order.userId?.loyaltyBadge?.type || 'none';

            // Generate random estimated delivery time based on membership tier
            let minTime, maxTime;
            switch (membershipTier.toLowerCase()) {
                case 'platinum':
                    minTime = 10;
                    maxTime = 15;
                    break;
                case 'gold':
                    minTime = 15;
                    maxTime = 20;
                    break;
                case 'silver':
                    minTime = 20;
                    maxTime = 25;
                    break;
                default: // 'none' or any other
                    minTime = 25;
                    maxTime = 30;
                    break;
            }

            // Generate random time between min and max (inclusive)
            const estimatedMinutes = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
            const startTime = new Date();

            console.log(`🚚 Initializing delivery progress:`, {
                orderId: order._id.toString().slice(-6),
                membershipTier,
                estimatedMinutes: `${estimatedMinutes} min (${minTime}-${maxTime} range)`,
                startTime: startTime.toISOString()
            });

            // CRITICAL: Set deliveryProgress fields explicitly
            updateData.deliveryProgress = {
                startTime: startTime,
                estimatedDeliveryMinutes: estimatedMinutes,
                currentProgress: 0,
                lastUpdated: startTime
            };

            // ALSO set at order level for backward compatibility
            updateData.deliveryStartTime = startTime;
            updateData.estimatedDeliveryMinutes = estimatedMinutes;

            console.log(`📦 Update data being saved:`, JSON.stringify(updateData.deliveryProgress, null, 2));
        } else if (status === 'delivered') {
            // Mark delivery as complete
            updateData.deliveredDate = new Date();
            if (order.deliveryProgress) {
                updateData.deliveryProgress = {
                    ...order.deliveryProgress.toObject(),
                    currentProgress: 100,
                    completedAt: new Date(),
                    lastUpdated: new Date()
                };
            }
        }

        // Update the order fields directly
        order.status = status;

        // Apply deliveryProgress if it was set
        if (updateData.deliveryProgress) {
            order.deliveryProgress = updateData.deliveryProgress;
        }

        // Apply delivery timing fields if they were set
        if (updateData.deliveryStartTime) {
            order.deliveryStartTime = updateData.deliveryStartTime;
        }
        if (updateData.estimatedDeliveryMinutes) {
            order.estimatedDeliveryMinutes = updateData.estimatedDeliveryMinutes;
        }

        // Apply deliveredDate if it was set
        if (updateData.deliveredDate) {
            order.deliveredDate = updateData.deliveredDate;
        }

        // Add to status history
        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        order.statusHistory.push({
            status: status,
            timestamp: new Date(),
            message: `Status changed to ${status}`,
            updatedBy: req.admin?.email || 'admin'
        });

        // Save the order
        const updatedOrder = await order.save();

        // Populate user details for response
        await updatedOrder.populate('userId', 'name email');

        // VERIFICATION: Log what was actually saved
        if (status === 'out_for_delivery') {
            console.log(`✅ Saved deliveryProgress:`, JSON.stringify(updatedOrder.deliveryProgress, null, 2));
        }

        // Log contribution
        await Contribution.log(req.admin.id, 'order_updated', `Updated order #${updatedOrder.orderNumber || updatedOrder._id} to ${status}`, { orderId: updatedOrder._id, status });

        // Broadcast to the specific user
        const { broadcastOrderUpdate } = require('../socketHandler.js');
        broadcastOrderUpdate(updatedOrder.userId._id, 'status_changed', updatedOrder);

        res.json({
            message: 'Order updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        console.error('❌ Error updating order (second route):', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            message: error.message,
            error: error.toString()
        });
    }
});

// Delete order
router.delete('/orders/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Log contribution
        await Contribution.log(req.admin.id, 'order_deleted', `Deleted order #${order.orderNumber || order._id}`, { orderId: order._id });

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get delivery progress for an order
router.get('/orders/:id/progress', verifyAdmin, async (req, res) => {
    try {
        const { getProgressInfo } = require('../utils/progressUtils.js');

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if order has delivery progress tracking
        if (!order.deliveryProgress || !order.deliveryProgress.startTime) {
            return res.json({
                hasProgress: false,
                message: 'Delivery progress tracking not started for this order'
            });
        }

        // Calculate current progress
        const progressInfo = getProgressInfo(
            order.deliveryProgress.startTime,
            order.deliveryProgress.estimatedDeliveryMinutes
        );

        // AUTO-DELIVER: If progress >= 100% and status is still out_for_delivery, mark as delivered
        if (progressInfo.progress >= 100 && order.status === 'out_for_delivery') {
            console.log(`🎉 Auto-delivering order ${order._id.toString().slice(-6)} - Progress: ${progressInfo.progress}%`);

            order.status = 'delivered';
            order.deliveredDate = new Date();
            order.deliveryProgress.currentProgress = 100;
            order.deliveryProgress.completedAt = new Date();
            order.deliveryProgress.lastUpdated = new Date();

            // Add to status history
            if (!order.statusHistory) {
                order.statusHistory = [];
            }
            order.statusHistory.push({
                status: 'delivered',
                timestamp: new Date(),
                message: 'Auto-delivered - Timer completed',
                updatedBy: 'system'
            });

            await order.save();

            // Broadcast to the user
            const { broadcastOrderUpdate } = require('../socketHandler.js');
            if (order.userId) {
                const userId = typeof order.userId === 'string' ? order.userId : order.userId._id;
                broadcastOrderUpdate(userId, 'status_changed', order);
            }

            console.log(`✅ Order ${order._id.toString().slice(-6)} auto-delivered successfully`);
        } else {
            // Update the order's current progress in database
            await Order.findByIdAndUpdate(req.params.id, {
                'deliveryProgress.currentProgress': progressInfo.progress,
                'deliveryProgress.lastUpdated': new Date()
            });
        }

        res.json({
            hasProgress: true,
            orderId: order._id,
            status: order.status,
            ...progressInfo,
            startTime: order.deliveryProgress.startTime,
            estimatedMinutes: order.deliveryProgress.estimatedDeliveryMinutes,
            completedAt: order.deliveryProgress.completedAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password -cart');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/users/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            message: 'User updated successfully',
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/users/:id', verifyAdminWithWriteProtection, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ MEMBERSHIP MANAGEMENT ============
// Middleware to check Admin/SuperAdmin with manage_memberships permission
const verifyMembershipPermission = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(verified.id);

        if (!admin) {
            return res.status(401).json({ message: 'Admin not found' });
        }

        // Block viewers from write operations
        const viewerRoles = ['normal_viewer', 'special_viewer'];
        if (viewerRoles.includes(admin.role) && req.method !== 'GET') {
            return res.status(403).json({
                message: 'Viewers do not have permission to modify data. You can only view content.',
                role: admin.role
            });
        }

        // Super admins always have access
        if (admin.role === 'super_admin') {
            req.admin = verified;
            return next();
        }

        // Vendors cannot access
        if (admin.role === 'vendor') {
            return res.status(403).json({ message: 'Vendors cannot access membership management' });
        }

        // Check for manage_memberships permission
        if (!admin.permissions || !admin.permissions.includes('manage_memberships')) {
            return res.status(403).json({ message: 'You do not have permission to manage memberships' });
        }

        req.admin = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Middleware to check Admin/SuperAdmin with manage_wallets permission
const verifyWalletPermission = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(verified.id);

        if (!admin) {
            return res.status(401).json({ message: 'Admin not found' });
        }

        // Super admins always have access
        if (admin.role === 'super_admin') {
            req.admin = verified;
            return next();
        }

        // Vendors cannot access
        if (admin.role === 'vendor') {
            return res.status(403).json({ message: 'Vendors cannot access wallet management' });
        }

        // Check for manage_wallets permission
        if (!admin.permissions || !admin.permissions.includes('manage_wallets')) {
            return res.status(403).json({ message: 'You do not have permission to manage wallets' });
        }

        req.admin = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Get all users with membership info
router.get('/memberships', verifyMembershipPermission, async (req, res) => {
    try {
        const users = await User.find()
            .select('name email phone loyaltyBadge createdAt')
            .sort({ 'loyaltyBadge.type': -1, createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get membership stats
router.get('/memberships/stats', verifyMembershipPermission, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const silverMembers = await User.countDocuments({ 'loyaltyBadge.type': 'silver' });
        const goldMembers = await User.countDocuments({ 'loyaltyBadge.type': 'gold' });
        const platinumMembers = await User.countDocuments({ 'loyaltyBadge.type': 'platinum' });

        res.json({
            totalUsers,
            silverMembers,
            goldMembers,
            platinumMembers,
            totalMembers: silverMembers + goldMembers + platinumMembers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Assign badge to user (Admin/Super Admin only)
router.put('/memberships/:userId/badge', verifyMembershipPermission, async (req, res) => {
    try {
        const { badgeType, customExpiresAt } = req.body;

        if (!['none', 'silver', 'gold', 'platinum'].includes(badgeType)) {
            return res.status(400).json({ message: 'Invalid badge type' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get admin info to check role for custom expiry
        const admin = await Admin.findById(req.admin.id);
        const isSuperAdmin = admin && (admin.role === 'super_admin' || admin.role === 'god');

        if (badgeType === 'none') {
            // Remove badge
            user.loyaltyBadge = {
                type: 'none',
                purchasedAt: null,
                expiresAt: null,
                assignedBy: null
            };
        } else {
            // Determine expiry date
            let expiresAt;

            // Only super admins can set custom expiry
            if (customExpiresAt && isSuperAdmin) {
                expiresAt = new Date(customExpiresAt);
                // Validate the date is in the future
                if (expiresAt <= new Date()) {
                    return res.status(400).json({ message: 'Expiry date must be in the future' });
                }
            } else {
                // Default: 1 year from now
                expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            }

            user.loyaltyBadge = {
                type: badgeType,
                purchasedAt: new Date(),
                expiresAt: expiresAt,
                assignedBy: req.admin.id
            };
        }

        await user.save();

        // Broadcast membership update to user
        const { broadcastMembershipUpdate } = require('../socketHandler.js');
        broadcastMembershipUpdate(user._id, user.loyaltyBadge);

        res.json({
            message: badgeType === 'none'
                ? 'Badge removed successfully'
                : `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge assigned successfully!`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                loyaltyBadge: user.loyaltyBadge
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ WALLET MANAGEMENT (Admin) ============

// Search users for wallet management
router.get('/users/search', verifyWalletPermission, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 1) return res.json([]);

        const users = await User.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } }
            ]
        })
            .select('name email phone walletBalance createdAt')
            .limit(20);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all users with wallet info
router.get('/wallets', verifyWalletPermission, async (req, res) => {
    try {
        const users = await User.find()
            .select('name email phone walletBalance createdAt')
            .sort({ walletBalance: -1, createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get wallet stats
router.get('/wallets/stats', verifyWalletPermission, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const usersWithBalance = await User.countDocuments({ walletBalance: { $gt: 0 } });

        const aggregation = await User.aggregate([
            { $group: { _id: null, totalBalance: { $sum: '$walletBalance' } } }
        ]);

        const totalBalance = aggregation[0]?.totalBalance || 0;

        res.json({
            totalUsers,
            usersWithBalance,
            totalBalance,
            avgBalance: usersWithBalance > 0 ? (totalBalance / usersWithBalance).toFixed(2) : 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Deposit to user wallet
router.post('/wallets/:userId/deposit', verifyWalletPermission, async (req, res) => {
    try {
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + amount;
        user.walletHistory = user.walletHistory || [];
        user.walletHistory.push({
            type: 'deposit',
            amount: amount,
            description: description || `Admin deposit of ₹${amount}`,
            adminId: req.admin.adminId,
            createdAt: new Date()
        });

        await user.save();

        // Broadcast wallet update to user
        const { broadcastWalletUpdate } = require('../socketHandler.js');
        broadcastWalletUpdate(user._id, 'deposit', { balance: user.walletBalance, amount });

        res.json({
            message: `₹${amount} deposited successfully!`,
            newBalance: user.walletBalance,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Withdraw from user wallet
router.post('/wallets/:userId/withdraw', verifyWalletPermission, async (req, res) => {
    try {
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if ((user.walletBalance || 0) < amount) {
            return res.status(400).json({
                message: 'Insufficient balance',
                currentBalance: user.walletBalance || 0
            });
        }

        user.walletBalance -= amount;
        user.walletHistory = user.walletHistory || [];
        user.walletHistory.push({
            type: 'withdraw',
            amount: -amount,
            description: description || `Admin withdrawal of ₹${amount}`,
            adminId: req.admin.adminId,
            createdAt: new Date()
        });

        await user.save();

        // Broadcast wallet update to user
        const { broadcastWalletUpdate } = require('../socketHandler.js');
        broadcastWalletUpdate(user._id, 'withdraw', { balance: user.walletBalance, amount });

        res.json({
            message: `₹${amount} withdrawn successfully!`,
            newBalance: user.walletBalance,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Set user wallet balance directly
router.put('/wallets/:userId', verifyWalletPermission, async (req, res) => {
    try {
        const { balance, description } = req.body;

        if (balance === undefined || balance < 0) {
            return res.status(400).json({ message: 'Invalid balance' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const oldBalance = user.walletBalance || 0;
        const diff = balance - oldBalance;

        user.walletBalance = balance;
        user.walletHistory = user.walletHistory || [];
        user.walletHistory.push({
            type: diff >= 0 ? 'deposit' : 'withdraw',
            amount: diff,
            description: description || `Admin set balance to ₹${balance}`,
            adminId: req.admin.adminId,
            createdAt: new Date()
        });

        await user.save();

        res.json({
            message: `Balance updated to ₹${balance}`,
            oldBalance,
            newBalance: user.walletBalance,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ CONTRIBUTION TRACKING ============

// Get my contributions
router.get('/contributions/me', verifyAdmin, async (req, res) => {
    try {
        const { days = 7, fromDate, toDate } = req.query;

        // Use custom date range if provided, otherwise use days
        let startDate, endDate;
        if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999); // Include entire end day
        } else {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
            endDate = new Date();
        }

        const contributions = await Contribution.find({
            admin: req.admin.id,
            createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: -1 });

        // Group by day for chart (calculate days between dates)
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const dailyStats = {};
        for (let i = 0; i < Math.min(daysDiff, 30); i++) { // Max 30 days for chart
            const date = new Date(endDate);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyStats[dateKey] = 0;
        }

        contributions.forEach(c => {
            const dateKey = c.createdAt.toISOString().split('T')[0];
            if (dailyStats[dateKey] !== undefined) {
                dailyStats[dateKey]++;
            }
        });

        // Convert to array for chart
        const chartData = Object.entries(dailyStats)
            .map(([date, count]) => ({ date, count }))
            .reverse();

        res.json({
            contributions,
            chartData,
            total: contributions.length,
            dateRange: { from: startDate, to: endDate }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all contributions (super admin only)
router.get('/contributions/all', verifySuperAdmin, async (req, res) => {
    try {
        const { days = 7, adminId, fromDate, toDate } = req.query;

        // Use custom date range if provided, otherwise use days
        let startDate, endDate;
        if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
            endDate = new Date();
        }

        const query = { createdAt: { $gte: startDate, $lte: endDate } };
        if (adminId) {
            query.admin = adminId;
        }

        const contributions = await Contribution.find(query)
            .populate('admin', 'username email role')
            .sort({ createdAt: -1 });

        // Group by admin for overview
        const adminStats = {};
        contributions.forEach(c => {
            const adminKey = c.admin?._id?.toString() || 'unknown';
            if (!adminStats[adminKey]) {
                adminStats[adminKey] = {
                    admin: c.admin,
                    count: 0,
                    actions: {}
                };
            }
            adminStats[adminKey].count++;
            adminStats[adminKey].actions[c.action] = (adminStats[adminKey].actions[c.action] || 0) + 1;
        });

        // Group by day for chart
        const dailyStats = {};
        for (let i = 0; i < parseInt(days); i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyStats[dateKey] = 0;
        }

        contributions.forEach(c => {
            const dateKey = c.createdAt.toISOString().split('T')[0];
            if (dailyStats[dateKey] !== undefined) {
                dailyStats[dateKey]++;
            }
        });

        const chartData = Object.entries(dailyStats)
            .map(([date, count]) => ({ date, count }))
            .reverse();

        res.json({
            contributions,
            chartData,
            adminStats: Object.values(adminStats),
            total: contributions.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all admins for dropdown (super admin)
router.get('/contributions/admins', verifySuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({}, 'username email role');
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ ADMIN PROFILE PICTURE ============

// Cloudinary storage for profile pictures
const profilePictureStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'admin-profiles',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
        transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
        public_id: (req, file) => `admin_${req.admin.id}_${Date.now()}`
    }
});

const uploadProfilePic = multer({
    storage: profilePictureStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, PNG, and GIF files are allowed'), false);
        }
    }
});

// Upload/Update profile picture
router.post('/profile/picture', verifyAdmin, uploadProfilePic.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const admin = await Admin.findByIdAndUpdate(
            req.admin.id,
            { profilePicture: req.file.path },
            { new: true }
        ).select('-password');

        // Log contribution
        await Contribution.log(req.admin.id, 'admin_updated', `Updated profile picture`);

        res.json({
            message: 'Profile picture updated successfully',
            profilePicture: req.file.path,
            admin
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete profile picture
router.delete('/profile/picture', verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findByIdAndUpdate(
            req.admin.id,
            { profilePicture: null },
            { new: true }
        ).select('-password');

        res.json({
            message: 'Profile picture removed',
            admin
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current admin profile
router.get('/profile/me', verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        res.json(admin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ ADMIN DIRECTORY (View-only for non-super-admins) ============

// Get all admins for directory view
router.get('/directory', verifyAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({ isActive: true })
            .select('username email role profilePicture likes likeBoost tags createdAt');

        // Add likeCount and hasLiked for current user
        const adminsWithLikes = admins.map(admin => ({
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            profilePicture: admin.profilePicture,
            tags: admin.tags,
            createdAt: admin.createdAt,
            likeCount: (admin.likes?.length || 0) + (admin.likeBoost || 0),
            hasLiked: admin.likes?.some(id => id.toString() === req.admin.id)
        }));

        // Sort: super_admin first, then by username
        const roleOrder = { 'super_admin': 0, 'admin': 1, 'vendor': 2, 'special_viewer': 3, 'normal_viewer': 4 };
        adminsWithLikes.sort((a, b) => {
            const roleA = roleOrder[a.role] ?? 99;
            const roleB = roleOrder[b.role] ?? 99;
            if (roleA !== roleB) return roleA - roleB;
            return a.username.localeCompare(b.username);
        });

        res.json(adminsWithLikes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single admin profile for viewing
router.get('/directory/:id', verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id)
            .select('username email role profilePicture likes likeBoost tags createdAt permissions');

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Get contributions for this admin (recent 10 for display)
        const contributions = await Contribution.find({ admin: req.params.id })
            .sort({ createdAt: -1 })
            .limit(10);

        // Get TOTAL contribution count
        const contributionCount = await Contribution.countDocuments({ admin: req.params.id });

        res.json({
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            profilePicture: admin.profilePicture,
            tags: admin.tags,
            permissions: admin.permissions,
            createdAt: admin.createdAt,
            likeCount: (admin.likes?.length || 0) + (admin.likeBoost || 0),
            hasLiked: admin.likes?.some(id => id.toString() === req.admin.id),
            contributionCount,  // Total count
            contributions       // Only recent 10
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle like on admin profile
router.post('/profile/:id/like', verifyAdmin, async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);
        if (!targetAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Can't like yourself
        if (targetAdmin._id.toString() === req.admin.id) {
            return res.status(400).json({ message: "You can't like your own profile" });
        }

        const hasLiked = targetAdmin.likes?.some(id => id.toString() === req.admin.id);

        if (hasLiked) {
            // Unlike
            targetAdmin.likes = targetAdmin.likes.filter(id => id.toString() !== req.admin.id);
        } else {
            // Like
            if (!targetAdmin.likes) targetAdmin.likes = [];
            targetAdmin.likes.push(req.admin.id);
        }

        await targetAdmin.save();

        res.json({
            liked: !hasLiked,
            likeCount: (targetAdmin.likes?.length || 0) + (targetAdmin.likeBoost || 0)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ ADMIN SUPPORT CHAT SYSTEM ============

// Get all pending support requests
router.get('/support/requests', verifyAdmin, async (req, res) => {
    try {
        const pendingChats = await SupportChat.find({ status: 'pending' })
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({
            count: pendingChats.length,
            requests: pendingChats.map(chat => ({
                id: chat._id,
                user: chat.user,
                firstMessage: chat.messages[0]?.message || '',
                createdAt: chat.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Accept a support request
router.post('/support/accept/:chatId', verifyAdmin, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            status: 'pending'
        }).populate('user', 'name email');

        if (!chat) {
            return res.status(404).json({ message: 'Pending chat not found' });
        }

        chat.status = 'active';
        chat.admin = req.admin.id;

        // Add system message
        chat.messages.push({
            sender: req.admin.id,
            senderModel: 'Admin',
            message: `Support agent has joined the chat.`,
            timestamp: new Date()
        });

        await chat.save();

        // Get admin name for notification
        const admin = await Admin.findById(req.admin.id).select('username');

        // Send real-time notification to user via WebSocket
        const { broadcastSupportAccepted } = require('../socketHandler.js');
        broadcastSupportAccepted(chat.user._id, {
            chatId: chat._id,
            adminName: admin?.username || 'Support Agent',
            status: 'active'
        });

        res.json({
            success: true,
            message: 'Chat accepted successfully',
            chatId: chat._id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get admin's active support chats
router.get('/support/active', verifyAdmin, async (req, res) => {
    try {
        const activeChats = await SupportChat.find({
            admin: req.admin.id,
            status: 'active'
        })
            .populate('user', 'name email')
            .sort({ updatedAt: -1 });

        res.json({
            count: activeChats.length,
            chats: activeChats.map(chat => ({
                id: chat._id,
                user: chat.user,
                messagesCount: chat.messages.length,
                lastMessage: chat.messages[chat.messages.length - 1],
                updatedAt: chat.updatedAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get chat messages (admin)
router.get('/support/chat/:chatId/messages', verifyAdmin, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            $or: [
                { admin: req.admin.id },
                { status: 'pending' }
            ]
        }).populate('user', 'name email');

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.json({
            chatId: chat._id,
            status: chat.status,
            user: chat.user,
            messages: chat.messages.map(msg => ({
                id: msg._id,
                sender: msg.senderModel,
                message: msg.message,
                timestamp: msg.timestamp
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Send message in chat (admin)
router.post('/support/chat/:chatId/message', verifyAdmin, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            admin: req.admin.id,
            status: 'active'
        });

        if (!chat) {
            return res.status(404).json({ message: 'Active chat not found' });
        }

        const newMessage = {
            sender: req.admin.id,
            senderModel: 'Admin',
            message: message.trim(),
            timestamp: new Date()
        };

        chat.messages.push(newMessage);
        await chat.save();

        // Send real-time notification to user via WebSocket
        const { broadcastSupportMessage } = require('../socketHandler.js');
        broadcastSupportMessage(chat.user, req.admin.id, {
            chatId: chat._id,
            sender: 'Admin',
            message: newMessage.message,
            timestamp: newMessage.timestamp
        });

        res.json({
            success: true,
            message: 'Message sent',
            newMessage: chat.messages[chat.messages.length - 1]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Close support chat (admin)
router.post('/support/chat/:chatId/close', verifyAdmin, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            admin: req.admin.id,
            status: 'active'
        });

        if (!chat) {
            return res.status(404).json({ message: 'Active chat not found' });
        }

        chat.status = 'closed';
        chat.closedAt = new Date();
        chat.closedBy = 'admin';

        // Add closing message
        chat.messages.push({
            sender: req.admin.id,
            senderModel: 'Admin',
            message: 'Support chat has been closed. Thank you for contacting us!',
            timestamp: new Date()
        });

        await chat.save();

        res.json({
            success: true,
            message: 'Support chat closed successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;