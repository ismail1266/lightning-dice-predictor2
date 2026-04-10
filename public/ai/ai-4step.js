/**
 * AI #3 - 4-Step Pattern Recognition Model
 * Learns from 81 possible patterns (3x3x3x3)
 * FIXED: Predict function now receives results in correct order (oldest to newest)
 */

class AI_4Step {
    constructor() {
        this.name = "AI-4Step";
        this.version = "1.0";
        this.groups = ['LOW', 'MEDIUM', 'HIGH'];
        
        // Pattern database: 81 patterns
        this.patterns = {};
        
        // Performance tracking
        this.totalPredictions = 0;
        this.correctPredictions = 0;
        this.accuracy = 0;
        
        // Training status
        this.isTrained = false;
        
        this.init();
    }
    
    init() {
        console.log('🤖 AI #3 (4-Step) Initializing...');
        this.initializePatterns();
        this.loadFromStorage();
    }
    
    initializePatterns() {
        for (let g1 of this.groups) {
            for (let g2 of this.groups) {
                for (let g3 of this.groups) {
                    for (let g4 of this.groups) {
                        const key = `${g1}|${g2}|${g3}|${g4}`;
                        this.patterns[key] = {
                            count: 0,
                            outcomes: { LOW: 0, MEDIUM: 0, HIGH: 0 },
                            lastUpdated: null
                        };
                    }
                }
            }
        }
        console.log('✅ AI #3: 81 patterns initialized');
    }
    
    train(history) {
        if (!history || history.length < 5) {
            console.log(`⚠️ AI #3: Need at least 5 results, have ${history?.length || 0}`);
            return false;
        }
        
        console.log(`📚 AI #3: Training with ${history.length} results...`);
        
        this.resetPatterns();
        
        // history comes as oldest to newest
        for (let i = 4; i < history.length; i++) {
            const g1 = history[i-4].group;
            const g2 = history[i-3].group;
            const g3 = history[i-2].group;
            const g4 = history[i-1].group;
            const outcome = history[i].group;
            
            const key = `${g1}|${g2}|${g3}|${g4}`;
            if (this.patterns[key]) {
                this.patterns[key].count++;
                this.patterns[key].outcomes[outcome]++;
                this.patterns[key].lastUpdated = new Date();
            }
        }
        
        this.isTrained = true;
        this.saveToStorage();
        this.printStats();
        
        return true;
    }
    
    resetPatterns() {
        for (let key in this.patterns) {
            this.patterns[key].count = 0;
            this.patterns[key].outcomes = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        }
    }
    
    // ✅ FIXED: predict function - lastResults comes as [oldest, ..., newest]
    predict(lastResults) {
        if (!lastResults || lastResults.length < 4) {
            return this.getDefaultPrediction();
        }
        
        // Take the last 4 results (most recent four)
        const recent4 = lastResults.slice(-4);
        const g1 = recent4[0];
        const g2 = recent4[1];
        const g3 = recent4[2];
        const g4 = recent4[3];
        const key = `${g1}|${g2}|${g3}|${g4}`;
        
        console.log(`🔍 AI #3: Pattern = ${key}`);
        
        const pattern = this.patterns[key];
        
        if (!pattern || pattern.count === 0) {
            return this.getDefaultPrediction();
        }
        
        const total = pattern.count;
        const probabilities = {
            LOW: (pattern.outcomes.LOW / total) * 100,
            MEDIUM: (pattern.outcomes.MEDIUM / total) * 100,
            HIGH: (pattern.outcomes.HIGH / total) * 100
        };
        
        let bestGroup = 'MEDIUM';
        let bestProb = 0;
        for (let [group, prob] of Object.entries(probabilities)) {
            if (prob > bestProb) {
                bestProb = prob;
                bestGroup = group;
            }
        }
        
        return {
            model: this.name,
            group: bestGroup,
            probabilities: probabilities,
            confidence: Math.round(bestProb),
            pattern: key,
            patternCount: total,
            accuracy: this.accuracy
        };
    }
    
    getDefaultPrediction() {
        return {
            model: this.name,
            group: 'MEDIUM',
            probabilities: { LOW: 33, MEDIUM: 34, HIGH: 33 },
            confidence: 34,
            pattern: null,
            patternCount: 0,
            accuracy: this.accuracy
        };
    }
    
    updateWithResult(result, lastResults) {
        if (lastResults.length >= 4) {
            const recent4 = lastResults.slice(-4);
            const g1 = recent4[0];
            const g2 = recent4[1];
            const g3 = recent4[2];
            const g4 = recent4[3];
            const key = `${g1}|${g2}|${g3}|${g4}`;
            
            if (this.patterns[key]) {
                this.patterns[key].count++;
                this.patterns[key].outcomes[result.group]++;
                this.patterns[key].lastUpdated = new Date();
            }
        }
        
        this.saveToStorage();
    }
    
    recordPredictionResult(correct) {
        this.totalPredictions++;
        if (correct) this.correctPredictions++;
        this.accuracy = (this.correctPredictions / this.totalPredictions) * 100;
        this.saveToStorage();
    }
    
    saveToStorage() {
        try {
            const data = {
                patterns: this.patterns,
                totalPredictions: this.totalPredictions,
                correctPredictions: this.correctPredictions,
                accuracy: this.accuracy
            };
            localStorage.setItem('ai_4step_data', JSON.stringify(data));
        } catch(e) { console.warn('Save failed:', e); }
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('ai_4step_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.patterns = data.patterns || this.patterns;
                this.totalPredictions = data.totalPredictions || 0;
                this.correctPredictions = data.correctPredictions || 0;
                this.accuracy = data.accuracy || 0;
                console.log(`✅ AI #3: Loaded from storage (${this.totalPredictions} predictions, ${this.accuracy.toFixed(1)}% accuracy)`);
            }
        } catch(e) { console.warn('Load failed:', e); }
    }
    
    printStats() {
        let patternCount = 0;
        for (let key in this.patterns) {
            if (this.patterns[key].count > 0) patternCount++;
        }
        console.log(`📊 AI #3: ${patternCount}/81 patterns seen, Accuracy: ${this.accuracy.toFixed(1)}%`);
    }
    
    getAccuracy() {
        return this.accuracy;
    }
    
    getGroupIcon(group) {
        if (group === 'LOW') return '🔴';
        if (group === 'MEDIUM') return '🟡';
        return '🟢';
    }
}

// Create global instance
window.AI_4Step = new AI_4Step();
