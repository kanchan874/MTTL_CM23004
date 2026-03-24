# PoseVision — Human Pose Detection
### MLTL Practical 06 | TensorFlow.js + PoseNet

---

## 📌 About
A browser-based human pose detection system built with **PoseNet** via **TensorFlow.js CDN**.
No installation needed — just open `index.html` in any modern browser.

---

## 🚀 How to Run
1. Unzip / place all files in one folder
2. Open `index.html` in Chrome or Firefox
3. Wait ~5–10 seconds for PoseNet model to load from CDN
4. Use the sidebar to choose input source and features

> ⚠️ **For Webcam**: Run via a local server or `file://` may be blocked.
> Use VS Code Live Server extension, or run: `python -m http.server 8000`

---

## 📁 File Structure
```
pose-detection/
├── index.html      — Main UI structure
├── style.css       — Dark cyber theme styling
├── script.js       — PoseNet logic + all features
├── metadata.json   — Labels, thresholds, keypoint info
├── model.json      — Model structure reference (see below)
└── README.md       — This file
```

---

## 🎯 Features
| Feature | Description |
|---|---|
| 🖼 Image Upload | Upload any image, detect pose instantly |
| 📷 Webcam Live | Real-time skeleton overlay at 15–25 FPS |
| 🧍 Standing/Sitting | Predicted from hip-knee Y-position ratio |
| 🏋 Squat Counter | Counts reps via knee angle threshold |
| 👥 Single vs Multi | Compare both modes side-by-side |
| 📊 Confidence Bars | Visual bars for Standing vs Sitting |
| ⚡ FPS Display | Live frames-per-second counter |

---

## 🔬 Detection Logic

### Posture (Standing / Sitting)
- Get Y-positions of hips and knees from keypoints
- If `kneeY - hipY < 40px` → knees near hip level → **Sitting**
- Else → legs extended downward → **Standing**

### Squat Counter
```
knee angle = angle(hip → knee → ankle)
angle < 100° → squatPhase = 'down'
angle > 160° → squatPhase = 'up' → count++
```

### Skeleton Drawing
- 16 bone connections drawn as cyan gradient lines
- Keypoints colored: 🟢 Green (>70%), 🟡 Yellow (>50%), 🔴 Pink (<50%)
- Glow shadows for neon effect

---

## ⚙️ Model Configuration
PoseNet loads with these settings for laptop performance:
```js
{
  architecture: 'MobileNetV1',
  outputStride: 16,
  inputResolution: { width: 320, height: 240 },
  multiplier: 0.75
}
```

---

## 📝 About model.json
`model.json` is a **reference structure file** — it documents the PoseNet model architecture.
The actual model weights are loaded from the TensorFlow.js CDN automatically at runtime:
```
https://cdn.jsdelivr.net/npm/@tensorflow-models/posenet@2.2.2
```

---

## 🛠 Tech Stack
- HTML5 + CSS3 + Vanilla JavaScript
- TensorFlow.js 3.21.0 (CDN)
- PoseNet 2.2.2 (CDN)
- Google Fonts: Orbitron + Rajdhani


