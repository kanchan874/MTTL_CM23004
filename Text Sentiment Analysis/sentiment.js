// ─────────────────────────────────────────────
//  sentiment.js  –  Text Preprocessing & Prediction
// ─────────────────────────────────────────────

const VOCAB_SIZE   = 500;   // Maximum vocabulary size
const MAX_SEQ_LEN  = 20;    // Fixed sequence length after padding
const OOV_TOKEN    = "<OOV>";

// ── Shared state (populated after buildVocab) ──────────────────────────
window.wordIndex   = {};   // word → integer index
window.vocabSize   = 0;

// ─────────────────────────────────────────────
//  1. Tokenise a sentence into lower-case words
// ─────────────────────────────────────────────
function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 0);
}

// ─────────────────────────────────────────────
//  2. Build word → index vocabulary from the dataset
// ─────────────────────────────────────────────
function buildVocab(sentences) {
  const freq = {};
  sentences.forEach(s => {
    tokenize(s).forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });
  });

  // Sort by frequency descending
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

  window.wordIndex = {};
  window.wordIndex[OOV_TOKEN] = 1;   // index 0 is reserved for padding
  let idx = 2;
  for (const [word] of sorted) {
    if (idx > VOCAB_SIZE) break;
    window.wordIndex[word] = idx++;
  }
  window.vocabSize = idx;

  console.log(`[Tokeniser] Vocabulary built – ${window.vocabSize} tokens`);
}

// ─────────────────────────────────────────────
//  3. Encode a sentence to an integer sequence
// ─────────────────────────────────────────────
function encodeSequence(sentence) {
  const tokens = tokenize(sentence);
  return tokens.map(w => window.wordIndex[w] || window.wordIndex[OOV_TOKEN]);
}

// ─────────────────────────────────────────────
//  4. Pad / truncate a sequence to MAX_SEQ_LEN  (pre-padding with zeros)
// ─────────────────────────────────────────────
function padSequence(seq) {
  if (seq.length >= MAX_SEQ_LEN) return seq.slice(seq.length - MAX_SEQ_LEN);
  const pad = new Array(MAX_SEQ_LEN - seq.length).fill(0);
  return [...pad, ...seq];
}

// ─────────────────────────────────────────────
//  5. Prepare full dataset tensors  X → [N, MAX_SEQ_LEN],  y → [N]
// ─────────────────────────────────────────────
function prepareDataset(sentences, labels) {
  buildVocab(sentences);

  const xs = sentences.map(s => padSequence(encodeSequence(s)));
  const xsTensor = tf.tensor2d(xs, [xs.length, MAX_SEQ_LEN], "int32");
  const ysTensor = tf.tensor1d(labels, "float32");
  return { xsTensor, ysTensor };
}

// ─────────────────────────────────────────────
//  6. Encode a single user sentence → tensor ready for model.predict
// ─────────────────────────────────────────────
function encodeUserInput(sentence) {
  const seq = padSequence(encodeSequence(sentence));
  return tf.tensor2d([seq], [1, MAX_SEQ_LEN], "int32");
}

// ─────────────────────────────────────────────
//  7. Run prediction and return { label, confidence }
// ─────────────────────────────────────────────
async function predict(model, sentence) {
  if (!model) throw new Error("Model is not trained yet.");

  const inputTensor = encodeUserInput(sentence);
  const outputTensor = model.predict(inputTensor);
  const score = (await outputTensor.data())[0];

  inputTensor.dispose();
  outputTensor.dispose();

  const label      = score >= 0.5 ? "Positive 😊" : "Negative 😞";
  const confidence = score >= 0.5 ? score : 1 - score;
  return { label, confidence: (confidence * 100).toFixed(2), rawScore: score };
}

// ─────────────────────────────────────────────
//  Expose utilities globally
// ─────────────────────────────────────────────
window.SentimentUtils = {
  VOCAB_SIZE,
  MAX_SEQ_LEN,
  prepareDataset,
  encodeUserInput,
  predict
};

console.log("[Sentiment.js] Loaded ✔");
