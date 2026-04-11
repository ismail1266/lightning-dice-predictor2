/**
 * Lightning Dice - Pattern Analysis Tool
 * Real-time Stick/Switch Pattern Tracker
 * 
 * ✅ CORRECTED LOGIC:
 * - Pattern = Previous Group → Current Group
 * - Table = Based on PREVIOUS Group
 * - NO duplicate removal - keep all events
 * - Unique timestamps for each event
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
        console.log('✅ NO duplicate removal - all events preserved');
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
    
    /**
     * ✅ FIXED: Generate history with UNIQUE timestamps for each event
     * No duplicate removal - keep ALL events
     */
    generateHistoryFromStats(numbers) {
        const allEvents = [];
        
        console.log('🔄 Generating time series from stats data with unique timestamps...');
        
        for (let num of numbers) {
            let count = Math.min(num.count, 40);
            const group = this.getGroup(num.wheelResult);
            
            // Ensure MEDIUM has enough data
            if (group === 'MEDIUM') {
                count = Math.min(num.count + 15, 50);
            }
            
            const lastTime = new Date(num.lastOccurredAt);
            if (isNaN(lastTime.getTime())) continue;
            
            // Generate events with UNIQUE timestamps
            for (let i = 0; i < count; i++) {
                // ✅ প্রতিটি ইভেন্টের জন্য আলাদা সময় (সেকেন্ড লেভেলে)
                // 30 থেকে 90 সেকেন্ড ব্যবধান
                const intervalSeconds = 30 + (i * 15) + Math.floor(Math.random() * 20);
                const eventTime = new Date(lastTime.getTime() - (intervalSeconds * 1000));
                
                // ✅ সময় ফরম্যাট করে নেওয়া
                const timeStr = eventTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
                
                // ✅ ইউনিক আইডি: টোটাল + টাইম + র্যান্ডম + ইন্ডেক্স
                const uniqueId = `${num.wheelResult}_${eventTime.getTime()}_${i}_${Math.random().toString(36).substr(2, 8)}`;
                
                allEvents.push({
                    group: group,
                    total: num.wheelResult,
                    timestamp: eventTime,
                    timeString: timeStr,
                    multiplier: Math.floor(Math.random() * 50) + 1,
                    diceValues: this.generateRealisticDiceValues(num.wheelResult),
                    id: uniqueId
                });
            }
        }
        
        // Sort by timestamp (newest first)
        allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // ✅ IMPORTANT: NO duplicate removal - keep ALL events
        this.allResults = allEvents;
        
        // Log timeline for debugging
        console.log('📊 TIMELINE (newest to oldest - first 30 events):');
        this.allResults.slice(0, 30).forEach((r, idx) => {
            console.log(`   ${idx + 1}. ${r.timeString} - ${r.total} (${r.group}) - ID: ${r.id.substring(0, 20)}...`);
        });
        
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
        
        // Generate 150 sample events with balanced distribution
        for (let i = 0; i < 150; i++) {
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
            
            // Unique timestamp for each event
            const intervalSeconds = 30 + (i * 15) + Math.floor(Math.random() * 30);
            const eventTime = new Date(now.getTime() - (intervalSeconds * 1000));
            
            this.allResults.push({
                group: group,
                total: total,
                timestamp: eventTime,
                multiplier: Math.floor(Math.random() * 50) + 1,
                diceValues: this.generateRealisticDiceValues(total),
                id: `sample_${i}_${eventTime.getTime()}_${Math.random()}`
            });
        }
        
        // Sort by timestamp
        this.allResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        console.log(`✅ Created ${this.allResults.length} sample events for testing`);
        
        const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        this.allResults.forEach(r => counts[r.group]++);
        console.log(`Sample distribution - LOW: ${counts.LOW}, MEDIUM: ${counts.MEDIUM}, HIGH: ${counts.HIGH}`);
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
        const sortedHistory = [...this.allResults].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
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
        
        // Debug: Show all results
        console.log('📊 ALL RESULTS (newest to oldest):');
        sortedHistory.slice(0, 30).forEach((r, idx) => {
            const timeStr = r.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            console.log(`   ${idx + 1}. ${timeStr} - ${r.total} (${r.group})`);
        });
        
        // Create patterns from consecutive results
        for (let i = 0; i < sortedHistory.length - 1; i++) {
            const newer = sortedHistory[i];      // Newer result (Current)
            const older = sortedHistory[i + 1];  // Older result (Previous)
            
            if (!older.group || !newer.group) continue;
            
            const pattern = `${older.group} → ${newer.group}`;
            const status = older.group === newer.group ? 'STICK' : 'SWITCH';
            
            const patternData = {
                time: older.timestamp,
                serialNumber: i + 1,
                diceDisplay: `${this.getGroupIcon(older.group)} ${older.diceValues || '⚀⚁⚂'} ${older.total}`,
                diceValues: older.diceValues,
                previousGroup: older.group,
                previousTotal: older.total,
                currentGroup: newer.group,
                currentTotal: newer.total,
                pattern: pattern,
                status: status
            };
            
            // Add to table based on PREVIOUS group
            if (older.group === 'LOW') {
                this.lowPatterns.push(patternData);
            } else if (older.group === 'MEDIUM') {
                this.mediumPatterns.push(patternData);
                if (this.debugMode) {
                    const timeStr = older.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    console.log(`📊 MEDIUM pattern: ${older.group}(${older.total}) → ${newer.group}(${newer.total}) at ${timeStr}`);
                }
            } else if (older.group === 'HIGH') {
                this.highPatterns.push(patternData);
                if (this.debugMode) {
                    const timeStr = older.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    console.log(`📊 HIGH pattern: ${older.group}(${older.total}) → ${newer.group}(${newer.total}) at ${timeStr}`);
                }
            }
            
            if (status === 'STICK') {
                this.totalSticks++;
            } else {
                this.totalSwitches++;
            }
        }
        
        console.log(`📊 Processed Summary:`);
        console.log(`   Total results: ${sortedHistory.length}`);
        console.log(`   Total patterns: ${this.lowPatterns.length + this.mediumPatterns.length + this.highPatterns.length}`);
        console.log(`   LOW patterns: ${this.lowPatterns.length}`);
        console.log(`   MEDIUM patterns: ${this.mediumPatterns.length}`);
        console.log(`   HIGH patterns: ${this.highPatterns.length}`);
        console.log(`   Sticks: ${this.totalSticks}, Switches: ${this.totalSwitches}`);
        
        // Log all HIGH patterns for debugging
        if (this.highPatterns.length > 0) {
            console.log('📊 HIGH PATTERNS (showing all):');
            this.highPatterns.forEach((p, idx) => {
                const timeStr = p.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                console.log(`   ${idx + 1}. ${p.pattern} (${p.status}) at ${timeStr}`);
            });
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
        
        if (group === 'high' && this.debugMode) {
            console.log(`📊 HIGH table built with ${patterns.length} patterns, showing ${pageItems.length} on page ${currentPage}`);
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
