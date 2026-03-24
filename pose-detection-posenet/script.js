/**
 * POSEVISION — script.js
 * PoseNet-based Human Pose Detection
 * MLTL Practical 06 | CM23051
 */

// ============================================================
// GLOBAL STATE
// ============================================================
let net = null;               // PoseNet model
let detectionMode = 'single'; // 'single' or 'multi'
let webcamRunning = false;    // Main webcam
let exCamRunning  = false;    // Exercise webcam

// Exercise counter state
let squatCount = 0;
let squatPhase = 'up';        // 'up' or 'down'
let lastAngle  = 180;

// FPS tracking
let frameCount = 0;
let lastFpsTime = Date.now();
let currentFps = 0;

// Canvas / video references
const outputCanvas = document.getElementById('outputCanvas');
const outputCtx    = outputCanvas.getContext('2d');
const webcamVideo  = document.getElementById('webcamVideo');

const exCanvas  = document.getElementById('exCanvas');
const exCtx     = exCanvas.getContext('2d');
const exVideo   = document.getElementById('exVideo');

// ============================================================
// LOAD MODEL
// ============================================================
async function loadModel() {
  setStatus('loading', 'Loading model...');
  document.getElementById('loadingOverlay').style.display = 'flex';

  try {
    net = await posenet.load({
      architecture: 'MobileNetV1',   // Lightweight, works on low-end laptops
      outputStride: 16,
      inputResolution: { width: 320, height: 240 },
      multiplier: 0.75
    });

    // Simulate progress completing
    document.getElementById('loaderProgress').style.animation = 'none';
    document.getElementById('loaderProgress').style.width = '100%';

    setTimeout(() => {
      document.getElementById('loadingOverlay').style.display = 'none';
      setStatus('running', 'Model Ready');
    }, 500);

  } catch (err) {
    console.error('Model load error:', err);
    setStatus('error', 'Load failed');
    document.getElementById('loader-text') && (document.getElementById('loader-text').textContent = 'Error loading model');
  }
}

