/**
 * Ensemble Voting System
 * Combines predictions from all 3 AI models
 */

class EnsembleVoter {
    constructor() {
        this.name = "EnsembleVoter";
        this.version = "1.0";
        
        // Dynamic weights (can adjust based on accuracy)
        this.weights = {
            step2: 0.25,   // AI #1 weight
            step3: 0.35,   // AI #2 weight
            step4: 0.40    // AI #3 weight
        };
        
        // Default weights backup
        this.defaultWeights = { ...this.weights };
        
        // Performance tracking
        this.totalPredictions = 0;
        this.correctPredictions = 0;
        this.accuracy = 0;
        
        this.init();
    }
    
    init() {
        console.log('🏆 Ensemble Voter Initializing...');
        this.loadWeights();
    }
    
    combine(prediction2, prediction3, prediction4) {
        // Calculate weighted scores
        const scores = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        
        // AI #1 (2-Step)
        scores[prediction2.group] += prediction2.confidence * this.weights.step2;
        
        // AI #2 (3-Step)
        scores[prediction3.group] += prediction3.confidence * this.weights.step3;
        
        // AI #3 (4-Step)
        scores[prediction4.group] += prediction4.confidence * this.weights.step4;
        
        // Find winner
        let finalGroup = 'MEDIUM';
        let finalScore = 0;
        let voteCount = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        
        for (let [group, score] of Object.entries(scores)) {
            if (score > finalScore) {
                finalScore = score;
                finalGroup = group;
            }
        }
        
        // Count votes (which AI predicted what)
        voteCount[prediction2.group]++;
        voteCount[prediction3.group]++;
        voteCount[prediction4.group]++;
        
        const agreement = Math.max(...Object.values(voteCount));
        const finalConfidence = Math.min(95, Math.round(finalScore));
        
        // Generate explanation
        let explanation = '';
        if (agreement === 3) {
            explanation = `🎯 All 3 AI models agree on ${finalGroup}! High confidence prediction.`;
        } else if (agreement === 2) {
            explanation = `⚖️ ${agreement} out of 3 AI models predict ${finalGroup}. Ensemble weighted voting confirms.`;
        } else {
            explanation = `🔄 All AI models disagree. Weighted voting selects ${finalGroup}.`;
        }
        
        return {
            final: {
                group: finalGroup,
                confidence: finalConfidence,
                scores: scores,
                voteCount: voteCount,
                agreement: agreement
            },
            details: {
                ai2: prediction2,
                ai3: prediction3,
                ai4: prediction4
            },
            explanation: explanation,
            weights: this.weights
        };
    }
    
    updateWeights(accuracy2, accuracy3, accuracy4) {
        // Dynamic weight adjustment based on performance
        const total = accuracy2 + accuracy3 + accuracy4;
        if (total > 0) {
            this.weights.step2 = accuracy2 / total;
            this.weights.step3 = accuracy3 / total;
            this.weights.step4 = accuracy4 / total;
            
            // Normalize to ensure sum = 1
            const sum = this.weights.step2 + this.weights.step3 + this.weights.step4;
            this.weights.step2 /= sum;
            this.weights.step3 /= sum;
            this.weights.step4 /= sum;
            
            this.saveWeights();
            console.log(`📊 Ensemble weights updated: 2-Step:${(this.weights.step2*100).toFixed(0)}%, 3-Step:${(this.weights.step3*100).toFixed(0)}%, 4-Step:${(this.weights.step4*100).toFixed(0)}%`);
        }
    }
    
    resetWeights() {
        this.weights = { ...this.defaultWeights };
        this.saveWeights();
        console.log('🔄 Ensemble weights reset to default');
    }
    
    recordPredictionResult(correct) {
        this.totalPredictions++;
        if (correct) this.correctPredictions++;
        this.accuracy = (this.correctPredictions / this.totalPredictions) * 100;
    }
    
    saveWeights() {
        localStorage.setItem('ensemble_weights', JSON.stringify(this.weights));
    }
    
    loadWeights() {
        try {
            const saved = localStorage.getItem('ensemble_weights');
            if (saved) {
                this.weights = JSON.parse(saved);
                console.log('✅ Ensemble weights loaded from storage');
            }
        } catch(e) { console.warn('Load weights failed:', e); }
    }
    
    getAccuracy() {
        return this.accuracy;
    }
    
    getGroupIcon(group) {
        if (group === 'LOW') return '🔴';
        if (group === 'MEDIUM') return '🟡';
        return '🟢';
    }
    
    getGroupRange(group) {
        if (group === 'LOW') return '3-9';
        if (group === 'MEDIUM') return '10-11';
        return '12-18';
    }
}

// Create global instance
window.EnsembleVoter = new EnsembleVoter();
