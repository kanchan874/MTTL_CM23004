# CO3 Practical: Image Classification using Pre-trained MobileNet

## Objective
Apply a pre-trained machine learning model (MobileNet) to perform standard image classification in a browser-based environment using TensorFlow.js. Retrieve and display the top-3 predictions and probability scores for user-uploaded images, and discuss the architectural and performance contrast compared to another model such as ResNet50.

## Project Structure
- `index.html`: The HTML structure of the project interface allowing file uploads and providing a model selection dropdown.
- `style.css`: Clean, beginner-friendly UI styles meant for a student assignment avoiding complex libraries.
- `script.js`: Uses `@tensorflow/tfjs` and the `@tensorflow-models/mobilenet` packages to process the image and extract the top-3 classifications cleanly. 
- `sample_images/`: A folder containing 5 example images (cat, dog, car, apple, mug) ready for quick testing.

## Implementation Steps
1. **Load TensorFlow.js**: Connects to the TensorFlow library via CDN.
2. **Load MobileNet**: Downloads the pre-trained MobileNet model weights into the browser memory natively.
3. **Upload Process**: Standard `<input type="file">` reads user selected images into the webpage UI dynamically using JavaScript `FileReader`.
4. **Prediction / Classification**: Uses `model.classify()` which parses pixel patterns and maps them to exactly 1000 categories from the ImageNet database. It automatically surfaces the TOP 3 highest-rated predictions.
5. **Comparison Logic**: Contains an approximation/simulation for "ResNet50" explicitly coded as a teaching moment to show how ResNet processes confidence differently. (True ResNet involves downloading a massive 100MB+ graph).

## Comparison: MobileNet vs ResNet50
For this practical assignment, here is the technical comparison between the models provided:

| Feature | MobileNet | ResNet50 |
|---------|-----------|----------|
| **Core Architecture** | Depthwise Separable Convolutions | Deep Residual Networks (Skip Connections) |
| **Model Size** | Very Small (~14 MB) | Large (~100 MB) |
| **Browser Execution Speed** | Very Fast (Optimized for Mobile/Web) | Slower |
| **Accuracy** | Good Baseline Accuracy | High Accuracy (Fewer wrong categorizations) |
| **Best Use Case** | Real-time browser/mobile webcam analysis | Server-side heavy medical/satellite image analysis |

> **Practical Simulation Note:** In this project, running a real ResNet50 in standard vanilla JavaScript will crash many student laptops because of RAM limits. Therefore, when ResNet50 is selected in the UI dropdown, the `script.js` file simulates variance in the model probabilities natively, so students can observe the comparison without heavy local downloads. 

## How to Test
1. Launch the `index.html` file using **Live Server** (VS Code) or `npx serve .`
2. Wait for the status indicator on screen to turn **GREEN** (Model successfully loaded!).
3. Upload any `.jpg` file from the `sample_images` folder.
4. Keep the model set to "MobileNet".
5. Click **Classify Image**.
6. View the Top 3 labeled outcomes along with their percentage confidence predictions! 
