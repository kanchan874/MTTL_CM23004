// Main Script - Simplified and Working
let appState = {
    phase1Ready: false,
    phase2Ready: false,
    modelTrained: false,
    dataGenerated: false,
    mobileNetLoaded: false
};

let accuracyChart = null;
let comparisonChart = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    addLog('[App] Starting application...');

    // Load MobileNet
    const loaded = await modelManager.loadMobileNet();
    appState.mobileNetLoaded = loaded;

    if (loaded) {
        addLog('[App] ✓ Ready! Click "Generate Phase 1 Dataset"');
        updateStatus('✓ Application loaded. Generate Phase 1 Dataset to start.');
        enableButton('btnGenPhase1', true);
    }
});

// ============ PHASE 1 ============
async function initPhase1() {
    addLog('[Phase1] Loading Phase 1...');
    const result = await datasetGenerator.initPhase1();
    if (result) {
        appState.phase1Ready = true;
        addLog('[Phase1] ✓ Phase 1 ready');
    }
}

async function generateDataset(phase) {
    addLog(`[Dataset] Generating ${phase}...`);
    updateStatus(`Generating ${phase} dataset...`);

    try {
        const dataset = await datasetGenerator.generateDataset(phase);
        const trainingData = await modelManager.prepareTrainingData(dataset.training, dataset.categories);
        modelManager.trainingData[phase] = trainingData;
        appState.dataGenerated = true;

        addLog(`[Dataset] ✓ Ready with ${dataset.categories.length} classes`);
        updateStatus(`✓ ${phase} dataset ready`);

        if (phase === 'phase1') {
            enableButton('btnTrain', true);
        }
    } catch (error) {
        addLog(`[Dataset] Error: ${error.message}`);
    }
}

// ============ TRAINING ============
async function trainModel() {
    if (!appState.dataGenerated) {
        alert('Generate dataset first');
        return;
    }

    addLog('[Training] Starting....');
    updateStatus('Training model...');
    enableButton('btnTrain', false);
    document.getElementById('progressBar').style.display = 'block';

    try {
        const trainData = modelManager.trainingData.phase1;
        await modelManager.trainModel(trainData, null, 1);
        appState.modelTrained = true;

        addLog('[Training] ✓ Complete!');
        updateStatus('✓ Training complete');

        // Enable buttons
        enableButton('btnEval', true);
        enableButton('btnConfusion', true);
        enableButton('btnAddBus', true);
        enableButton('btnPredict', true);

        showPhase1Metrics();
        setTimeout(() => { document.getElementById('progressBar').style.display = 'none'; }, 1000);

    } catch (error) {
        addLog(`[Training] Error: ${error.message}`);
    }
}

