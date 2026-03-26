// Dataset Generator Module - Simplified & Working
const datasetGenerator = {
    config: {
        imagesPerClass: 30,
        validationPerClass: 10,
        categories: ['bike', 'truck', 'car', 'bus']
    },

    datasets: {
        phase1: { categories: [], images: {}, loaded: false },
        phase2: { categories: [], images: {}, loaded: false }
    },

    async initPhase1() {
        addLog('[Dataset] Initializing Phase 1...');
        this.datasets.phase1.categories = ['bike', 'truck', 'car'];
        this.datasets.phase1.loaded = true;
        addLog('[Dataset] Phase 1 ready: 3 classes (Bike, Truck, Car)');
        return true;
    },

    async generateDataset(phase) {
        addLog(`[Dataset] Generating ${phase} dataset...`);
        const dataset = this.datasets[phase];
        const categories = phase === 'phase1' ? ['bike', 'truck', 'car'] : ['bike', 'truck', 'car', 'bus'];

        // Create mock dataset
        const training = [];
        const validation = [];

        for (let cat of categories) {
            for (let i = 0; i < this.config.imagesPerClass; i++) {
                training.push({ url: `mock:${cat}:${i}`, label: cat, category: cat });
            }
            for (let i = 0; i < this.config.validationPerClass; i++) {
                validation.push({ url: `mock:${cat}:val:${i}`, label: cat, category: cat });
            }
        }

        addLog(`[Dataset] Created ${categories.length} categories`);
        addLog(`[Dataset] Training: ${training.length} images, Validation: ${validation.length} images`);

        return { training, validation, categories };
    }
};
