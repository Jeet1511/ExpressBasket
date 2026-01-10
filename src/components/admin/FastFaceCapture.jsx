import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { User, Camera, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import './FastFaceCapture.css';

/**
 * FastFaceCapture - Lightweight face capture component
 * 
 * NO client-side face-api.js models - camera starts instantly!
 * Just captures an image and sends to server for processing.
 * 
 * Features:
 * - Instant camera start (no model loading)
 * - Visual face guide overlay
 * - Countdown timer for capture
 * - Sends image to server for processing
 */

const FastFaceCapture = ({
    onCapture,           // Callback with base64 image
    onError,             // Error callback
    mode = 'login',      // 'login' or 'register'
    autoCapture = false, // Auto-capture after countdown
    countdownSeconds = 3 // Countdown before auto-capture
}) => {
    const webcamRef = useRef(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [status, setStatus] = useState('Starting camera...');
    const [error, setError] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);

    // Handle camera ready
    const handleCameraReady = useCallback(() => {
        setCameraReady(true);
        setStatus('Camera ready! Position your face in the frame.');

        // Start auto-capture countdown if enabled
        if (autoCapture) {
            startCountdown();
        }
    }, [autoCapture]);

    // Handle camera error
    const handleCameraError = useCallback((err) => {
        console.error('Camera error:', err);
        setError('Camera access denied. Please allow camera access and refresh.');
        onError?.('Camera access denied');
    }, [onError]);

    // Start countdown for capture
    const startCountdown = useCallback(() => {
        setCountdown(countdownSeconds);
    }, [countdownSeconds]);

    // Countdown effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && cameraReady && autoCapture && !capturedImage) {
            // Auto-capture when countdown reaches 0
            captureImage();
        }
    }, [countdown, cameraReady, autoCapture, capturedImage]);

    // Capture image from webcam
    const captureImage = useCallback(() => {
        if (!webcamRef.current || !cameraReady) return;

        setCapturing(true);
        setStatus('Capturing...');

        try {
            // Capture as JPEG with good quality
            const imageSrc = webcamRef.current.getScreenshot({
                width: 640,
                height: 480
            });

            if (!imageSrc) {
                throw new Error('Failed to capture image');
            }

            setCapturedImage(imageSrc);
            setStatus('Image captured! Processing...');

            // Send to parent
            onCapture?.(imageSrc);

        } catch (err) {
            console.error('Capture error:', err);
            setError('Failed to capture image. Please try again.');
            setCapturing(false);
        }
    }, [cameraReady, onCapture]);

    // Retry capture
    const retryCapture = useCallback(() => {
        setCapturedImage(null);
        setCapturing(false);
        setError('');
        setStatus('Camera ready! Position your face in the frame.');

        if (autoCapture) {
            startCountdown();
        }
    }, [autoCapture, startCountdown]);

    // Manual capture button click
    const handleCaptureClick = () => {
        if (autoCapture) {
            startCountdown();
        } else {
            captureImage();
        }
    };

    return (
        <div className="fast-face-capture">
            <div className="ffc-camera-container">
                {/* Webcam */}
                {!capturedImage ? (
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.9}
                        videoConstraints={{
                            width: 640,
                            height: 480,
                            facingMode: 'user'
                        }}
                        onUserMedia={handleCameraReady}
                        onUserMediaError={handleCameraError}
                        className="ffc-webcam"
                        mirrored={true}
                    />
                ) : (
                    <img src={capturedImage} alt="Captured face" className="ffc-captured-image" />
                )}

                {/* Face guide overlay */}
                {!capturedImage && cameraReady && (
                    <div className="ffc-face-guide">
                        <div className="ffc-face-oval">
                            <div className="ffc-corner ffc-corner-tl"></div>
                            <div className="ffc-corner ffc-corner-tr"></div>
                            <div className="ffc-corner ffc-corner-bl"></div>
                            <div className="ffc-corner ffc-corner-br"></div>
                        </div>
                    </div>
                )}

                {/* Countdown overlay */}
                {countdown > 0 && (
                    <div className="ffc-countdown-overlay">
                        <div className="ffc-countdown-number">{countdown}</div>
                    </div>
                )}

                {/* Loading overlay */}
                {capturing && !capturedImage && (
                    <div className="ffc-loading-overlay">
                        <Loader className="ffc-spinner" size={48} />
                    </div>
                )}
            </div>

            {/* Status */}
            <div className={`ffc-status ${error ? 'error' : cameraReady ? 'ready' : ''}`}>
                <div className="ffc-status-icon">
                    {error ? (
                        <AlertCircle size={20} />
                    ) : capturedImage ? (
                        <CheckCircle size={20} />
                    ) : cameraReady ? (
                        <User size={20} />
                    ) : (
                        <Loader className="ffc-spinner-small" size={20} />
                    )}
                </div>
                <span>{error || status}</span>
            </div>

            {/* Instructions */}
            {!capturedImage && cameraReady && (
                <div className="ffc-instructions">
                    <div className="ffc-instruction-item">
                        <User size={16} />
                        <span>Position face in oval</span>
                    </div>
                    <div className="ffc-instruction-item">
                        <Camera size={16} />
                        <span>Good lighting</span>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="ffc-actions">
                {!capturedImage ? (
                    <button
                        className="ffc-capture-btn"
                        onClick={handleCaptureClick}
                        disabled={!cameraReady || capturing || countdown > 0}
                    >
                        <Camera size={20} />
                        {countdown > 0 ? `Capturing in ${countdown}...` : 'Capture Face'}
                    </button>
                ) : (
                    <button
                        className="ffc-retry-btn"
                        onClick={retryCapture}
                    >
                        <RefreshCw size={20} />
                        Retake Photo
                    </button>
                )}
            </div>
        </div>
    );
};

export default FastFaceCapture;
