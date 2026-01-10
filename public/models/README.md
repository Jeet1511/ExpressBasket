# Face-API.js Models Setup

## Required Models

Download the following pre-trained models from the face-api.js repository and place them in the `public/models/` directory:

### Download Links
Visit: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### Required Model Files:
1. **Face Detection:**
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`

2. **Face Landmarks:**
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`

3. **Face Recognition:**
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

4. **Face Expression (Optional):**
   - `face_expression_model-weights_manifest.json`
   - `face_expression_model-shard1`

### Quick Download (PowerShell):
```powershell
cd public/models

# Download tiny face detector
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json" -OutFile "tiny_face_detector_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1" -OutFile "tiny_face_detector_model-shard1"

# Download face landmarks
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json" -OutFile "face_landmark_68_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1" -OutFile "face_landmark_68_model-shard1"

# Download face recognition
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json" -OutFile "face_recognition_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1" -OutFile "face_recognition_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2" -OutFile "face_recognition_model-shard2"
```

### Verify Installation
After downloading, your `public/models/` directory should contain:
```
public/models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── face_recognition_model-shard2
```

## Model Loading in Code
Models will be loaded in the FaceCapture component:
```javascript
await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
```

## Notes
- Models are ~7MB total
- Load once on component mount
- Cache in browser for performance
- Models are required for face detection and recognition to work
