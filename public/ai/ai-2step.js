/**
 * AI #1 - 2-Step Pattern Recognition Model
 * Learns from 9 possible patterns (3x3)
 * FIXED: Predict function now receives results in correct order (oldest to newest)
 */

class AI_2Step {
    constructor() {
        this.name = "AI-2Step";
        this.version = "1.0";
        this.groups = ['LOW', 'MEDIUM', 'HIGH'];
        
        // Pattern database: 9 patterns
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
        console.log('🤖 AI #1 (2-Step) Initializing...');
        this.initializePatterns();
        this.loadFromStorage();
    }
    
    initializePatterns() {
        for (let g1 of this.groups) {
            for (let g2 of this.groups) {
                const key = `${g1}|${g2}`;
                this.patterns[key] = {
                    count: 0,
                    outcomes: { LOW: 0, MEDIUM: 0, HIGH: 0 },
                    lastUpdated: null
                };
            }
        }
        console.log('✅ AI #1: 9 patterns initialized');
    }
    
    train(history) {
        if (!history || history.length < 3) {
            console.log(`⚠️ AI #1: Need at least 3 results, have ${history?.length || 0}`);
            return false;
        }
        
        console.log(`📚 AI #1: Training with ${history.length} results...`);
        
        this.resetPatterns();
        
        // history comes as oldest to newest
        for (let i = 2; i < history.length; i++) {
            const g1 = history[i-2].group;
            const g2 = history[i-1].group;
            const outcome = history[i].group;
            
            const key = `${g1}|${g2}`;
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
        if (!lastResults || lastResults.length < 2) {
            return this.getDefaultPrediction();
        }
        
        // Take the last 2 results (most recent two)
        const recent2 = lastResults.slice(-2);
        const g1 = recent2[0];
        const g2 = recent2[1];
        const key = `${g1}|${g2}`;
        
        console.log(`🔍 AI #1: Pattern = ${key}`);
        
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
        if (lastResults.length >= 2) {
            const recent2 = lastResults.slice(-2);
            const g1 = recent2[0];
            const g2 = recent2[1];
            const key = `${g1}|${g2}`;
            
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
            localStorage.setItem('ai_2step_data', JSON.stringify(data));
        } catch(e) { console.warn('Save failed:', e); }
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('ai_2step_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.patterns = data.patterns || this.patterns;
                this.totalPredictions = data.totalPredictions || 0;
                this.correctPredictions = data.correctPredictions || 0;
                this.accuracy = data.accuracy || 0;
                console.log(`✅ AI #1: Loaded from storage (${this.totalPredictions} predictions, ${this.accuracy.toFixed(1)}% accuracy)`);
            }
        } catch(e) { console.warn('Load failed:', e); }
    }
    
    printStats() {
        let patternCount = 0;
        for (let key in this.patterns) {
            if (this.patterns[key].count > 0) patternCount++;
        }
        console.log(`📊 AI #1: ${patternCount}/9 patterns seen, Accuracy: ${this.accuracy.toFixed(1)}%`);
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
window.AI_2Step = new AI_2Step();
