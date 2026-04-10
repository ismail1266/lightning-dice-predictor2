const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let statsCache = null;
let statsCacheTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Stats API with cache
app.get('/api/stats', asyncHandler(async (req, res) => {
    if (statsCache && statsCacheTime && (Date.now() - statsCacheTime < CACHE_DURATION)) {
        console.log('📊 Serving stats from cache');
        return res.json(statsCache);
    }

    console.log('🔄 Fetching fresh stats data...');
    const response = await axios.get('https://api-cs.casino.org/svc-evolution-game-events/api/lightningdice/stats', {
        params: {
            duration: req.query.duration || 24,
            sortField: req.query.sortField || 'hotFrequency'
        },
        headers: {
            'Origin': 'https://www.casino.org',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.casino.org/',
            'Accept': 'application/json'
        },
        timeout: 10000
    });
    
    statsCache = response.data;
    statsCacheTime = Date.now();
    console.log('✅ Stats data cached for 24 hours');
    res.json(response.data);
}));

// Latest result API
app.get('/api/latest', asyncHandler(async (req, res) => {
    const response = await axios.get('https://api-cs.casino.org/svc-evolution-game-events/api/lightningdice/latest', {
        headers: {
            'Origin': 'https://www.casino.org',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.casino.org/',
            'Accept': 'application/json'
        },
        timeout: 5000
    });
    res.json(response.data);
}));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        cacheActive: statsCache ? true : false,
        uptime: process.uptime()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n⚡ Lightning Dice Predictor - Three AI Pattern System`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
    console.log(`🔄 Latest API: http://localhost:${PORT}/api/latest`);
    console.log(`🚀 Server running on port ${PORT}\n`);
});
