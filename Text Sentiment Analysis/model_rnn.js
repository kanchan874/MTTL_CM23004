// ─────────────────────────────────────────────
//  model_rnn.js  –  Simple RNN / LSTM Sentiment Classifier
// ─────────────────────────────────────────────

const RNN_EMBED_DIM  = 16;
const RNN_UNITS      = 32;
const RNN_EPOCHS     = 30;
const RNN_BATCH_SIZE = 16;

window.rnnModel = null;

// ─────────────────────────────────────────────
//  Build the RNN (LSTM) model
//  Architecture:
//    Embedding → LSTM(32) → Dense(32, relu) → Dropout → Dense(1, sigmoid)
// ─────────────────────────────────────────────
function buildRNNModel(vocabSize, seqLen) {
  const model = tf.sequential();

  // Embedding layer – maps word indices to dense vectors
  model.add(tf.layers.embedding({
    inputDim    : vocabSize + 1,
    outputDim   : RNN_EMBED_DIM,
    inputLength : seqLen,
    name        : "rnn_embedding"
  }));

  // LSTM layer – captures sequential / temporal patterns in the text
  model.add(tf.layers.lstm({
    units            : RNN_UNITS,
    returnSequences  : false,   // Only return the last hidden state
    name             : "rnn_lstm"
  }));

  // Dense hidden layer
  model.add(tf.layers.dense({
    units      : 32,
    activation : "relu",
    name       : "rnn_dense_hidden"
  }));

  // Dropout for regularisation
  model.add(tf.layers.dropout({ rate: 0.4, name: "rnn_dropout" }));

  // Output layer – sigmoid for binary classification
  model.add(tf.layers.dense({
    units      : 1,
    activation : "sigmoid",
    name       : "rnn_output"
  }));

  model.compile({
    optimizer : tf.train.adam(0.001),
    loss      : "binaryCrossentropy",
    metrics   : ["accuracy"]
  });

  return model;
}

// ─────────────────────────────────────────────
//  Train the RNN model
// ─────────────────────────────────────────────
async function trainRNNModel(sentences, labels, onProgress) {
  const { xsTensor, ysTensor } = SentimentUtils.prepareDataset(sentences, labels);
  const model = buildRNNModel(window.vocabSize, SentimentUtils.MAX_SEQ_LEN);

  console.log("[RNN] Model architecture:");
  model.summary();

  const startTime = performance.now();

  await model.fit(xsTensor, ysTensor, {
    epochs    : RNN_EPOCHS,
    batchSize : RNN_BATCH_SIZE,
    validationSplit: 0.15,
    shuffle   : true,
    callbacks : {
      onEpochEnd: (epoch, logs) => {
        const msg = `Epoch ${epoch + 1}/${RNN_EPOCHS} — loss: ${logs.loss.toFixed(4)}  acc: ${logs.acc.toFixed(4)}`;
        console.log(`[RNN] ${msg}`);
        if (onProgress) onProgress(epoch + 1, RNN_EPOCHS, logs);
      }
    }
  });

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[RNN] Training complete in ${elapsed}s`);

  xsTensor.dispose();
  ysTensor.dispose();

  window.rnnModel = model;
  return { model, elapsed };
}

// ─────────────────────────────────────────────
//  Expose
// ─────────────────────────────────────────────
window.RNNModel = { train: trainRNNModel };
console.log("[model_rnn.js] Loaded ✔");
