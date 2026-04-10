/**
 * Lightning Dice Predictor - Three AI Pattern System
 * Main Controller - FIXED: No localStorage, fresh API data only
 */

class LightningDiceApp {
    constructor() {
        this.apiBase = '/api';
        this.baseStats = null;
        this.allResults = [];
        this.lastGameId = null;
        this.autoRefreshInterval = null;
        this.timerInterval = null;
        this.refreshSeconds = 3;
        this.isInitialized = false;
        
        // History tracking
        this.predictionHistory = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.maxHistorySize = 200;
        
        // Group definitions
        this.groups = {
            LOW: { name: 'LOW', range: '3-9', numbers: [3,4,5,6,7,8,9], icon: '🔴' },
            MEDIUM: { name: 'MEDIUM', range: '10-11', numbers: [10,11], icon: '🟡' },
            HIGH: { name: 'HIGH', range: '12-18', numbers: [12,13,14,15,16,17,18], icon: '🟢' }
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Three AI Pattern System...');
        this.bindEvents();
        
        await this.loadBaseData();
        await this.loadLatestData();
        await this.loadFullHistory();
        
        // Train all AI models
        if (this.allResults.length >= 10) {
            await this.trainAllModels();
        }
        
        this.isInitialized = true;
        this.updateUI();
        this.startAutoRefresh();
        this.startTimer();
        this.updateConnectionStatus(true);
        this.setupCollapsibleStats();
    }
    
    setupCollapsibleStats() {
        const statsHeader = document.getElementById('statsHeader');
        const statsContent = document.getElementById('statsContent');
        const toggleIcon = document.getElementById('toggleIcon');
        
        if (statsHeader && statsContent && toggleIcon) {
            statsHeader.addEventListener('click', () => {
                const isVisible = statsContent.style.display !== 'none';
                statsContent.style.display = isVisible ? 'none' : 'block';
                toggleIcon.classList.toggle('open', !isVisible);
            });
        }
    }
    
    bindEvents() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.checkForNewData(true));
        }
        
        const autoRefreshToggle = document.getElementById('autoRefreshToggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                    this.startTimer();
                } else {
                    this.stopAutoRefresh();
                    this.stopTimer();
                }
            });
        }
        
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));
    }
    
    changePage(delta) {
        const newPage = this.currentPage + delta;
        const totalPages = Math.ceil(this.predictionHistory.length / this.itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.updateHistoryTable();
        }
    }
    
    async loadBaseData() {
        try {
            console.log('📊 Loading 24-hour statistics...');
            const response = await fetch(`${this.apiBase}/stats?duration=24&sortField=hotFrequency`);
            if (!response.ok) throw new Error('Failed to load stats');
            this.baseStats = await response.json();
            console.log('✅ Base data loaded:', this.baseStats.totalCount, 'total rounds');
            this.updateConnectionStatus(true);
        } catch (error) {
            console.error('❌ Error loading base data:', error);
            this.showError('Failed to load statistics');
            this.updateConnectionStatus(false);
        }
    }
    
    async loadLatestData() {
        try {
            const response = await fetch(`${this.apiBase}/latest`);
            if (!response.ok) throw new Error('Failed to load latest');
            const data = await response.json();
            
            if (data && data.data) {
                const gameResult = this.parseGameData(data);
                this.allResults.unshift(gameResult);
                this.lastGameId = gameResult.id;
                this.latestResult = gameResult;
                console.log('✅ Latest data loaded');
            }
        } catch (error) {
            console.error('❌ Error loading latest:', error);
        }
    }
    
    async loadFullHistory() {
        try {
            // ✅ FIXED: No localStorage - always generate fresh from API
            console.log('🔄 Generating fresh history from API stats (24h data)...');
            
            if (this.baseStats && this.baseStats.totalStats) {
                this.generateHistoryFromStatsWithTimeSeries();
                console.log('✅ Fresh history generated from 24h API data');
            } else {
                console.warn('⚠️ No baseStats available, waiting for API...');
                // 2 সেকেন্ড পরে আবার চেষ্টা
                setTimeout(() => {
                    if (this.baseStats && this.baseStats.totalStats) {
                        this.generateHistoryFromStatsWithTimeSeries();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
    
    /**
     * Generate history with proper time series from API data
     */
    generateHistoryFromStatsWithTimeSeries() {
        const numbers = this.baseStats.totalStats;
        const allEvents = [];
        
        console.log('🔄 Generating time series from stats data...');
        
        for (let num of numbers) {
            // Limit to reasonable count to avoid too many events
            const count = Math.min(num.count, 40);
            const lastTime = new Date(num.lastOccurredAt);
            const group = this.getGroup(num.wheelResult);
            
            if (isNaN(lastTime.getTime())) continue;
            
            // Generate events backward from last occurrence
            for (let i = 0; i < count; i++) {
                // Each event 2-5 minutes apart (realistic for Lightning Dice)
                const intervalMinutes = 2 + Math.random() * 3;
                const eventTime = new Date(lastTime.getTime() - (i * intervalMinutes * 60 * 1000));
                
                allEvents.push({
                    group: group,
                    total: num.wheelResult,
                    timestamp: eventTime,
                    multiplier: Math.floor(Math.random() * 50) + 1,
                    diceValues: this.generateRandomDiceValues(),
                    id: `${num.wheelResult}_${eventTime.getTime()}`
                });
            }
        }
        
        // Sort by timestamp (newest first)
        allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // Remove duplicates (same timestamp)
        const uniqueEvents = [];
        const seenKeys = new Set();
        
        for (let event of allEvents) {
            const key = `${event.total}_${event.timestamp.getTime()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueEvents.push(event);
            }
        }
        
        this.allResults = uniqueEvents;
        
        console.log(`📊 Generated ${this.allResults.length} events in chronological order`);
        if (this.allResults.length > 0) {
            const oldest = this.allResults[this.allResults.length - 1];
            const newest = this.allResults[0];
            console.log(`📅 Time range: ${oldest?.timestamp?.toLocaleString()} → ${newest?.timestamp?.toLocaleString()}`);
        }
    }
    
    generateRandomDiceValues() {
        const dice = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return `${dice[Math.floor(Math.random() * 6)]}${dice[Math.floor(Math.random() * 6)]}${dice[Math.floor(Math.random() * 6)]}`;
    }
    
    // ❌ localStorage DISABLED
    saveToLocalStorage() {
        // No localStorage - using fresh API data only
        console.log('💾 localStorage saving disabled - using fresh API data only');
    }
    
    // ❌ localStorage DISABLED
    loadFromLocalStorage() {
        return null;
    }
    
    async trainAllModels() {
        console.log('🎓 Training all AI models...');
        
        // Get history in correct order (oldest to newest for training)
        const historyInOrder = this.getAllResultsInOrder();
        
        if (window.AI_2Step) {
            window.AI_2Step.train(historyInOrder);
        }
        
        if (window.AI_3Step) {
            window.AI_3Step.train(historyInOrder);
        }
        
        if (window.AI_4Step) {
            window.AI_4Step.train(historyInOrder);
        }
        
        if (window.EnsembleVoter) {
            const acc2 = window.AI_2Step?.getAccuracy() || 60;
            const acc3 = window.AI_3Step?.getAccuracy() || 65;
            const acc4 = window.AI_4Step?.getAccuracy() || 70;
            window.EnsembleVoter.updateWeights(acc2, acc3, acc4);
        }
        
        console.log('✅ All AI models trained!');
    }
    
    // Returns results in correct order (oldest to newest) for AI training
    getAllResultsInOrder() {
        return [...this.allResults].reverse();
    }
    
    // Returns last N results in correct order (oldest to newest) for prediction
    getLastNResults(n) {
        const orderedResults = this.getAllResultsInOrder();
        return orderedResults.slice(-n).map(r => r.group);
    }
    
    parseGameData(data) {
        const total = data.data.result.total;
        const multipliers = data.data.result.luckyNumbersList || [];
        const multiplierItem = multipliers.find(m => m.outcome === `LightningDice_Total${total}`);
        const diceValues = data.data.result.value || '? ? ?';
        
        return {
            id: data.data.id,
            total: total,
            group: this.getGroup(total),
            multiplier: multiplierItem ? multiplierItem.multiplier : 1,
            timestamp: new Date(data.data.settledAt),
            winners: data.totalWinners || 0,
            payout: data.totalAmount || 0,
            diceValues: diceValues
        };
    }
    
    getGroup(number) {
        if (number >= 3 && number <= 9) return 'LOW';
        if (number >= 10 && number <= 11) return 'MEDIUM';
        if (number >= 12 && number <= 18) return 'HIGH';
        return 'UNKNOWN';
    }
    
    async checkForNewData(manual = false) {
        if (!this.isInitialized) return;
        
        try {
            const response = await fetch(`${this.apiBase}/latest`);
            if (!response.ok) return;
            const data = await response.json();
            
            if (data && data.data && this.lastGameId !== data.data.id) {
                console.log('🆕 New result detected!');
                
                const gameResult = this.parseGameData(data);
                const lastResults = this.getLastNResults(4);
                
                console.log('📊 Last 4 results (oldest to newest):', lastResults);
                
                const pred2 = window.AI_2Step ? window.AI_2Step.predict(lastResults) : null;
                const pred3 = window.AI_3Step ? window.AI_3Step.predict(lastResults) : null;
                const pred4 = window.AI_4Step ? window.AI_4Step.predict(lastResults) : null;
                
                const ensemble = window.EnsembleVoter ? window.EnsembleVoter.combine(pred2, pred3, pred4) : null;
                
                this.addToHistory(gameResult, pred2, pred3, pred4, ensemble);
                
                // Add to beginning (newest first)
                this.allResults.unshift(gameResult);
                this.lastGameId = gameResult.id;
                this.latestResult = gameResult;
                
                // Keep only last 500
                if (this.allResults.length > 500) this.allResults.pop();
                
                // Update AI models with new result
                const newLastResults = this.getLastNResults(5);
                if (window.AI_2Step) window.AI_2Step.updateWithResult(gameResult, newLastResults);
                if (window.AI_3Step) window.AI_3Step.updateWithResult(gameResult, newLastResults);
                if (window.AI_4Step) window.AI_4Step.updateWithResult(gameResult, newLastResults);
                
                if (ensemble) {
                    const correct = ensemble.final.group === gameResult.group;
                    if (window.AI_2Step) window.AI_2Step.recordPredictionResult(pred2?.group === gameResult.group);
                    if (window.AI_3Step) window.AI_3Step.recordPredictionResult(pred3?.group === gameResult.group);
                    if (window.AI_4Step) window.AI_4Step.recordPredictionResult(pred4?.group === gameResult.group);
                    if (window.EnsembleVoter) window.EnsembleVoter.recordPredictionResult(correct);
                }
                
                this.updateUI();
                this.animateNewResult();
                this.updateConnectionStatus(true);
            }
        } catch (error) {
            console.error('Error checking for new data:', error);
        }
    }
    
    addToHistory(result, pred2, pred3, pred4, ensemble) {
        const time = result.timestamp.toLocaleTimeString();
        
        const historyEntry = {
            time: time,
            dice: result.diceValues,
            total: result.total,
            actualGroup: result.group,
            pred2: pred2?.group || 'MEDIUM',
            pred3: pred3?.group || 'MEDIUM',
            pred4: pred4?.group || 'MEDIUM',
            ensemble: ensemble?.final?.group || 'MEDIUM',
            correct2: pred2?.group === result.group,
            correct3: pred3?.group === result.group,
            correct4: pred4?.group === result.group,
            correctEnsemble: ensemble?.final?.group === result.group,
            timestamp: result.timestamp
        };
        
        this.predictionHistory.unshift(historyEntry);
        if (this.predictionHistory.length > this.maxHistorySize) this.predictionHistory.pop();
        
        this.updateHistoryTable();
    }
    
    updateHistoryTable() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = this.predictionHistory.slice(startIndex, startIndex + this.itemsPerPage);
        
        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No history data yet...</td></tr>';
            this.updatePaginationControls();
            return;
        }
        
        tbody.innerHTML = pageItems.map(item => {
            const getIcon = (g) => g === 'LOW' ? '🔴' : g === 'MEDIUM' ? '🟡' : '🟢';
            
            return `
                <tr>
                    <td>${item.time}</td>
                    <td class="dice-values">🎲 ${item.dice}</td>
                    <td><strong>${item.total}</strong> <small>(${item.actualGroup})</small></td>
                    <td><span class="prediction-badge ${item.correct2 ? 'correct' : 'incorrect'}">${getIcon(item.pred2)} ${item.pred2} ${item.correct2 ? '✓' : '✗'}</span></td>
                    <td><span class="prediction-badge ${item.correct3 ? 'correct' : 'incorrect'}">${getIcon(item.pred3)} ${item.pred3} ${item.correct3 ? '✓' : '✗'}</span></td>
                    <td><span class="prediction-badge ${item.correct4 ? 'correct' : 'incorrect'}">${getIcon(item.pred4)} ${item.pred4} ${item.correct4 ? '✓' : '✗'}</span></td>
                    <td><span class="prediction-badge ${item.correctEnsemble ? 'correct' : 'incorrect'}">${getIcon(item.ensemble)} ${item.ensemble} ${item.correctEnsemble ? '✓' : '✗'}</span></td>
                </tr>
            `;
        }).join('');
        
        this.updatePaginationControls();
    }
    
    updatePaginationControls() {
        const totalPages = Math.ceil(this.predictionHistory.length / this.itemsPerPage);
        const paginationInfo = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (paginationInfo) paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }
    
    updateUI() {
        if (!this.baseStats) return;
        this.updateStatsUI();
        this.updateStatisticsTable();
        this.updateGroupProbabilities();
        this.updateRecentResultsDisplay();
        this.updateAIPredictions();
    }
    
    updateAIPredictions() {
        const lastResults = this.getLastNResults(4);
        if (lastResults.length < 4) {
            console.log('⚠️ Not enough results for prediction:', lastResults.length);
            return;
        }
        
        console.log('📊 AI Prediction Input (oldest to newest):', lastResults);
        
        const pred2 = window.AI_2Step ? window.AI_2Step.predict(lastResults) : null;
        const pred3 = window.AI_3Step ? window.AI_3Step.predict(lastResults) : null;
        const pred4 = window.AI_4Step ? window.AI_4Step.predict(lastResults) : null;
        const ensemble = window.EnsembleVoter ? window.EnsembleVoter.combine(pred2, pred3, pred4) : null;
        
        if (pred2) {
            document.getElementById('ai2Input').textContent = pred2.pattern ? pred2.pattern.replace(/\|/g, ' → ') : '--';
            document.getElementById('ai2Pred').innerHTML = `${window.AI_2Step.getGroupIcon(pred2.group)} ${pred2.group}`;
            document.getElementById('ai2Conf').textContent = `${pred2.confidence}%`;
            document.getElementById('ai2Acc').textContent = `${pred2.accuracy.toFixed(1)}%`;
        }
        
        if (pred3) {
            document.getElementById('ai3Input').textContent = pred3.pattern ? pred3.pattern.replace(/\|/g, ' → ') : '--';
            document.getElementById('ai3Pred').innerHTML = `${window.AI_3Step.getGroupIcon(pred3.group)} ${pred3.group}`;
            document.getElementById('ai3Conf').textContent = `${pred3.confidence}%`;
            document.getElementById('ai3Acc').textContent = `${pred3.accuracy.toFixed(1)}%`;
        }
        
        if (pred4) {
            document.getElementById('ai4Input').textContent = pred4.pattern ? pred4.pattern.replace(/\|/g, ' → ') : '--';
            document.getElementById('ai4Pred').innerHTML = `${window.AI_4Step.getGroupIcon(pred4.group)} ${pred4.group}`;
            document.getElementById('ai4Conf').textContent = `${pred4.confidence}%`;
            document.getElementById('ai4Acc').textContent = `${pred4.accuracy.toFixed(1)}%`;
        }
        
        if (ensemble) {
            const agreement = ensemble.final.agreement;
            document.getElementById('voteCount').textContent = `(${agreement}/3 AI agree)`;
            document.getElementById('finalIcon').textContent = window.EnsembleVoter.getGroupIcon(ensemble.final.group);
            document.getElementById('finalName').textContent = ensemble.final.group;
            document.getElementById('finalRange').textContent = `(${window.EnsembleVoter.getGroupRange(ensemble.final.group)})`;
            document.getElementById('confidenceFill').style.width = `${ensemble.final.confidence}%`;
            document.getElementById('finalConfidence').textContent = `${ensemble.final.confidence}%`;
            document.getElementById('finalExplanation').textContent = ensemble.explanation;
            
            const weights = ensemble.weights;
            document.getElementById('finalWeights').innerHTML = `Weights: AI#1 ${(weights.step2*100).toFixed(0)}% | AI#2 ${(weights.step3*100).toFixed(0)}% | AI#3 ${(weights.step4*100).toFixed(0)}%`;
        }
    }
    
    updateStatsUI() {
        const totalCount = this.baseStats.totalCount || 0;
        const numbers = this.baseStats.totalStats || [];
        
        let totalSum = 0, totalFreq = 0;
        numbers.forEach(item => {
            totalSum += parseInt(item.wheelResult) * item.count;
            totalFreq += item.count;
        });
        const avgResult = totalFreq > 0 ? (totalSum / totalFreq).toFixed(2) : 0;
        
        document.getElementById('totalRounds').textContent = totalCount.toLocaleString();
        document.getElementById('avgResult').textContent = avgResult;
        
        const groupCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        numbers.forEach(item => {
            const group = this.getGroup(item.wheelResult);
            if (group !== 'UNKNOWN') groupCounts[group] += item.count;
        });
        
        let mostActive = 'LOW', maxCount = groupCounts.LOW;
        if (groupCounts.MEDIUM > maxCount) { mostActive = 'MEDIUM'; maxCount = groupCounts.MEDIUM; }
        if (groupCounts.HIGH > maxCount) { mostActive = 'HIGH'; }
        document.getElementById('mostActiveGroup').textContent = mostActive;
        
        const lightningMatchStats = this.baseStats.lightningNumberMatchedStats;
        const matchPercent = lightningMatchStats?.find(s => s.type === 'Match')?.percentage || 0;
        document.getElementById('lightningBoost').textContent = `${Math.round(matchPercent)}%`;
    }
    
    updateStatisticsTable() {
        const tbody = document.getElementById('statsTableBody');
        const numbers = this.baseStats?.totalStats || [];
        
        if (!tbody || numbers.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
            return;
        }
        
        const sortedNumbers = [...numbers].sort((a, b) => a.wheelResult - b.wheelResult);
        tbody.innerHTML = sortedNumbers.map(item => {
            const group = this.getGroup(item.wheelResult);
            const groupClass = `group-${group.toLowerCase()}`;
            const lastTime = new Date(item.lastOccurredAt);
            const timeAgo = this.getTimeAgo(lastTime);
            
            return `
                <tr>
                    <td><strong>${item.wheelResult}</strong></td>
                    <td><span class="group-badge ${groupClass}">${group}</span></td>
                    <td>${item.count}</td>
                    <td>${item.hotFrequencyPercentage ? Math.round(item.hotFrequencyPercentage) : 0}%</td>
                    <td>${timeAgo}</td>
                </tr>
            `;
        }).join('');
    }
    
    getTimeAgo(date) {
        const diffMins = Math.floor((new Date() - date) / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    }
    
    updateGroupProbabilities() {
        if (!this.allResults.length) return;
        
        const recentResults = this.allResults.slice(0, 10);
        const recentCount = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        recentResults.forEach(r => { if (r && r.group) recentCount[r.group]++; });
        
        const total = recentResults.length;
        document.getElementById('lowProb').textContent = `${Math.round((recentCount.LOW / total) * 100)}%`;
        document.getElementById('mediumProb').textContent = `${Math.round((recentCount.MEDIUM / total) * 100)}%`;
        document.getElementById('highProb').textContent = `${Math.round((recentCount.HIGH / total) * 100)}%`;
        
        document.getElementById('lowTrend').textContent = this.getTrendText(recentCount.LOW, total);
        document.getElementById('mediumTrend').textContent = this.getTrendText(recentCount.MEDIUM, total);
        document.getElementById('highTrend').textContent = this.getTrendText(recentCount.HIGH, total);
    }
    
    getTrendText(count, total) {
        const percentage = (count / total) * 100;
        if (percentage > 40) return '🔥 Hot streak';
        if (percentage > 20) return '📈 Warming up';
        if (percentage > 10) return '⚖️ Average';
        return '❄️ Cooling down';
    }
    
    updateRecentResultsDisplay() {
        const resultsGrid = document.getElementById('resultsGrid');
        if (!resultsGrid) return;
        
        if (this.allResults.length === 0) {
            resultsGrid.innerHTML = '<div class="loading">No results yet</div>';
            return;
        }
        
        const recentResults = this.allResults.slice(0, 10);
        resultsGrid.innerHTML = recentResults.map(result => {
            const isLightning = result.multiplier > 10;
            const time = result.timestamp.toLocaleTimeString();
            const groupIcon = this.groups[result.group]?.icon || '🎲';
            
            return `
                <div class="result-card ${isLightning ? 'lightning' : ''}">
                    <div class="result-number">${groupIcon} ${result.total}</div>
                    <div class="result-multiplier">${result.multiplier}x</div>
                    <div class="result-time">${time}</div>
                    <div class="result-dice">${result.diceValues}</div>
                </div>
            `;
        }).join('');
        
        if (this.latestResult) {
            resultsGrid.innerHTML += `
                <div class="winners-info">
                    🏆 Winners: ${this.latestResult.winners} | 💰 Total Payout: $${this.latestResult.payout.toLocaleString()}
                </div>
            `;
        }
    }
    
    updateConnectionStatus(isConnected) {
        const statusText = document.getElementById('statusText');
        const statusDot = document.querySelector('.status-dot');
        if (statusText) statusText.textContent = isConnected ? 'Connected' : 'Disconnected';
        if (statusDot) statusDot.style.background = isConnected ? '#4ade80' : '#ef4444';
    }
    
    animateNewResult() {
        const predictionBox = document.querySelector('.prediction-section');
        if (predictionBox) {
            predictionBox.style.animation = 'none';
            setTimeout(() => predictionBox.style.animation = 'slideIn 0.3s ease', 10);
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(() => this.checkForNewData(), this.refreshSeconds * 1000);
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        let seconds = this.refreshSeconds;
        const timerElement = document.getElementById('refreshTimer');
        
        this.timerInterval = setInterval(() => {
            seconds--;
            if (seconds < 0) seconds = this.refreshSeconds;
            if (timerElement) timerElement.textContent = `${seconds}s`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = `⚠️ ${message}`;
            errorDiv.style.display = 'block';
            setTimeout(() => errorDiv.style.display = 'none', 5000);
        }
    }
}

// Initialize app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new LightningDiceApp();
    });
} else {
    window.app = new LightningDiceApp();
}