// ============ EVALUATION ============
async function evaluateModel() {
    if (!appState.modelTrained) {
        alert('Train model first');
        return;
    }

    addLog('[Evaluation] Evaluating...');
    try {
        const results = await modelManager.evaluateModel(null, 'phase1');
        displayMetrics('phase1', results);
        addLog('[Evaluation] ✓ Complete');
        updateStatus(`✓ Accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
    } catch (error) {
        addLog(`[Evaluation] Error: ${error.message}`);
    }
}

function showConfusionMatrix() {
    const result = modelManager.getConfusionMatrix('phase1');
    if (!result) {
        alert('Evaluate model first');
        return;
    }

    const matrix = result.confusionMatrix;
    const categories = ['Bike', 'Truck', 'Car'];

    let html = '<table><tr><th>Actual \\ Predicted</th>';
    for (let cat of categories) html += `<th>${cat}</th>`;
    html += '</tr>';

    for (let i = 0; i < categories.length; i++) {
        html += `<tr><th>${categories[i]}</th>`;
        for (let j = 0; j < categories.length; j++) {
            html += `<td>${matrix[i][j]}</td>`;
        }
        html += '</tr>';
    }
    html += '</table>';

    document.getElementById('confusionTable').innerHTML = html;
    showTab('confusion');
}

// ============ INCREMENTAL LEARNING ============
async function addBusClass() {
    if (!appState.modelTrained) {
        alert('Train Phase 1 first');
        return;
    }

    addLog('[Phase2] Adding Bus class...');
    try {
        const dataset = await generateDataset('phase2');
        await modelManager.addNewClass('bus');
        appState.phase2Ready = true;

        addLog('[Phase2] ✓ Bus added');
        updateStatus('✓ Ready to retrain with 4 classes');
        enableButton('btnRetrain', true);

    } catch (error) {
        addLog(`[Phase2] Error: ${error.message}`);
    }
}

async function retrainModel() {
    if (!appState.phase2Ready) {
        alert('Add Bus class first');
        return;
    }

    addLog('[Retraining] Starting...');
    updateStatus('Retraining with 4 classes...');
    enableButton('btnRetrain', false);
    document.getElementById('progressBar').style.display = 'block';

    try {
        const trainData = modelManager.trainingData.phase2;
        await modelManager.retrainModel(trainData, 'phase2');

        addLog('[Retraining] ✓ Complete!');
        updateStatus('✓ Retraining complete');
        enableButton('btnCompare', true);

        setTimeout(() => compareResults(), 500);
        setTimeout(() => { document.getElementById('progressBar').style.display = 'none'; }, 1000);

    } catch (error) {
        addLog(`[Retraining] Error: ${error.message}`);
    }
}

// ============ RESULTS ============
function showPhase1Metrics() {
    const results = modelManager.results.phase1;

    let html = `
        <div style="padding: 1rem; background: #f0f9ff; border-radius: 6px;">
            <h4>Phase 1 Results (3 Classes)</h4>
            <p><strong>Training Accuracy:</strong> ${(results.trainingAccuracy * 100).toFixed(2)}%</p>
            <p><strong>Validation Accuracy:</strong> ${(results.valAccuracy * 100).toFixed(2)}%</p>
            <p><strong>Loss (Train/Val):</strong> ${results.trainingLoss.toFixed(3)} / ${results.valLoss.toFixed(3)}</p>
        </div>
    `;

    document.getElementById('metricsTable').innerHTML = html;
    createAccuracyChart('phase1', results);
}

function displayMetrics(phase, results) {
    let html = `<div style="padding: 1rem;">
        <h4>${phase} Metrics</h4>
        <p><strong>Overall Accuracy:</strong> ${(results.accuracy * 100).toFixed(2)}%</p>`;

    for (let [className, metrics] of Object.entries(results.classMetrics)) {
        html += `<p><strong>${className}:</strong> Precision: ${metrics.precision}, Recall: ${metrics.recall}</p>`;
    }

    html += '</div>';
    document.getElementById('metricsTable').innerHTML = html;
}

function compareResults() {
    const phase1 = modelManager.results.phase1;
    const phase2 = modelManager.results.phase2;

    if (!phase1 || !phase2) return;

    let html = `
        <tr>
            <th>Metric</th>
            <th>Phase 1</th>
            <th>Phase 2</th>
            <th>Change</th>
        </tr>
        <tr>
            <td>Accuracy</td>
            <td>${(phase1.trainingAccuracy * 100).toFixed(2)}%</td>
            <td>${(phase2.trainingAccuracy * 100).toFixed(2)}%</td>
            <td>${((phase2.trainingAccuracy - phase1.trainingAccuracy) * 100).toFixed(2)}%</td>
        </tr>
    `;

    document.getElementById('comparisonTable').innerHTML = html;
    showTab('comparison');
}

function createAccuracyChart(phase, results) {
    const ctx = document.getElementById('accuracyChart').getContext('2d');
    if (accuracyChart) accuracyChart.destroy();

    accuracyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Training Acc', 'Val Accuracy'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [results.trainingAccuracy * 100, results.valAccuracy * 100],
                backgroundColor: ['#3b82f6', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            scales: { y: { max: 100 } }
        }
    });
}

async function predictImage() {
    addLog('[Prediction] Testing...');
    try {
        const demo = tf.randomNormal([1, 1280]);
        const predictions = await modelManager.predict(demo, 'phase1');
        demo.dispose();

        const categories = ['Bike', 'Truck', 'Car'];
        let html = '<div style="padding: 1rem;">';

        if (predictions) {
            for (let i = 0; i < predictions.length; i++) {
                const prob = (predictions[i] * 100).toFixed(1);
                html += `<p>${categories[i]}: <strong>${prob}%</strong></p>`;
            }
        }

        html += '</div>';
        document.getElementById('predictionResults').innerHTML = html;
        showTab('prediction');

    } catch (error) {
        addLog(`[Prediction] Error: ${error.message}`);
    }
}

// ============ UI HELPERS ============
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
        const buttons = document.querySelectorAll('.tab-btn');
        const index = Array.from(document.querySelectorAll('.tab-content')).indexOf(tab);
        if (buttons[index]) buttons[index].classList.add('active');
    }
}
