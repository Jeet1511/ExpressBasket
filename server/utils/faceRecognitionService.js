/**
 * Server-Side Face Recognition Service
 * Uses @vladmandic/face-api for fast, reliable face recognition
 * 
 * This service handles:
 * - Loading face-api models at server startup
 * - Processing face images and extracting descriptors
 * - Comparing face descriptors for authentication
 */

// Import TensorFlow.js BEFORE face-api (required dependency)
require('@tensorflow/tfjs');

const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

// Configure face-api to use node-canvas
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Service state
let modelsLoaded = false;
let modelLoadError = null;

// Configuration
const CONFIG = {
    MODEL_PATH: path.join(__dirname, '../../public/models'),
    MATCH_THRESHOLD: 0.5, // Lower = stricter matching
    MIN_CONFIDENCE: 0.5,  // Minimum face detection confidence
};

/**
 * Initialize face-api models
 * Call this once during server startup
 */
async function initializeFaceAPI() {
    if (modelsLoaded) {
        console.log('✅ Face-API models already loaded');
        return true;
    }

    try {
        console.log('📦 Loading Face-API models from:', CONFIG.MODEL_PATH);

        // Load required models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromDisk(CONFIG.MODEL_PATH),
            faceapi.nets.faceLandmark68Net.loadFromDisk(CONFIG.MODEL_PATH),
            faceapi.nets.faceRecognitionNet.loadFromDisk(CONFIG.MODEL_PATH),
        ]);

        modelsLoaded = true;
        console.log('✅ Face-API models loaded successfully');
        return true;
    } catch (error) {
        modelLoadError = error;
        console.error('❌ Failed to load Face-API models:', error.message);
        return false;
    }
}

/**
 * Check if models are loaded
 */
function isReady() {
    return modelsLoaded;
}

/**
 * Get model load error if any
 */
function getLoadError() {
    return modelLoadError;
}

/**
 * Process a base64 image and extract face descriptor
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @returns {Object} { success, descriptor, confidence, error }
 */
async function extractFaceDescriptor(base64Image) {
    if (!modelsLoaded) {
        return { success: false, error: 'Face recognition models not loaded' };
    }

    try {
        // Remove data URI prefix if present
        const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(imageData, 'base64');

        // Load image using canvas
        const img = await canvas.loadImage(imageBuffer);

        // Detect face with landmarks and descriptor
        const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
                inputSize: 416,
                scoreThreshold: CONFIG.MIN_CONFIDENCE
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            return {
                success: false,
                error: 'No face detected in image. Please ensure your face is clearly visible.'
            };
        }

        const confidence = detection.detection.score;
        const descriptor = Array.from(detection.descriptor);

        console.log(`✅ Face detected with confidence: ${(confidence * 100).toFixed(1)}%`);

        return {
            success: true,
            descriptor,
            confidence,
            box: detection.detection.box
        };
    } catch (error) {
        console.error('❌ Error extracting face descriptor:', error);
        return {
            success: false,
            error: 'Failed to process image: ' + error.message
        };
    }
}

/**
 * Calculate Euclidean distance between two face descriptors
 * @param {number[]} descriptor1 
 * @param {number[]} descriptor2 
 * @returns {number} Distance (lower = more similar)
 */
function euclideanDistance(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
        return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Match a face descriptor against stored descriptors
 * @param {number[]} descriptor - Face descriptor to match
 * @param {Array} storedDescriptors - Array of { descriptor, adminId, ... }
 * @returns {Object} { matched, admin, distance, confidence }
 */
function matchFaceDescriptor(descriptor, storedDescriptors) {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const stored of storedDescriptors) {
        // Check primary descriptor
        if (stored.descriptor && stored.descriptor.length > 0) {
            const distance = euclideanDistance(descriptor, stored.descriptor);
            if (distance < bestDistance) {
                bestDistance = distance;
                if (distance < CONFIG.MATCH_THRESHOLD) {
                    bestMatch = stored;
                }
            }
        }

        // Check additional descriptors
        if (stored.additionalDescriptors && Array.isArray(stored.additionalDescriptors)) {
            for (const additionalDesc of stored.additionalDescriptors) {
                if (additionalDesc && additionalDesc.length > 0) {
                    const distance = euclideanDistance(descriptor, additionalDesc);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        if (distance < CONFIG.MATCH_THRESHOLD) {
                            bestMatch = stored;
                        }
                    }
                }
            }
        }
    }

    if (bestMatch) {
        const confidence = Math.round((1 - bestDistance / CONFIG.MATCH_THRESHOLD) * 100);
        return {
            matched: true,
            admin: bestMatch,
            distance: bestDistance,
            confidence: Math.max(0, Math.min(100, confidence))
        };
    }

    return {
        matched: false,
        distance: bestDistance,
        confidence: 0
    };
}

/**
 * Validate an image for face registration
 * Checks for face presence and quality
 * @param {string} base64Image 
 * @returns {Object} { valid, descriptor, issues }
 */
async function validateFaceImage(base64Image) {
    const result = await extractFaceDescriptor(base64Image);

    if (!result.success) {
        return {
            valid: false,
            issues: [result.error]
        };
    }

    const issues = [];

    // Check confidence
    if (result.confidence < 0.7) {
        issues.push('Face detection confidence is low. Please ensure better lighting.');
    }

    // Check face box size (optional - ensure face is not too small)
    if (result.box) {
        const faceArea = result.box.width * result.box.height;
        if (faceArea < 10000) { // 100x100 minimum
            issues.push('Face is too small in the image. Please move closer to the camera.');
        }
    }

    return {
        valid: issues.length === 0,
        descriptor: result.descriptor,
        confidence: result.confidence,
        issues
    };
}

module.exports = {
    initializeFaceAPI,
    isReady,
    getLoadError,
    extractFaceDescriptor,
    euclideanDistance,
    matchFaceDescriptor,
    validateFaceImage,
    CONFIG
};
