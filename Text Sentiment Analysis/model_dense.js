// ─────────────────────────────────────────────
//  model_dense.js  –  Dense Feed-Forward Neural Network
// ─────────────────────────────────────────────

const DENSE_EMBED_DIM  = 16;
const DENSE_EPOCHS     = 30;
const DENSE_BATCH_SIZE = 16;

window.denseModel = null;

// ─────────────────────────────────────────────
//  Build the Dense model
//  Architecture:
//    Embedding → GlobalAveragePooling1D → Dense(64) → Dropout → Dense(1, sigmoid)
// ─────────────────────────────────────────────
function buildDenseModel(vocabSize, seqLen) {
  const model = tf.sequential();

  // Embedding layer – learns a dense vector for each word index
  model.add(tf.layers.embedding({
    inputDim      : vocabSize + 1,   // +1 for padding index 0
    outputDim     : DENSE_EMBED_DIM,
    inputLength   : seqLen,
    name          : "dense_embedding"
  }));

  // Average all token embeddings into a single vector
  model.add(tf.layers.globalAveragePooling1d({ name: "dense_gap" }));

  // Hidden dense layer with ReLU
  model.add(tf.layers.dense({
    units      : 64,
    activation : "relu",
    name       : "dense_hidden1"
  }));

  // Dropout for regularisation
  model.add(tf.layers.dropout({ rate: 0.4, name: "dense_dropout" }));

  // Output layer – single sigmoid neuron for binary classification
  model.add(tf.layers.dense({
    units      : 1,
    activation : "sigmoid",
    name       : "dense_output"
  }));

  model.compile({
    optimizer : tf.train.adam(0.001),
    loss      : "binaryCrossentropy",
    metrics   : ["accuracy"]
  });

  return model;
}

// ─────────────────────────────────────────────
//  Train the Dense model
// ─────────────────────────────────────────────
async function trainDenseModel(sentences, labels, onProgress) {
  const { xsTensor, ysTensor } = SentimentUtils.prepareDataset(sentences, labels);
  const model = buildDenseModel(window.vocabSize, SentimentUtils.MAX_SEQ_LEN);

  console.log("[Dense] Model architecture:");
  model.summary();

  const startTime = performance.now();

  await model.fit(xsTensor, ysTensor, {
    epochs    : DENSE_EPOCHS,
    batchSize : DENSE_BATCH_SIZE,
    validationSplit: 0.15,
    shuffle   : true,
    callbacks : {
      onEpochEnd: (epoch, logs) => {
        const msg = `Epoch ${epoch + 1}/${DENSE_EPOCHS} — loss: ${logs.loss.toFixed(4)}  acc: ${logs.acc.toFixed(4)}`;
        console.log(`[Dense] ${msg}`);
        if (onProgress) onProgress(epoch + 1, DENSE_EPOCHS, logs);
      }
    }
  });

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[Dense] Training complete in ${elapsed}s`);

  xsTensor.dispose();
  ysTensor.dispose();

  window.denseModel = model;
  return { model, elapsed };
}

// ─────────────────────────────────────────────
//  Expose
// ─────────────────────────────────────────────
window.DenseModel = { train: trainDenseModel };
console.log("[model_dense.js] Loaded ✔");
