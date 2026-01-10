import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { User, Lightbulb, Camera, Clock, CheckCircle, Shield, AlertCircle, Eye } from 'lucide-react';
import './FaceCapture.css';

// OPTIMIZED MODE: 15-20 FPS + Eye Detection configuration (optimized for deployed environments)
const CONFIG = {
    MIN_CONFIDENCE: 0.3,
    STABILITY_FRAMES: 2,
    DEBOUNCE_TIME: 600,
    MIN_FACE_SIZE: 50,
    MAX_FACE_SIZE: 550,
    CENTER_TOLERANCE: 0.4,
    MULTI_CAPTURE_COUNT: 1,
    DESCRIPTOR_SIMILARITY: 0.45,
    INPUT_SIZE: 128,
    EYE_OPEN_THRESHOLD: 0.2,
    REQUIRE_EYES_OPEN: true,
};

// Multi-angle capture positions for registration
const CAPTURE_POSITIONS = [
    { id: 1, name: 'Center', instruction: 'Look straight at the camera', arrow: 'center', icon: '👤' },
    { id: 2, name: 'Left', instruction: 'Turn head slightly LEFT', arrow: 'left', icon: '👈' },
    { id: 3, name: 'Right', instruction: 'Turn head slightly RIGHT', arrow: 'right', icon: '👉' },
    { id: 4, name: 'Up', instruction: 'Tilt head UP slightly', arrow: 'up', icon: '👆' },
    { id: 5, name: 'Down', instruction: 'Tilt head DOWN slightly', arrow: 'down', icon: '👇' },
    { id: 6, name: 'Tilt Left', instruction: 'Tilt head to LEFT shoulder', arrow: 'tilt-left', icon: '↩️' },
    { id: 7, name: 'Tilt Right', instruction: 'Tilt head to RIGHT shoulder', arrow: 'tilt-right', icon: '↪️' },
    { id: 8, name: 'Eyes Closed', instruction: 'CLOSE your eyes briefly', arrow: 'eyes-closed', icon: '😌' },
    { id: 9, name: 'Smile', instruction: 'Give a natural SMILE', arrow: 'smile', icon: '😊' },
    { id: 10, name: 'Final', instruction: 'Look CENTER one more time', arrow: 'center', icon: '✅' },
];

