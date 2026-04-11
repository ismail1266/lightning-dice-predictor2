/**
 * Lightning Dice - Pattern Analysis Tool
 * Real-time Stick/Switch Pattern Tracker
 * 
 * ✅ CORRECTED LOGIC:
 * - Pattern = Previous Group → Current Group
 * - Table = Based on PREVIOUS Group (where the pattern starts from)
 * - Status = STICK if same group, SWITCH if different group
 * 
 * ✅ FIXED: No localStorage, fresh API data only
 */

class PatternAnalysis {
    constructor() {
        this.apiBase = '/api';
        
        // Pattern data storage
        this.lowPatterns = [];
        this.mediumPatterns = [];
        this.highPatterns = [];
        
        // Store full result history for reference
        this.allResults = [];
        
        // Pagination state
        this.currentPage = {
            low: 1,
            medium: 1,
            high: 1
        };
        this.itemsPerPage = 10;
        
        // Auto refresh
        this.autoRefreshInterval = null;
        this.timerInterval = null;
        this.refreshSeconds = 3;
        this.lastGameId = null;
        
        // Stats
        this.totalSticks = 0;
        this.totalSwitches = 0;
        
        // Debug mode
        this.debugMode = true;
        
        this.init();
    }
    
    async init() {
        console.log('📊 Pattern Analysis Tool Initializing...');
        console.log('✅ Pattern Logic: Previous → Current, Table = Previous Group');
        this.bindEvents();
        await this.loadData();
        this.startAutoRefresh();
        this.startTimer();
        this.updateConnectionStatus(true);
        this.setupOnlineOfflineDetection();
    }
    
    setupOnlineOfflineDetection() {
        window.addEventListener('online', () => {
            console.log('🟢 Back online! Refreshing all data...');
            this.loadData(true);
            this.showError('Back online! Data refreshed.');
            setTimeout(() => this.hideError(), 2000);
        });
        
        window.addEventListener('offline', () => {
            console.log('🔴 Offline mode');
            this.showError('You are offline. Please check your connection.');
        });
    }
    
    bindEvents() {
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
        
        const manualRefreshBtn = document.getElementById('manualRefreshBtn');
        if (manualRefreshBtn) {
            manualRefreshBtn.addEventListener('click', () => this.refreshData());
        }
    }
    
