let positiveWords = {};
let negativeWords = {};
let totalPos = 0;
let totalNeg = 0;
let chart;

// Load dataset automatically
fetch('data.txt')
    .then(response => response.text())
    .then(data => trainModel(data));

function trainModel(data) {

    let lines = data.split("\n");

    lines.forEach(line => {

        let parts = line.split(",");
        if (parts.length < 2) return;

        let label = parts[0].trim().toLowerCase();
        let text = parts[1].toLowerCase();

        let words = text.split(" ");

        words.forEach(word => {

            word = word.replace(/[^a-z]/g, "");

            if (!word) return;

            if (label === "positive") {
                positiveWords[word] = (positiveWords[word] || 0) + 1;
                totalPos++;
            } 
            else if (label === "negative") {
                negativeWords[word] = (negativeWords[word] || 0) + 1;
                totalNeg++;
            }
        });
    });

    document.getElementById("status").innerText =
        "Model trained successfully from dataset ✅";
}

function predict() {

    let text = document.getElementById("inputText").value.toLowerCase();
    if (!text.trim()) return alert("Enter sentence first.");

    let words = text.split(" ");

    let posScore = 0;
    let negScore = 0;

    words.forEach(word => {

        word = word.replace(/[^a-z]/g, "");

        if (positiveWords[word])
            posScore += positiveWords[word] / totalPos;

        if (negativeWords[word])
            negScore += negativeWords[word] / totalNeg;
    });

    if (posScore === 0 && negScore === 0) {
        posScore = negScore = 0.5;
    }

    let total = posScore + negScore;

    let posProb = (posScore / total * 100).toFixed(2);
    let negProb = (negScore / total * 100).toFixed(2);

    let result = posProb > negProb ? "POSITIVE 😊" : "NEGATIVE 😞";

    document.getElementById("predictionResult").innerText =
        "Prediction: " + result;

    updateChart(posProb, negProb);
}

function updateChart(pos, neg) {

    let ctx = document.getElementById('probChart').getContext('2d');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Positive', 'Negative'],
            datasets: [{
                label: 'Probability (%)',
                data: [pos, neg],
                backgroundColor: [
                    '#00c853',
                    '#d50000'
                ]
            }]
        },
        options: {
            animation: { duration: 800 },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}