const FaceCapture = ({ onFaceDetected, onError, onMultiAngleComplete, mode = 'login' }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const descriptorBufferRef = useRef([]);
    const lastSentTimeRef = useRef(0);
    const stableCountRef = useRef(0);
    const lastDescriptorRef = useRef(null);
    const isProcessingRef = useRef(false);
    const multiAngleDescriptorsRef = useRef([]); // Store all angle descriptors

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [status, setStatus] = useState('Initializing...');
    const [cameraReady, setCameraReady] = useState(false);
    const [qualityScore, setQualityScore] = useState(0);
    const [stabilityProgress, setStabilityProgress] = useState(0);
    const [facePosition, setFacePosition] = useState('none');
    const [eyesOpen, setEyesOpen] = useState(false);
    const [fps, setFps] = useState(0);
    const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

    // Multi-angle capture states
    const [captureStep, setCaptureStep] = useState(0); // 0 = not started, 1-10 = positions
    const [capturedAngles, setCapturedAngles] = useState([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureCountdown, setCaptureCountdown] = useState(0);

    // Load face-api models with caching optimization
    // Models are cached by browser after first download (~6.8MB total)
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Check if models are already loaded (cached in memory)
                const modelsAlreadyLoaded =
                    faceapi.nets.tinyFaceDetector.isLoaded &&
                    faceapi.nets.faceLandmark68Net.isLoaded &&
                    faceapi.nets.faceRecognitionNet.isLoaded;

                if (modelsAlreadyLoaded) {
                    console.log('✅ Face-API models already in memory');
                    setModelsLoaded(true);
                    setStatus('Ready. Waiting for camera...');
                    return;
                }

                setStatus('Loading AI models (first time may take a moment)...');
                const MODEL_URL = '/models';

                // Load models in parallel with progress tracking
                const loadPromises = [
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ];

                await Promise.all(loadPromises);

                setModelsLoaded(true);
                setStatus('Models loaded. Waiting for camera...');
                console.log('✅ Face-API models loaded successfully');
            } catch (error) {
                console.error('❌ Error loading models:', error);
                setStatus('Error loading AI models. Check network connection.');
                onError?.('Failed to load face recognition models. Please check your network connection and refresh the page.');
            }
        };

        loadModels();
    }, [onError]);

    // OPTIMIZED: Fast euclidean distance with loop unrolling
    const euclideanDistance = useCallback((a, b) => {
        if (!a || !b) return 999;
        let sum = 0;
        for (let i = 0; i < 128; i += 4) {
            const d0 = a[i] - b[i];
            const d1 = a[i + 1] - b[i + 1];
            const d2 = a[i + 2] - b[i + 2];
            const d3 = a[i + 3] - b[i + 3];
            sum += d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;
        }
        return Math.sqrt(sum);
    }, []);

    // Average multiple descriptors
    const averageDescriptors = useCallback((descriptors) => {
        if (descriptors.length === 0) return null;
        if (descriptors.length === 1) return descriptors[0];
        const avg = new Array(128).fill(0);
        for (const d of descriptors) {
            for (let i = 0; i < 128; i++) avg[i] += d[i];
        }
        for (let i = 0; i < 128; i++) avg[i] /= descriptors.length;
        return avg;
    }, []);

    // EYE DETECTION: Calculate Eye Aspect Ratio (EAR) for liveness
    const calculateEyeAspectRatio = useCallback((landmarks) => {
        // Left eye: points 36-41, Right eye: points 42-47
        const leftEye = landmarks.positions.slice(36, 42);
        const rightEye = landmarks.positions.slice(42, 48);

        const getEAR = (eye) => {
            // Vertical distances
            const v1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
            const v2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
            // Horizontal distance
            const h = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
            return (v1 + v2) / (2.0 * h);
        };

        const leftEAR = getEAR(leftEye);
        const rightEAR = getEAR(rightEye);
        return (leftEAR + rightEAR) / 2.0;
    }, []);

    // Validate face position
    const validateFacePosition = useCallback((box, videoWidth, videoHeight) => {
        const faceSize = Math.max(box.width, box.height);
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;

        if (faceSize < CONFIG.MIN_FACE_SIZE) {
            return { valid: false, position: 'too-far', message: 'Move closer' };
        }
        if (faceSize > CONFIG.MAX_FACE_SIZE) {
            return { valid: false, position: 'too-close', message: 'Move back' };
        }

        const xOff = Math.abs(faceCenterX - videoWidth / 2) / videoWidth;
        const yOff = Math.abs(faceCenterY - videoHeight / 2) / videoHeight;

        if (xOff > CONFIG.CENTER_TOLERANCE || yOff > CONFIG.CENTER_TOLERANCE) {
            return { valid: false, position: 'off-center', message: 'Center face' };
        }

        return { valid: true, position: 'good', message: 'Perfect!' };
    }, []);

    // Start multi-angle capture process
    const startMultiAngleCapture = useCallback(() => {
        setCaptureStep(1);
        setCapturedAngles([]);
        multiAngleDescriptorsRef.current = [];
        setIsCapturing(true);
        setStatus(CAPTURE_POSITIONS[0].instruction);
    }, []);

    // Capture current angle
    const captureCurrentAngle = useCallback((descriptor) => {
        if (captureStep === 0 || captureStep > 10) return;

        // Store the descriptor
        multiAngleDescriptorsRef.current.push({
            position: CAPTURE_POSITIONS[captureStep - 1].name,
            descriptor: descriptor
        });

        setCapturedAngles(prev => [...prev, captureStep]);

        // Move to next step
        if (captureStep < 10) {
            setCaptureStep(prev => prev + 1);
            setStatus(CAPTURE_POSITIONS[captureStep].instruction);
            setCaptureCountdown(3); // 3 second countdown for next
            stableCountRef.current = 0; // Reset stability
        } else {
            // All 10 angles captured - complete!
            setIsCapturing(false);
            setStatus('All angles captured! Processing...');

            // Send all descriptors to parent
            if (onMultiAngleComplete) {
                onMultiAngleComplete(multiAngleDescriptorsRef.current);
            } else if (onFaceDetected) {
                // Fall back to sending primary descriptor
                onFaceDetected(multiAngleDescriptorsRef.current[0]?.descriptor);
            }

            setCaptureStep(0);
        }
    }, [captureStep, onMultiAngleComplete, onFaceDetected]);

    // Countdown effect for multi-angle capture
    useEffect(() => {
        if (captureCountdown > 0) {
            const timer = setTimeout(() => {
                setCaptureCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [captureCountdown]);

    // Main face detection function - ULTRA 60 FPS
    const detectFace = useCallback(async () => {
        if (isProcessingRef.current) return;
        if (!webcamRef.current?.video || webcamRef.current.video.readyState !== 4) return;

        isProcessingRef.current = true;

        // FPS counter
        fpsCounterRef.current.frames++;
        const now = Date.now();
        if (now - fpsCounterRef.current.lastTime >= 1000) {
            setFps(fpsCounterRef.current.frames);
            fpsCounterRef.current.frames = 0;
            fpsCounterRef.current.lastTime = now;
        }

        try {
            const video = webcamRef.current.video;
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // MINIMUM INPUT SIZE = MAXIMUM SPEED
            const detectorOptions = new faceapi.TinyFaceDetectorOptions({
                inputSize: CONFIG.INPUT_SIZE,  // 128 = fastest possible
                scoreThreshold: CONFIG.MIN_CONFIDENCE
            });

            const detection = await faceapi
                .detectSingleFace(video, detectorOptions)
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
                const confidence = detection.detection.score;
                setQualityScore(Math.round(confidence * 100));

                // Eye liveness detection
                const ear = calculateEyeAspectRatio(detection.landmarks);
                const areEyesOpen = ear > CONFIG.EYE_OPEN_THRESHOLD;
                setEyesOpen(areEyesOpen);

                // Validate face position
                const positionCheck = validateFacePosition(
                    detection.detection.box,
                    canvas.width,
                    canvas.height
                );

                setFacePosition(positionCheck.position);

                // Draw detection visualization
                const resizedDetections = faceapi.resizeResults(detection, {
                    width: canvas.width,
                    height: canvas.height
                });

                const box = resizedDetections.detection.box;
                const color = positionCheck.valid ? '#4ade80' : '#fbbf24'; // Green if good, yellow if not

                // Draw bounding box with quality indicator
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Draw corner highlights
                const cornerSize = 20;
                ctx.fillStyle = color;
                // Top-left
                ctx.fillRect(box.x, box.y, cornerSize, 4);
                ctx.fillRect(box.x, box.y, 4, cornerSize);
                // Top-right
                ctx.fillRect(box.x + box.width - cornerSize, box.y, cornerSize, 4);
                ctx.fillRect(box.x + box.width - 4, box.y, 4, cornerSize);
                // Bottom-left
                ctx.fillRect(box.x, box.y + box.height - 4, cornerSize, 4);
                ctx.fillRect(box.x, box.y + box.height - cornerSize, 4, cornerSize);
                // Bottom-right
                ctx.fillRect(box.x + box.width - cornerSize, box.y + box.height - 4, cornerSize, 4);
                ctx.fillRect(box.x + box.width - 4, box.y + box.height - cornerSize, 4, cornerSize);

                // Draw landmarks
                const landmarks = resizedDetections.landmarks;
                ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
                landmarks.positions.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                });

                setFaceDetected(true);

                if (positionCheck.valid && confidence >= CONFIG.MIN_CONFIDENCE) {
                    const currentDescriptor = Array.from(detection.descriptor);

                    // Check descriptor stability (compare with last descriptor)
                    if (lastDescriptorRef.current) {
                        const distance = euclideanDistance(currentDescriptor, lastDescriptorRef.current);
                        if (distance < CONFIG.DESCRIPTOR_SIMILARITY) {
                            stableCountRef.current++;
                        } else {
                            stableCountRef.current = Math.max(0, stableCountRef.current - 1);
                        }
                    } else {
                        stableCountRef.current = 1;
                    }

                    lastDescriptorRef.current = currentDescriptor;
                    setStabilityProgress(Math.min(100, (stableCountRef.current / CONFIG.STABILITY_FRAMES) * 100));

                    // Check if we have enough stable frames
                    if (stableCountRef.current >= CONFIG.STABILITY_FRAMES) {
                        const now = Date.now();

                        // Check debounce
                        if (now - lastSentTimeRef.current >= CONFIG.DEBOUNCE_TIME) {
                            if (mode === 'register') {
                                // Multi-angle capture mode
                                if (captureStep > 0 && captureStep <= 10 && captureCountdown === 0) {
                                    // Auto-capture for multi-angle
                                    captureCurrentAngle(currentDescriptor);
                                    lastSentTimeRef.current = now;
                                    setStatus(`Captured ${captureStep}/10! Next position...`);
                                } else if (captureStep === 0) {
                                    // Legacy single capture mode (if not using multi-angle)
                                    descriptorBufferRef.current.push(currentDescriptor);
                                    setStatus(`Capturing... ${descriptorBufferRef.current.length}/${CONFIG.MULTI_CAPTURE_COUNT}`);

                                    if (descriptorBufferRef.current.length >= CONFIG.MULTI_CAPTURE_COUNT) {
                                        const averagedDescriptor = averageDescriptors(descriptorBufferRef.current);
                                        onFaceDetected?.(averagedDescriptor);
                                        descriptorBufferRef.current = [];
                                        lastSentTimeRef.current = now;
                                        setStatus('Face captured successfully!');
                                    }
                                }
                            } else {
                                // For login mode, send immediately after stability check
                                setStatus('Verifying identity...');
                                onFaceDetected?.(currentDescriptor);
                                lastSentTimeRef.current = now;
                                stableCountRef.current = 0; // Reset for next attempt
                            }
                        }
                    } else {
                        if (captureStep > 0) {
                            setStatus(CAPTURE_POSITIONS[captureStep - 1]?.instruction || 'Hold still...');
                        } else {
                            setStatus(mode === 'login' ? 'Hold still for verification...' : 'Hold still to capture...');
                        }
                    }
                } else {
                    stableCountRef.current = 0;
                    setStabilityProgress(0);
                    setStatus(positionCheck.message);
                }
            } else {
                setFaceDetected(false);
                setFacePosition('none');
                setQualityScore(0);
                setStabilityProgress(0);
                stableCountRef.current = 0;
                lastDescriptorRef.current = null;
                setStatus('Position face in frame');
            }
        } finally {
            isProcessingRef.current = false;
        }
    }, [mode, onFaceDetected, validateFacePosition, euclideanDistance, averageDescriptors, calculateEyeAspectRatio]);

    // Optimized 15-20 FPS detection using setInterval for better deployed performance
    // This reduces CPU/GPU load while maintaining smooth auto-detection
    const detectionIntervalRef = useRef(null);

    useEffect(() => {
        if (!modelsLoaded || !cameraReady) return;

        setStatus('Scanning...');

        // Use setInterval at 50ms (20 FPS) instead of requestAnimationFrame (60 FPS)
        // This significantly reduces load on deployed environments (Vercel/Render)
        detectionIntervalRef.current = setInterval(() => {
            detectFace();
        }, 50); // 50ms = 20 FPS max, actual FPS will depend on detection speed

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [modelsLoaded, cameraReady, detectFace]);

    const handleCameraReady = () => {
        setCameraReady(true);
        setStatus('Camera ready. Detecting face...');
    };

    const handleCameraError = (error) => {
        console.error('Camera error:', error);
        setStatus('Camera access denied');
        onError?.('Please allow camera access to use face recognition.');
    };

    const getStatusColor = () => {
        if (facePosition === 'good' && stabilityProgress >= 100) return 'success';
        if (facePosition === 'good') return 'detecting';
        if (faceDetected) return 'warning';
        return '';
    };

    return (
        <div className="face-capture-container">
            <div className={`camera-wrapper ${status === 'Verifying identity...' || status === 'Recognizing your face...' ? 'scanning' : ''}`}>
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        width: 480,  // Reduced from 640 for better performance
                        height: 360, // Reduced from 480 for better performance
                        facingMode: 'user',
                        frameRate: { ideal: 20, max: 20 } // Limit camera FPS to match detection
                    }}
                    onUserMedia={handleCameraReady}
                    onUserMediaError={handleCameraError}
                    className="webcam"
                />
                <canvas
                    ref={canvasRef}
                    className="face-overlay"
                />

                {/* Stability progress bar */}
                {faceDetected && facePosition === 'good' && (
                    <div className="stability-bar">
                        <div
                            className="stability-fill"
                            style={{ width: `${stabilityProgress}%` }}
                        />
                    </div>
                )}
            </div>

            <div className={`status-indicator ${faceDetected ? 'detected' : ''} ${getStatusColor()}`}>
                <div className="status-icon">
                    {!modelsLoaded && <div className="spinner"></div>}
                    {modelsLoaded && !faceDetected && <Clock size={24} />}
                    {modelsLoaded && faceDetected && facePosition !== 'good' && <AlertCircle size={24} />}
                    {modelsLoaded && faceDetected && facePosition === 'good' && stabilityProgress < 100 && <Shield size={24} />}
                    {modelsLoaded && faceDetected && facePosition === 'good' && stabilityProgress >= 100 && <CheckCircle size={24} />}
                </div>
                <div className="status-text">{status}</div>
                {faceDetected && (
                    <div className="quality-badge">
                        Quality: {qualityScore}%
                    </div>
                )}
                {faceDetected && (
                    <div className={`eye-badge ${eyesOpen ? 'eyes-open' : 'eyes-closed'}`}>
                        <Eye size={14} />
                        {eyesOpen ? 'Eyes Open' : 'Eyes Closed'}
                    </div>
                )}
                {fps > 0 && (
                    <div className="fps-badge">
                        {fps} FPS
                    </div>
                )}
            </div>

            <div className="face-guide">
                <div className={`guide-item ${facePosition === 'good' ? 'active' : ''}`}>
                    <User size={18} className="guide-icon" />
                    <span>Center your face</span>
                </div>
                <div className={`guide-item ${eyesOpen ? 'active' : ''}`}>
                    <Eye size={18} className="guide-icon" />
                    <span>Keep eyes open</span>
                </div>
                <div className="guide-item">
                    <Lightbulb size={18} className="guide-icon" />
                    <span>Good lighting</span>
                </div>
            </div>

            {/* Multi-Angle Capture UI for Registration */}
            {mode === 'register' && (
                <div className="multi-angle-section">
                    {captureStep === 0 ? (
                        /* Start Button */
                        <div className="start-capture-section">
                            <div className="capture-info">
                                <Camera size={24} />
                                <div>
                                    <h4>10-Angle Face Scan</h4>
                                    <p>We'll capture your face from 10 different angles for maximum accuracy</p>
                                </div>
                            </div>
                            <button
                                className="start-capture-btn"
                                onClick={startMultiAngleCapture}
                                disabled={!modelsLoaded || !cameraReady}
                            >
                                <Shield size={20} />
                                Start Face Scan
                            </button>
                        </div>
                    ) : (
                        /* Capture Progress UI */
                        <div className="capture-progress-section">
                            {/* Progress Bar */}
                            <div className="angle-progress">
                                <div className="progress-header">
                                    <span>Scanning: {captureStep}/10</span>
                                    <span>{Math.round((capturedAngles.length / 10) * 100)}% Complete</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${(capturedAngles.length / 10) * 100}%` }}
                                    />
                                </div>
                                {/* Position Dots */}
                                <div className="position-dots">
                                    {CAPTURE_POSITIONS.map((pos, idx) => (
                                        <div
                                            key={pos.id}
                                            className={`position-dot ${capturedAngles.includes(idx + 1) ? 'captured' : ''} ${captureStep === idx + 1 ? 'current' : ''}`}
                                            title={pos.name}
                                        >
                                            {capturedAngles.includes(idx + 1) ? '✓' : pos.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Current Instruction */}
                            <div className="current-instruction">
                                <div className="instruction-icon">
                                    {CAPTURE_POSITIONS[captureStep - 1]?.icon}
                                </div>
                                <div className="instruction-text">
                                    <h4>{CAPTURE_POSITIONS[captureStep - 1]?.name}</h4>
                                    <p>{CAPTURE_POSITIONS[captureStep - 1]?.instruction}</p>
                                </div>
                                {captureCountdown > 0 && (
                                    <div className="countdown-badge">
                                        {captureCountdown}
                                    </div>
                                )}
                            </div>

                            {/* Direction Arrow Indicator */}
                            <div className={`direction-arrow arrow-${CAPTURE_POSITIONS[captureStep - 1]?.arrow}`}>
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'left' && '←'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'right' && '→'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'up' && '↑'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'down' && '↓'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'tilt-left' && '↺'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'tilt-right' && '↻'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'center' && '◎'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'eyes-closed' && '◡◡'}
                                {CAPTURE_POSITIONS[captureStep - 1]?.arrow === 'smile' && '☺'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FaceCapture;