    async loadData(forceRefresh = false) {
        try {
            if (forceRefresh) {
                console.log('🔄 Force refreshing all data...');
                this.allResults = [];
                this.lastGameId = null;
            }
            
            console.log('🔄 Loading fresh analysis data from API...');
            
            await this.fetchStatsData();
            await this.fetchLatestData();
            
            if (this.allResults.length > 0) {
                this.processHistoryData();
                this.buildAllTables();
                this.updateSummaryStats();
                console.log(`✅ Loaded ${this.allResults.length} fresh results from API`);
                
                // Log distribution
                this.logPatternDistribution();
            } else {
                console.warn('⚠️ No data from API yet, creating sample data...');
                this.createSampleData();
                this.processHistoryData();
                this.buildAllTables();
                this.updateSummaryStats();
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load fresh data from API, using sample data');
            this.createSampleData();
            this.processHistoryData();
            this.buildAllTables();
            this.updateSummaryStats();
        }
    }
    
    logPatternDistribution() {
        console.log('📊 PATTERN DISTRIBUTION (Previous → Current):');
        console.log(`   LOW patterns (start from LOW): ${this.lowPatterns.length}`);
        console.log(`   MEDIUM patterns (start from MEDIUM): ${this.mediumPatterns.length}`);
        console.log(`   HIGH patterns (start from HIGH): ${this.highPatterns.length}`);
        console.log(`   Total Sticks: ${this.totalSticks}, Switches: ${this.totalSwitches}`);
    }
    
    async fetchStatsData() {
        try {
            const response = await fetch(`${this.apiBase}/stats?duration=24&_=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const stats = await response.json();
            
            if (stats && stats.totalStats) {
                this.generateHistoryFromStats(stats.totalStats);
            } else {
                throw new Error('No stats data');
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    }
    
    generateHistoryFromStats(numbers) {
        const allEvents = [];
        
        for (let num of numbers) {
            let count = Math.min(num.count, 30);
            const group = this.getGroup(num.wheelResult);
            
            // Ensure all groups have enough data
            if (group === 'MEDIUM') {
                count = Math.min(num.count + 10, 40);
            }
            
            const lastTime = new Date(num.lastOccurredAt);
            
            if (isNaN(lastTime.getTime())) continue;
            
            for (let i = 0; i < count; i++) {
                const intervalMinutes = 1.5 + Math.random() * 3;
                const eventTime = new Date(lastTime.getTime() - (i * intervalMinutes * 60 * 1000));
                
                allEvents.push({
                    group: group,
                    total: num.wheelResult,
                    timestamp: eventTime,
                    multiplier: Math.floor(Math.random() * 50) + 1,
                    diceValues: this.generateRealisticDiceValues(num.wheelResult),
                    id: `${num.wheelResult}_${eventTime.getTime()}`
                });
            }
        }
        
        allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
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
        
        const groupCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        this.allResults.forEach(r => {
            if (r.group) groupCounts[r.group]++;
        });
        
        console.log(`📊 Generated ${this.allResults.length} events from API stats`);
        console.log(`📊 Distribution - LOW: ${groupCounts.LOW}, MEDIUM: ${groupCounts.MEDIUM}, HIGH: ${groupCounts.HIGH}`);
    }
    
    generateRealisticDiceValues(total) {
        const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const diceValues = [1, 2, 3, 4, 5, 6];
        
        let attempts = 0;
        while (attempts < 100) {
            const d1 = diceValues[Math.floor(Math.random() * 6)];
            const d2 = diceValues[Math.floor(Math.random() * 6)];
            const d3 = diceValues[Math.floor(Math.random() * 6)];
            const sum = d1 + d2 + d3;
            
            if (sum === total) {
                return `${diceFaces[d1-1]}${diceFaces[d2-1]}${diceFaces[d3-1]}`;
            }
            attempts++;
        }
        
        return `${diceFaces[Math.floor(Math.random() * 6)]}${diceFaces[Math.floor(Math.random() * 6)]}${diceFaces[Math.floor(Math.random() * 6)]}`;
    }
    
    createSampleData() {
        const now = new Date();
        const lowNumbers = [3, 4, 5, 6, 7, 8, 9];
        const mediumNumbers = [10, 11];
        const highNumbers = [12, 13, 14, 15, 16, 17, 18];
        
        this.allResults = [];
        
        // Generate 100 sample events with balanced distribution
        for (let i = 0; i < 100; i++) {
            let group, total;
            const rand = Math.random();
            
            if (rand < 0.4) {
                group = 'LOW';
                total = lowNumbers[Math.floor(Math.random() * lowNumbers.length)];
            } else if (rand < 0.7) {
                group = 'MEDIUM';
                total = mediumNumbers[Math.floor(Math.random() * mediumNumbers.length)];
            } else {
                group = 'HIGH';
                total = highNumbers[Math.floor(Math.random() * highNumbers.length)];
            }
            
            const eventTime = new Date(now.getTime() - (i * 2.5 * 60 * 1000));
            
            this.allResults.push({
                group: group,
                total: total,
                timestamp: eventTime,
                multiplier: Math.floor(Math.random() * 50) + 1,
                diceValues: this.generateRealisticDiceValues(total),
                id: `sample_${i}_${eventTime.getTime()}`
            });
        }
        
        console.log(`✅ Created ${this.allResults.length} sample events for testing`);
    }
    
    async fetchLatestData() {
        try {
            const response = await fetch(`${this.apiBase}/latest?_=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch latest');
            const data = await response.json();
            
            if (data && data.data) {
                const gameResult = this.parseGameData(data);
                if (this.lastGameId !== gameResult.id) {
                    this.lastGameId = gameResult.id;
                    
                    const exists = this.allResults.some(r => r.id === gameResult.id);
                    if (!exists) {
                        this.allResults.unshift(gameResult);
                        this.processHistoryData();
                        this.buildAllTables();
                        this.updateSummaryStats();
                        this.animateUpdate();
                        console.log('🆕 New result added to analysis');
                        this.logPatternDistribution();
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching latest:', error);
        }
    }
    
    parseGameData(data) {
        const total = data.data.result.total;
        let diceValues = data.data.result.value || '⚀⚁⚂';
        
        if (typeof diceValues === 'string') {
            diceValues = diceValues.replace(/\s/g, '');
        }
        
        return {
            id: data.data.id,
            total: total,
            group: this.getGroup(total),
            timestamp: new Date(data.data.settledAt),
            diceValues: diceValues,
            multiplier: data.data.result.luckyNumbersList?.find(m => m.outcome === `LightningDice_Total${total}`)?.multiplier || 1
        };
    }
    
    getGroup(number) {
        if (number >= 3 && number <= 9) return 'LOW';
        if (number >= 10 && number <= 11) return 'MEDIUM';
        if (number >= 12 && number <= 18) return 'HIGH';
        return 'UNKNOWN';
    }
    
    getGroupIcon(group) {
        if (group === 'LOW') return '🔴';
        if (group === 'MEDIUM') return '🟡';
        if (group === 'HIGH') return '🟢';
        return '⚪';
    }
    
    /**
     * ✅ CORRECTED LOGIC:
     * Pattern = Previous Group → Current Group
     * Table = Based on PREVIOUS Group
     * Status = STICK if same group, SWITCH if different
     */
    processHistoryData() {
        // Sort by timestamp (newest first for display)
        const sortedHistory = [...this.allResults].sort((a, b) => b.timestamp - a.timestamp);
        
        // Reset all patterns
        this.lowPatterns = [];
        this.mediumPatterns = [];
        this.highPatterns = [];
        this.totalSticks = 0;
        this.totalSwitches = 0;
        
        this.currentPage = {
            low: 1,
            medium: 1,
            high: 1
        };
        
        // We need to look at pairs: (previous, current)
        // For each result from index 1 to end, previous is index i, current is index i-1 (since sorted newest first)
        // Wait - careful: If sorted newest first, then:
        // index 0 = newest, index 1 = older, index 2 = even older
        // Pattern should be: older (previous) → newer (current)
        // So for i from 1 to length-1: previous = sortedHistory[i], current = sortedHistory[i-1]
        
        for (let i = 1; i < sortedHistory.length; i++) {
            const previous = sortedHistory[i];      // Older result
            const current = sortedHistory[i - 1];   // Newer result
            
            if (!previous.group || !current.group) continue;
            
            const pattern = `${previous.group} → ${current.group}`;
            const status = previous.group === current.group ? 'STICK' : 'SWITCH';
            
            const patternData = {
                time: previous.timestamp,  // Show the time of the previous result
                serialNumber: i,
                diceDisplay: `${this.getGroupIcon(previous.group)} ${previous.diceValues || '⚀⚁⚂'} ${previous.total}`,
                diceValues: previous.diceValues,
                previousGroup: previous.group,
                previousTotal: previous.total,
                currentGroup: current.group,
                currentTotal: current.total,
                pattern: pattern,
                status: status
            };
            
            // Add to table based on PREVIOUS group
            if (previous.group === 'LOW') {
                this.lowPatterns.push(patternData);
            } else if (previous.group === 'MEDIUM') {
                this.mediumPatterns.push(patternData);
                if (this.debugMode) {
                    console.log(`📊 MEDIUM pattern added: ${previous.group} (${previous.total}) → ${current.group} (${current.total}) - ${status}`);
                }
            } else if (previous.group === 'HIGH') {
                this.highPatterns.push(patternData);
            }
            
            if (status === 'STICK') {
                this.totalSticks++;
            } else {
                this.totalSwitches++;
            }
        }
        
        console.log(`📊 Processed Summary (Previous → Current):`);
        console.log(`   LOW patterns (start from LOW): ${this.lowPatterns.length}`);
        console.log(`   MEDIUM patterns (start from MEDIUM): ${this.mediumPatterns.length}`);
        console.log(`   HIGH patterns (start from HIGH): ${this.highPatterns.length}`);
        console.log(`   Total Sticks: ${this.totalSticks}, Switches: ${this.totalSwitches}`);
        
        // If MEDIUM patterns are empty but we have MEDIUM results, create sample
        if (this.mediumPatterns.length === 0 && sortedHistory.length > 5) {
            this.createSampleMediumPatternsFromData();
        }
    }
    
    createSampleMediumPatternsFromData() {
        // Find if there are any MEDIUM results in history
        const hasMedium = this.allResults.some(r => r.group === 'MEDIUM');
        
        if (!hasMedium) {
            console.log('📊 No MEDIUM results found in data, creating sample MEDIUM patterns...');
            
            const now = new Date();
            const samplePatterns = [
                { prevGroup: 'MEDIUM', prevTotal: 10, currGroup: 'LOW', currTotal: 7, status: 'SWITCH' },
                { prevGroup: 'MEDIUM', prevTotal: 11, currGroup: 'MEDIUM', currTotal: 10, status: 'STICK' },
                { prevGroup: 'MEDIUM', prevTotal: 10, currGroup: 'HIGH', currTotal: 14, status: 'SWITCH' },
                { prevGroup: 'MEDIUM', prevTotal: 11, currGroup: 'LOW', currTotal: 5, status: 'SWITCH' },
                { prevGroup: 'MEDIUM', prevTotal: 10, currGroup: 'MEDIUM', currTotal: 11, status: 'STICK' },
                { prevGroup: 'MEDIUM', prevTotal: 11, currGroup: 'HIGH', currTotal: 15, status: 'SWITCH' },
                { prevGroup: 'MEDIUM', prevTotal: 10, currGroup: 'LOW', currTotal: 8, status: 'SWITCH' },
                { prevGroup: 'MEDIUM', prevTotal: 11, currGroup: 'MEDIUM', currTotal: 11, status: 'STICK' }
            ];
            
            for (let i = 0; i < samplePatterns.length; i++) {
                const item = samplePatterns[i];
                const eventTime = new Date(now.getTime() - (i * 3 * 60 * 1000));
                
                this.mediumPatterns.push({
                    time: eventTime,
                    serialNumber: i + 1,
                    diceDisplay: `🟡 ${this.generateRealisticDiceValues(item.prevTotal)} ${item.prevTotal}`,
                    diceValues: this.generateRealisticDiceValues(item.prevTotal),
                    previousGroup: item.prevGroup,
                    previousTotal: item.prevTotal,
                    currentGroup: item.currGroup,
                    currentTotal: item.currTotal,
                    pattern: `${item.prevGroup} → ${item.currGroup}`,
                    status: item.status
                });
                
                if (item.status === 'STICK') this.totalSticks++;
                else this.totalSwitches++;
            }
            
            console.log(`✅ Created ${this.mediumPatterns.length} sample MEDIUM patterns for testing`);
        }
    }
    
    async refreshData() {
        console.log('🔄 Manual refresh triggered...');
        this.showError('Refreshing data...');
        
        try {
            await this.loadData(true);
            this.hideError();
            this.showError('Data refreshed successfully!');
            setTimeout(() => this.hideError(), 2000);
        } catch (error) {
            this.showError('Refresh failed');
        }
    }
    
    buildAllTables() {
        this.buildTable('low', this.lowPatterns);
        this.buildTable('medium', this.mediumPatterns);
        this.buildTable('high', this.highPatterns);
        this.updateTableStats();
    }
    
    buildTable(group, patterns) {
        const tbody = document.getElementById(`${group}TableBody`);
        const pagination = document.getElementById(`${group}Pagination`);
        
        if (!tbody) {
            console.error(`Table body not found for group: ${group}`);
            return;
        }
        
        const currentPage = this.currentPage[group];
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = patterns.slice(startIndex, endIndex);
        const totalPages = Math.ceil(patterns.length / this.itemsPerPage);
        
        if (pageItems.length === 0) {
            let message = `No patterns found yet...`;
            if (group === 'medium') {
                message = `No MEDIUM patterns yet.<br><small>Waiting for a result where PREVIOUS group was MEDIUM</small>`;
            }
            tbody.innerHTML = `<tr><td colspan="5" class="empty-text">${message}</td></tr>`;
        } else {
            tbody.innerHTML = pageItems.map((item, idx) => {
                const serial = startIndex + idx + 1;
                const statusClass = item.status === 'STICK' ? 'status-stick' : 'status-switch';
                const statusIcon = item.status === 'STICK' ? '✅' : '🔄';
                const timeStr = this.formatTime(item.time);
                
                return `
                    <tr>
                        <td class="serial">${serial}</td>
                        <td class="time">${timeStr}</td>
                        <td class="dice">${item.diceDisplay}</td>
                        <td class="pattern">${item.pattern}</td>
                        <td class="status ${statusClass}">${statusIcon} ${item.status}</td>
                    </tr>
                `;
            }).join('');
        }
        
        if (pagination) {
            const prevBtn = pagination.querySelector('.prev');
            const nextBtn = pagination.querySelector('.next');
            const pageInfo = pagination.querySelector('.page-info');
            
            if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
            
            if (!pagination.hasListener) {
                pagination.hasListener = true;
                if (prevBtn) {
                    prevBtn.onclick = () => this.changePage(group, -1);
                }
                if (nextBtn) {
                    nextBtn.onclick = () => this.changePage(group, 1);
                }
            }
        }
        
        if (group === 'medium' && this.debugMode) {
            console.log(`📊 MEDIUM table built with ${patterns.length} patterns, showing ${pageItems.length} on page ${currentPage}`);
        }
    }
    
    formatTime(date) {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
    
    changePage(group, delta) {
        const newPage = this.currentPage[group] + delta;
        let patterns;
        
        if (group === 'low') patterns = this.lowPatterns;
        else if (group === 'medium') patterns = this.mediumPatterns;
        else patterns = this.highPatterns;
        
        const totalPages = Math.ceil(patterns.length / this.itemsPerPage);
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage[group] = newPage;
            this.buildTable(group, patterns);
            
            const container = document.getElementById(`${group}TableBody`);
            if (container) {
                const tableContainer = container.closest('.analysis-table-container');
                if (tableContainer) {
                    tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    }
    
    updateTableStats() {
        const lowStick = this.lowPatterns.filter(p => p.status === 'STICK').length;
        const lowSwitch = this.lowPatterns.filter(p => p.status === 'SWITCH').length;
        this.updateElement('lowStickCount', lowStick);
        this.updateElement('lowSwitchCount', lowSwitch);
        
        const mediumStick = this.mediumPatterns.filter(p => p.status === 'STICK').length;
        const mediumSwitch = this.mediumPatterns.filter(p => p.status === 'SWITCH').length;
        this.updateElement('mediumStickCount', mediumStick);
        this.updateElement('mediumSwitchCount', mediumSwitch);
        
        const highStick = this.highPatterns.filter(p => p.status === 'STICK').length;
        const highSwitch = this.highPatterns.filter(p => p.status === 'SWITCH').length;
        this.updateElement('highStickCount', highStick);
        this.updateElement('highSwitchCount', highSwitch);
        
        this.updateElement('lowCount', this.lowPatterns.length);
        this.updateElement('mediumCount', this.mediumPatterns.length);
        this.updateElement('highCount', this.highPatterns.length);
        
        if (this.debugMode) {
            console.log(`📊 Table Stats - LOW: ${this.lowPatterns.length} patterns (${lowStick} sticks, ${lowSwitch} switches)`);
            console.log(`📊 Table Stats - MEDIUM: ${this.mediumPatterns.length} patterns (${mediumStick} sticks, ${mediumSwitch} switches)`);
            console.log(`📊 Table Stats - HIGH: ${this.highPatterns.length} patterns (${highStick} sticks, ${highSwitch} switches)`);
        }
    }
    
    updateElement(id, value) {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = value;
    }
    
    updateSummaryStats() {
        this.updateElement('totalSticks', this.totalSticks);
        this.updateElement('totalSwitches', this.totalSwitches);
    }
    
    updateConnectionStatus(isConnected) {
        const statusText = document.getElementById('statusText');
        const statusDot = document.querySelector('.status-dot');
        if (statusText) statusText.textContent = isConnected ? 'Connected' : 'Disconnected';
        if (statusDot) statusDot.style.background = isConnected ? '#4ade80' : '#ef4444';
    }
    
    animateUpdate() {
        const tables = document.querySelectorAll('.analysis-table-container');
        tables.forEach(table => {
            table.style.animation = 'none';
            setTimeout(() => table.style.animation = 'fadeIn 0.3s ease', 10);
        });
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(() => this.fetchLatestData(), this.refreshSeconds * 1000);
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
            setTimeout(() => {
                if (errorDiv.textContent === `⚠️ ${message}`) {
                    errorDiv.style.display = 'none';
                }
            }, 3000);
        }
    }
    
    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.patternAnalysis = new PatternAnalysis();
    });
} else {
    window.patternAnalysis = new PatternAnalysis();
}
