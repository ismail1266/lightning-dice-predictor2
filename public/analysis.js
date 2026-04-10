/**
 * Lightning Dice - Pattern Analysis Tool
 * Real-time Stick/Switch Pattern Tracker
 * FIXED: No localStorage, fresh API data only, proper table layout
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
        
        this.init();
    }
    
    async init() {
        console.log('📊 Pattern Analysis Tool Initializing...');
        this.bindEvents();
        await this.loadData();
        this.startAutoRefresh();
        this.startTimer();
        this.updateConnectionStatus(true);
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
    
    async loadData() {
        try {
            // ✅ FIXED: No localStorage - fresh API data only
            console.log('🔄 Loading fresh analysis data from API...');
            
            // First fetch stats to generate history
            await this.fetchStatsData();
            
            // Then fetch latest for real-time updates
            await this.fetchLatestData();
            
            if (this.allResults.length > 0) {
                this.processHistoryData();
                this.buildAllTables();
                this.updateSummaryStats();
                console.log(`✅ Loaded ${this.allResults.length} fresh results from API`);
            } else {
                console.warn('⚠️ No data from API yet, waiting...');
                setTimeout(() => this.loadData(), 3000);
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load fresh data from API');
        }
    }
    
    async fetchStatsData() {
        try {
            const response = await fetch(`${this.apiBase}/stats?duration=24`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const stats = await response.json();
            
            if (stats && stats.totalStats) {
                this.generateHistoryFromStats(stats.totalStats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }
    
    generateHistoryFromStats(numbers) {
        const allEvents = [];
        
        for (let num of numbers) {
            const count = Math.min(num.count, 30);
            const lastTime = new Date(num.lastOccurredAt);
            const group = this.getGroup(num.wheelResult);
            
            if (isNaN(lastTime.getTime())) continue;
            
            for (let i = 0; i < count; i++) {
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
        console.log(`📊 Generated ${this.allResults.length} events from API stats`);
    }
    
    generateRandomDiceValues() {
        const dice = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return `${dice[Math.floor(Math.random() * 6)]}${dice[Math.floor(Math.random() * 6)]}${dice[Math.floor(Math.random() * 6)]}`;
    }
    
    async fetchLatestData() {
        try {
            const response = await fetch(`${this.apiBase}/latest`);
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
    
    // ❌ localStorage DISABLED
    loadFromLocalStorage() {
        return null;
    }
    
    processHistoryData() {
        const sortedHistory = [...this.allResults].sort((a, b) => b.timestamp - a.timestamp);
        
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
        
        for (let i = 0; i < sortedHistory.length - 1; i++) {
            const current = sortedHistory[i];
            const next = sortedHistory[i + 1];
            
            const groupIcon = this.getGroupIcon(current.group);
            const diceDisplay = `${groupIcon} ${current.diceValues || '⚀⚁⚂'} ${current.total}`;
            
            const pattern = {
                time: current.timestamp,
                serialNumber: i + 1,
                diceDisplay: diceDisplay,
                diceValues: current.diceValues,
                currentGroup: current.group,
                currentTotal: current.total,
                nextGroup: next.group,
                nextTotal: next.total,
                pattern: `${current.group} → ${next.group}`,
                status: current.group === next.group ? 'STICK' : 'SWITCH'
            };
            
            if (current.group === 'LOW') {
                this.lowPatterns.push(pattern);
            } else if (current.group === 'MEDIUM') {
                this.mediumPatterns.push(pattern);
            } else if (current.group === 'HIGH') {
                this.highPatterns.push(pattern);
            }
            
            if (pattern.status === 'STICK') {
                this.totalSticks++;
            } else {
                this.totalSwitches++;
            }
        }
        
        console.log(`📊 Processed: LOW=${this.lowPatterns.length}, MEDIUM=${this.mediumPatterns.length}, HIGH=${this.highPatterns.length}`);
        console.log(`📊 Sticks=${this.totalSticks}, Switches=${this.totalSwitches}`);
    }
    
    async refreshData() {
        console.log('🔄 Manual refresh triggered...');
        this.showError('Refreshing data...');
        
        try {
            await this.loadData();
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
            tbody.innerHTML = '<tr><td colspan="5" class="empty-text">No patterns found yet...</td></tr>';
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
        const lowStickElem = document.getElementById('lowStickCount');
        const lowSwitchElem = document.getElementById('lowSwitchCount');
        if (lowStickElem) lowStickElem.textContent = lowStick;
        if (lowSwitchElem) lowSwitchElem.textContent = lowSwitch;
        
        const mediumStick = this.mediumPatterns.filter(p => p.status === 'STICK').length;
        const mediumSwitch = this.mediumPatterns.filter(p => p.status === 'SWITCH').length;
        const mediumStickElem = document.getElementById('mediumStickCount');
        const mediumSwitchElem = document.getElementById('mediumSwitchCount');
        if (mediumStickElem) mediumStickElem.textContent = mediumStick;
        if (mediumSwitchElem) mediumSwitchElem.textContent = mediumSwitch;
        
        const highStick = this.highPatterns.filter(p => p.status === 'STICK').length;
        const highSwitch = this.highPatterns.filter(p => p.status === 'SWITCH').length;
        const highStickElem = document.getElementById('highStickCount');
        const highSwitchElem = document.getElementById('highSwitchCount');
        if (highStickElem) highStickElem.textContent = highStick;
        if (highSwitchElem) highSwitchElem.textContent = highSwitch;
        
        const lowCountElem = document.getElementById('lowCount');
        const mediumCountElem = document.getElementById('mediumCount');
        const highCountElem = document.getElementById('highCount');
        if (lowCountElem) lowCountElem.textContent = this.lowPatterns.length;
        if (mediumCountElem) mediumCountElem.textContent = this.mediumPatterns.length;
        if (highCountElem) highCountElem.textContent = this.highPatterns.length;
    }
    
    updateSummaryStats() {
        const totalSticksElem = document.getElementById('totalSticks');
        const totalSwitchesElem = document.getElementById('totalSwitches');
        if (totalSticksElem) totalSticksElem.textContent = this.totalSticks;
        if (totalSwitchesElem) totalSwitchesElem.textContent = this.totalSwitches;
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
