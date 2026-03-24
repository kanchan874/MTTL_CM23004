# MLTL Practical 06 — Report
## Pose Detection using Pre-trained Model (PoseNet)
**Student:**Kanchan Gaikwad USN:CM23004

---

## AIM
To implement a real-time human pose detection system using the pre-trained PoseNet model (TensorFlow.js) that detects body keypoints, draws a skeleton overlay, classifies posture as Standing or Sitting, counts squat repetitions, and compares Single vs Multi-pose detection modes.

---

## OBJECTIVES
1. Understand the concept of human pose estimation using deep learning
2. Load and use a pre-trained PoseNet model via TensorFlow.js CDN
3. Detect 17 body keypoints from live webcam and uploaded images
4. Draw a complete skeleton overlay with joints and connecting lines
5. Classify the person's posture as Standing or Sitting with confidence %
6. Implement an exercise counter (squats) using knee angle computation
7. Compare Single Pose and Multi-Pose detection modes for speed and accuracy
8. Build a fully functional, modern web-based UI with no backend or installation

---

## INTRODUCTION

Human pose estimation is a computer vision task that identifies and localizes key body parts (joints) in an image or video. It has wide applications in fitness tracking, sports analysis, rehabilitation monitoring, gesture recognition, and surveillance.

**PoseNet** is a pre-trained machine learning model developed by Google that runs entirely in the browser using TensorFlow.js. It uses a MobileNet CNN as its backbone to extract features and predict heatmaps for 17 anatomical keypoints including the nose, eyes, ears, shoulders, elbows, wrists, hips, knees, and ankles.

**TensorFlow.js** is an open-source JavaScript library for machine learning that allows models to run directly in the web browser using WebGL acceleration, requiring no server-side computation.

---

## WORKING

### System Flow
```
Input (Webcam / Image)
        ↓
  Preprocess Frame
        ↓
  PoseNet Inference
        ↓
  17 Keypoint Positions + Confidence Scores
        ↓
  ┌─────────────────────────────┐
  │  Draw Skeleton on Canvas    │
  │  Predict Standing / Sitting │
  │  Count Squats (Exercise)    │
  └─────────────────────────────┘
        ↓
    Display Results
```

### Input Sources
- **Uploaded Image**: File is read with FileReader API, drawn on Canvas, then passed to PoseNet
- **Webcam**: `getUserMedia()` captures video stream; each frame is processed in an animation loop

### Skeleton Drawing
- 17 keypoints are rendered as glowing colored dots
  - Green: confidence > 70%
  - Yellow: confidence 50–70%
  - Pink: confidence < 50%
- 16 bone connections are drawn as cyan gradient lines with glow shadow

---

## ALGORITHM

### A. Posture Classification (Standing / Sitting)

**Keypoints Used:** leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle

```
1. Extract Y-coordinates of hips and knees
2. Compute: hipKneeDiff = avgKneeY - avgHipY
3. If hipKneeDiff < 40 pixels:
      → Knees are at same height as hips (bent legs)
      → Classify as: SITTING
      → Confidence = 0.60 + (40 - diff) / 100
4. Else:
      → Knees are well below hips (extended legs)
      → Classify as: STANDING
      → Confidence = 0.55 + diff / 300
5. Display prediction + confidence bars
```

### B. Squat Counter (Exercise Mode)

**Keypoints Used:** hip, knee, ankle (left or right, whichever is visible)

```
1. For each frame, extract hip, knee, ankle positions
2. Calculate knee angle using dot product formula:
      angle = arccos( (BA · BC) / (|BA| × |BC|) )
      Where: B = knee, A = hip, C = ankle
3. If angle < 100° AND phase == 'up':
      → squatPhase = 'down'   (person squatted)
4. If angle > 160° AND phase == 'down':
      → squatPhase = 'up'     (person stood up)
      → squatCount++           (rep completed)
5. Display count + current angle on arc gauge
```

### C. Angle Calculation Formula
```
vec_BA = A - B   (hip - knee)
vec_BC = C - B   (ankle - knee)

cos(θ) = (vec_BA · vec_BC) / (|vec_BA| × |vec_BC|)
θ = acos(cos(θ)) × (180 / π)
```

### D. Single vs Multi-Pose Detection

| Parameter | Single Pose | Multi Pose |
|---|---|---|
| API | `estimateSinglePose()` | `estimateMultiplePoses()` |
| Max detections | 1 | Up to 5 |
| Speed | Faster (~faster FPS) | Slower |
| Accuracy | Higher (focused) | Lower (distributed) |
| Use case | Individual tracking | Group / crowd |

---

## RESULT

### Detection Panel
- PoseNet successfully loaded via CDN (MobileNetV1, stride=16)
- 17 keypoints detected with confidence scores displayed
- Full skeleton drawn with gradient cyan lines and colored dots
- Posture label shows "Standing" or "Sitting" with confidence %
- FPS displayed in real-time (typically 10–25 FPS on standard laptop)

### Exercise Counter
- Knee angle correctly computed using hip–knee–ankle vectors
- Squat phase transitions detected at 100° (down) and 160° (up)
- Rep count increments with visual animation on completion
- Angle shown on semicircular arc gauge with color feedback

### Comparison Mode
- Same image processed by both Single and Multi-Pose models
- Processing time measured using `performance.now()`
- Single-Pose: Higher FPS, single skeleton
- Multi-Pose: Lower FPS, handles multiple people

---

## CONCLUSION

This practical successfully demonstrated the integration of a pre-trained PoseNet model into a browser-based application using TensorFlow.js. Key learnings include:

1. Pre-trained models can be deployed instantly without any local training
2. PoseNet provides real-time keypoint detection at usable FPS even on low-end hardware
3. Geometric calculations (angles, Y-position ratios) on keypoints enable higher-level understanding like posture and exercise counting
4. Single-Pose mode is faster and more accurate for individual tracking; Multi-Pose handles group scenarios at the cost of speed
5. Browser-based ML using WebGL acceleration makes client-side inference practical for everyday applications

---

## VIVA QUESTIONS & ANSWERS

**Q1. What is PoseNet?**
PoseNet is a pre-trained deep learning model by Google that estimates human body pose from images or video. It detects 17 anatomical keypoints including the nose, eyes, shoulders, elbows, wrists, hips, knees, and ankles.

**Q2. What CNN backbone does PoseNet use?**
PoseNet uses MobileNet (V1 or ResNet50) as its backbone. MobileNetV1 is lightweight and suitable for real-time browser applications. ResNet50 is heavier but more accurate.

**Q3. What is outputStride in PoseNet?**
The outputStride controls the spatial resolution of the output heatmaps. A smaller stride (e.g., 8) gives higher resolution and accuracy but requires more computation. A larger stride (e.g., 16 or 32) is faster but less precise. We use 16 for a balance of speed and accuracy.

**Q4. How does Single Pose differ from Multi Pose detection?**
Single Pose uses a greedy algorithm optimized for one person, making it faster and more confident. Multi Pose uses a more complex algorithm (part-based greedy decoding) to detect and separate multiple people, which is slower but supports crowd scenarios.

**Q5. How is posture (Standing/Sitting) detected without a classifier?**
By analyzing the relative Y-positions of hip and knee keypoints. If knees are at nearly the same height as hips (small vertical difference), the person is likely sitting. If knees are significantly lower, the person is likely standing.