// ============================================================
// UI NAVIGATION
// ============================================================
function showPanel(name) {
  // Update panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

function setMode(mode) {
  detectionMode = mode;
  document.getElementById('singleBtn').classList.toggle('active', mode === 'single');
  document.getElementById('multiBtn').classList.toggle('active', mode === 'multi');
  document.getElementById('modeVal').textContent = mode === 'single' ? 'Single' : 'Multi';
}

function setStatus(type, text) {
  const dot = document.querySelector('.dot');
  dot.className = 'dot ' + type;
  document.getElementById('statusText').textContent = text;
}

// ============================================================
// IMAGE UPLOAD — DETECTION
// ============================================================
function loadImage(event) {
  if (!net) { alert('Model still loading. Please wait.'); return; }
  const file = event.target.files[0];
  if (!file) return;

  // Stop webcam if running
  if (webcamRunning) stopWebcam();

  const img = new Image();
  img.onload = () => {
    // Size canvas to image
    outputCanvas.width  = img.naturalWidth;
    outputCanvas.height = img.naturalHeight;
    outputCtx.drawImage(img, 0, 0);
    hidePlaceholder('placeholder');
    runImagePose(img);
  };
  img.src = URL.createObjectURL(file);
}

async function runImagePose(imgEl) {
  setStatus('loading', 'Detecting...');
  const t0 = performance.now();

  try {
    let poses;

    if (detectionMode === 'single') {
      const pose = await net.estimateSinglePose(imgEl, { flipHorizontal: false });
      poses = [pose];
    } else {
      poses = await net.estimateMultiplePoses(imgEl, {
        flipHorizontal: false,
        maxDetections: 5,
        scoreThreshold: 0.5,
        nmsRadius: 20
      });
    }

    const elapsed = performance.now() - t0;
    currentFps = Math.round(1000 / elapsed);

    // Redraw image then overlay skeleton
    outputCtx.drawImage(imgEl, 0, 0);
    poses.forEach(pose => drawPose(outputCtx, pose));

    updateSidebarPrediction(poses[0]);
    updateStats(poses[0], currentFps);
    renderKeyPointTags(poses[0]);
    setStatus('running', `Done · ${elapsed.toFixed(0)}ms`);

  } catch (err) {
    console.error('Detection error:', err);
    setStatus('error', 'Detection failed');
  }
}

// ============================================================
// WEBCAM — MAIN DETECTION
// ============================================================
async function toggleWebcam() {
  if (webcamRunning) {
    stopWebcam();
  } else {
    await startWebcam();
  }
}

async function startWebcam() {
  if (!net) { alert('Model still loading!'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    webcamVideo.srcObject = stream;
    await new Promise(r => webcamVideo.onloadedmetadata = r);
    webcamRunning = true;
    document.getElementById('camBtn').classList.add('active-cam');
    document.getElementById('camBtn').innerHTML = '<span>■</span> Stop Webcam';
    hidePlaceholder('placeholder');
    setStatus('running', 'Webcam Live');
    webcamLoop();
  } catch (err) {
    console.error('Webcam error:', err);
    setStatus('error', 'Cam denied');
  }
}

function stopWebcam() {
  webcamRunning = false;
  if (webcamVideo.srcObject) {
    webcamVideo.srcObject.getTracks().forEach(t => t.stop());
    webcamVideo.srcObject = null;
  }
  document.getElementById('camBtn').classList.remove('active-cam');
  document.getElementById('camBtn').innerHTML = '<span>◎</span> Start Webcam';
  setStatus('idle', 'Stopped');
  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  document.getElementById('placeholder').style.display = 'flex';
}

async function webcamLoop() {
  if (!webcamRunning || !net) return;

  outputCanvas.width  = webcamVideo.videoWidth  || 640;
  outputCanvas.height = webcamVideo.videoHeight || 480;

  const t0 = performance.now();

  try {
    let poses;
    if (detectionMode === 'single') {
      const p = await net.estimateSinglePose(webcamVideo, { flipHorizontal: true });
      poses = [p];
    } else {
      poses = await net.estimateMultiplePoses(webcamVideo, {
        flipHorizontal: true, maxDetections: 3, scoreThreshold: 0.4, nmsRadius: 20
      });
    }

    // Draw mirrored frame
    outputCtx.save();
    outputCtx.scale(-1, 1);
    outputCtx.drawImage(webcamVideo, -outputCanvas.width, 0);
    outputCtx.restore();

    poses.forEach(pose => drawPose(outputCtx, pose));

    const elapsed = performance.now() - t0;
    // FPS smoothing
    frameCount++;
    if (Date.now() - lastFpsTime >= 1000) {
      currentFps = frameCount;
      frameCount = 0;
      lastFpsTime = Date.now();
    }

    updateSidebarPrediction(poses[0]);
    updateStats(poses[0], currentFps);
    renderKeyPointTags(poses[0]);

  } catch (e) { /* skip frame */ }

  if (webcamRunning) requestAnimationFrame(webcamLoop);
}

// ============================================================
// DRAW POSE SKELETON
// ============================================================
const KEYPOINT_COLORS = {
  high:   '#39ff14',  // green – high confidence
  mid:    '#ffd600',  // yellow – medium
  low:    '#ff2d78'   // pink – low
};

const SKELETON_CONNECTIONS = posenet ? posenet.partIds : null;
// PoseNet adjacent pairs (standard skeleton)
const ADJACENT_PAIRS = [
  ['leftShoulder','rightShoulder'],
  ['leftShoulder','leftElbow'],   ['leftElbow','leftWrist'],
  ['rightShoulder','rightElbow'], ['rightElbow','rightWrist'],
  ['leftShoulder','leftHip'],     ['rightShoulder','rightHip'],
  ['leftHip','rightHip'],
  ['leftHip','leftKnee'],         ['leftKnee','leftAnkle'],
  ['rightHip','rightKnee'],       ['rightKnee','rightAnkle'],
  ['nose','leftEye'],             ['nose','rightEye'],
  ['leftEye','leftEar'],          ['rightEye','rightEar']
];

function drawPose(ctx, pose) {
  if (!pose || !pose.keypoints) return;

  // Build lookup map
  const kpMap = {};
  pose.keypoints.forEach(kp => { kpMap[kp.part] = kp; });

  // ---- Draw skeleton lines ----
  ctx.lineWidth = 2.5;
  ADJACENT_PAIRS.forEach(([a, b]) => {
    const kpA = kpMap[a], kpB = kpMap[b];
    if (!kpA || !kpB) return;
    if (kpA.score < 0.3 || kpB.score < 0.3) return;

    // Gradient line
    const grad = ctx.createLinearGradient(kpA.position.x, kpA.position.y, kpB.position.x, kpB.position.y);
    grad.addColorStop(0, 'rgba(0, 245, 255, 0.9)');
    grad.addColorStop(1, 'rgba(0, 119, 255, 0.9)');
    ctx.strokeStyle = grad;
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(kpA.position.x, kpA.position.y);
    ctx.lineTo(kpB.position.x, kpB.position.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // ---- Draw keypoint dots ----
  pose.keypoints.forEach(kp => {
    if (kp.score < 0.3) return;
    const color = kp.score > 0.7 ? KEYPOINT_COLORS.high :
                  kp.score > 0.5 ? KEYPOINT_COLORS.mid  : KEYPOINT_COLORS.low;

    ctx.beginPath();
    ctx.arc(kp.position.x, kp.position.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // White ring
    ctx.beginPath();
    ctx.arc(kp.position.x, kp.position.y, 5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
}

// ============================================================
// STANDING / SITTING PREDICTION
// ============================================================
function predictPosture(pose) {
  if (!pose || !pose.keypoints) return { label: 'Unknown', standing: 0, sitting: 0 };

  const kpMap = {};
  pose.keypoints.forEach(kp => { kpMap[kp.part] = kp; });

  const leftHip   = kpMap['leftHip'];
  const rightHip  = kpMap['rightHip'];
  const leftKnee  = kpMap['leftKnee'];
  const rightKnee = kpMap['rightKnee'];
  const leftAnkle = kpMap['leftAnkle'];
  const rightAnkle= kpMap['rightAnkle'];
  const leftShoulder  = kpMap['leftShoulder'];
  const rightShoulder = kpMap['rightShoulder'];

  // Need hips and knees visible
  if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
    return { label: 'Unknown', standing: 0, sitting: 0 };
  }

  const avgHipY    = (leftHip.position.y    + rightHip.position.y) / 2;
  const avgKneeY   = (leftKnee.position.y   + rightKnee.position.y) / 2;

  let avgShoulderY = null;
  if (leftShoulder && rightShoulder && leftShoulder.score > 0.3 && rightShoulder.score > 0.3) {
    avgShoulderY = (leftShoulder.position.y + rightShoulder.position.y) / 2;
  }

  // Compute ratio: how much lower are knees vs hips
  const hipKneeDiff = avgKneeY - avgHipY;  // positive = knees below hips

  // Also check ankle if available
  let legLength = hipKneeDiff;
  if (leftAnkle && rightAnkle && leftAnkle.score > 0.3) {
    const avgAnkleY = (leftAnkle.position.y + rightAnkle.position.y) / 2;
    legLength = avgAnkleY - avgHipY;
  }

  // Sitting heuristic: hip-knee Y difference is small (bent legs)
  // Standing heuristic: knees well below hips, legs extended
  let standConf, sitConf;

  if (hipKneeDiff < 40) {
    // Knees near same level as hips = likely sitting
    sitConf   = Math.min(0.99, 0.6 + (40 - hipKneeDiff) / 100);
    standConf = 1 - sitConf;
  } else {
    // Knees well below hips = standing
    standConf = Math.min(0.99, 0.55 + hipKneeDiff / 300);
    sitConf   = 1 - standConf;
  }

  // Use shoulder-hip info as secondary signal
  if (avgShoulderY !== null) {
    const torsoHeight = avgHipY - avgShoulderY;
    if (torsoHeight < 60 && hipKneeDiff < 60) sitConf = Math.min(0.99, sitConf + 0.1);
  }

  const label = standConf > sitConf ? 'Standing' : 'Sitting';
  return {
    label,
    standing: Math.round(standConf * 100),
    sitting:  Math.round(sitConf  * 100)
  };
}

function updateSidebarPrediction(pose) {
  const pred = predictPosture(pose);
  const badge = document.getElementById('predBadge');
  badge.textContent = pred.label !== 'Unknown'
    ? `${pred.label} (${Math.max(pred.standing, pred.sitting)}%)`
    : '—';
  badge.style.color = pred.label === 'Standing' ? 'var(--accent-cyan)' :
                      pred.label === 'Sitting'  ? 'var(--accent-pink)' : 'var(--text-dim)';

  document.getElementById('standFill').style.width = pred.standing + '%';
  document.getElementById('sitFill').style.width   = pred.sitting  + '%';
  document.getElementById('standPct').textContent  = pred.standing + '%';
  document.getElementById('sitPct').textContent    = pred.sitting  + '%';
}

function updateStats(pose, fps) {
  document.getElementById('fpsVal').textContent  = fps;
  if (!pose) return;
  const visible = pose.keypoints.filter(k => k.score > 0.3).length;
  const avgConf = pose.keypoints.reduce((a, k) => a + k.score, 0) / pose.keypoints.length;
  document.getElementById('kpVal').textContent   = visible;
  document.getElementById('confVal').textContent = Math.round(avgConf * 100) + '%';
}

function renderKeyPointTags(pose) {
  const list = document.getElementById('keypointsList');
  if (!pose) { list.innerHTML = ''; return; }
  list.innerHTML = pose.keypoints.map(kp => {
    const cls = kp.score > 0.7 ? 'kp-tag high' : kp.score > 0.45 ? 'kp-tag mid' : 'kp-tag';
    return `<span class="${cls}">${kp.part} ${Math.round(kp.score*100)}%</span>`;
  }).join('');
}

function hidePlaceholder(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ============================================================
// EXERCISE CAM — SQUAT COUNTER
// ============================================================
async function toggleExerciseCam() {
  if (exCamRunning) {
    stopExerciseCam();
  } else {
    await startExerciseCam();
  }
}

async function startExerciseCam() {
  if (!net) { alert('Model still loading!'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    exVideo.srcObject = stream;
    await new Promise(r => exVideo.onloadedmetadata = r);
    exCamRunning = true;
    document.getElementById('exCamBtn').classList.add('active-cam');
    document.getElementById('exCamBtn').innerHTML = '<span>■</span> Stop Exercise Cam';
    hidePlaceholder('exPlaceholder');
    exLoop();
  } catch (err) {
    console.error('Exercise cam error:', err);
  }
}

function stopExerciseCam() {
  exCamRunning = false;
  if (exVideo.srcObject) {
    exVideo.srcObject.getTracks().forEach(t => t.stop());
    exVideo.srcObject = null;
  }
  document.getElementById('exCamBtn').classList.remove('active-cam');
  document.getElementById('exCamBtn').innerHTML = '<span>◎</span> Start Exercise Cam';
  document.getElementById('exPlaceholder').style.display = 'flex';
  exCtx.clearRect(0, 0, exCanvas.width, exCanvas.height);
}

async function exLoop() {
  if (!exCamRunning || !net) return;

  exCanvas.width  = exVideo.videoWidth  || 640;
  exCanvas.height = exVideo.videoHeight || 480;

  try {
    const pose = await net.estimateSinglePose(exVideo, { flipHorizontal: true });

    // Draw mirrored frame
    exCtx.save();
    exCtx.scale(-1, 1);
    exCtx.drawImage(exVideo, -exCanvas.width, 0);
    exCtx.restore();

    drawPose(exCtx, pose);
    analyzeSquat(pose);

  } catch (e) { /* skip frame */ }

  if (exCamRunning) requestAnimationFrame(exLoop);
}

/**
 * Calculate angle between three keypoints (degrees)
 * Point B is the vertex
 */
function calcAngle(A, B, C) {
  const BA = { x: A.x - B.x, y: A.y - B.y };
  const BC = { x: C.x - B.x, y: C.y - B.y };
  const dot = BA.x * BC.x + BA.y * BC.y;
  const magBA = Math.sqrt(BA.x**2 + BA.y**2);
  const magBC = Math.sqrt(BC.x**2 + BC.y**2);
  if (magBA === 0 || magBC === 0) return 180;
  const cosAngle = Math.min(1, Math.max(-1, dot / (magBA * magBC)));
  return Math.round(Math.acos(cosAngle) * (180 / Math.PI));
}

function analyzeSquat(pose) {
  const kpMap = {};
  pose.keypoints.forEach(kp => { kpMap[kp.part] = kp; });

  const lHip   = kpMap['leftHip'];
  const lKnee  = kpMap['leftKnee'];
  const lAnkle = kpMap['leftAnkle'];
  const rHip   = kpMap['rightHip'];
  const rKnee  = kpMap['rightKnee'];
  const rAnkle = kpMap['rightAnkle'];

  // Use best visible leg
  let angle = null;
  if (lHip && lKnee && lAnkle && lHip.score > 0.3 && lKnee.score > 0.3 && lAnkle.score > 0.3) {
    angle = calcAngle(lHip.position, lKnee.position, lAnkle.position);
  } else if (rHip && rKnee && rAnkle && rHip.score > 0.3 && rKnee.score > 0.3 && rAnkle.score > 0.3) {
    angle = calcAngle(rHip.position, rKnee.position, rAnkle.position);
  }

  if (angle === null) {
    document.getElementById('squatState').textContent = 'Legs not visible';
    document.getElementById('squatState').className = 'squat-state';
    return;
  }

  lastAngle = angle;
  updateAngleArc(angle);
  document.getElementById('angleNum').textContent = angle + '°';

  // Squat detection thresholds
  const DOWN_THRESHOLD = 100; // knee angle below 100° = squat
  const UP_THRESHOLD   = 160; // knee angle above 160° = standing

  const stateEl = document.getElementById('squatState');

  if (angle < DOWN_THRESHOLD && squatPhase === 'up') {
    squatPhase = 'down';
    stateEl.textContent = '▼  SQUAT DOWN';
    stateEl.className   = 'squat-state down';
  } else if (angle > UP_THRESHOLD && squatPhase === 'down') {
    squatPhase = 'up';
    squatCount++;
    document.getElementById('repCount').textContent = squatCount;
    stateEl.textContent = '▲  STAND UP';
    stateEl.className   = 'squat-state up';

    // Bump animation
    const repEl = document.getElementById('repCount');
    repEl.classList.add('bump');
    setTimeout(() => repEl.classList.remove('bump'), 200);
  } else if (angle >= DOWN_THRESHOLD && angle <= UP_THRESHOLD) {
    stateEl.textContent = '◈  TRANSITION';
    stateEl.className   = 'squat-state';
  }
}

function updateAngleArc(angle) {
  // Arc spans 0–180 degrees. Map angle to dashoffset.
  const arc = document.getElementById('angleArc');
  const totalLen = 157; // circumference of semicircle (π * r = π * 50)
  const pct = Math.min(1, Math.max(0, (180 - angle) / 180));
  arc.style.strokeDashoffset = totalLen - (totalLen * pct);
  // Color shift: green = straight, red = bent
  arc.style.stroke = angle > 150 ? '#39ff14' : angle > 100 ? '#ffd600' : '#ff2d78';
}

function resetCounter() {
  squatCount = 0;
  squatPhase = 'up';
  document.getElementById('repCount').textContent = '0';
  document.getElementById('squatState').textContent = '—';
  document.getElementById('squatState').className = 'squat-state';
  document.getElementById('angleNum').textContent = '—°';
}

// ============================================================
// COMPARE MODE
// ============================================================
async function runComparison(event) {
  if (!net) { alert('Model loading...'); return; }
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = async () => {
    const sCanvas = document.getElementById('singleCanvas');
    const mCanvas = document.getElementById('multiCanvas');
    const sCtx = sCanvas.getContext('2d');
    const mCtx = mCanvas.getContext('2d');

    // Size canvases
    sCanvas.width = mCanvas.width = img.naturalWidth;
    sCanvas.height = mCanvas.height = img.naturalHeight;

    // ---- Single Pose ----
    sCtx.drawImage(img, 0, 0);
    const t1 = performance.now();
    const singlePose = await net.estimateSinglePose(img, { flipHorizontal: false });
    const t2 = performance.now();
    drawPose(sCtx, singlePose);

    const singleTime   = (t2 - t1).toFixed(0);
    const singleFps    = Math.round(1000 / (t2 - t1));
    const singleConf   = Math.round(singlePose.keypoints.reduce((a, k) => a + k.score, 0) / singlePose.keypoints.length * 100);
    const singleKpNum  = singlePose.keypoints.filter(k => k.score > 0.3).length;

    document.getElementById('singleFps').textContent  = singleFps + ' fps';
    document.getElementById('singleConf').textContent = singleConf + '%';
    document.getElementById('singleKp').textContent   = singleKpNum;

    // ---- Multi Pose ----
    mCtx.drawImage(img, 0, 0);
    const t3 = performance.now();
    const multiPoses = await net.estimateMultiplePoses(img, {
      flipHorizontal: false, maxDetections: 5, scoreThreshold: 0.4, nmsRadius: 20
    });
    const t4 = performance.now();
    multiPoses.forEach(p => drawPose(mCtx, p));

    const multiTime  = (t4 - t3).toFixed(0);
    const multiFps   = Math.round(1000 / (t4 - t3));
    const bestPose   = multiPoses[0];
    const multiConf  = bestPose ? Math.round(bestPose.keypoints.reduce((a, k) => a + k.score, 0) / bestPose.keypoints.length * 100) : 0;
    const multiKpNum = multiPoses.reduce((a, p) => a + p.keypoints.filter(k => k.score > 0.3).length, 0);

    document.getElementById('multiFps').textContent  = multiFps + ' fps';
    document.getElementById('multiConf').textContent = multiConf + '%';
    document.getElementById('multiKp').textContent   = multiKpNum;
  };
  img.src = URL.createObjectURL(file);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  loadModel();
});
