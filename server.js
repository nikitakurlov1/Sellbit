const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const db = require('./database');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connections for real-time updates
const wsConnections = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  wsConnections.add(ws);
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    wsConnections.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsConnections.delete(ws);
  });
});

// Performance monitoring
const performanceMetrics = {
  apiCalls: 0,
  apiErrors: 0,
  simulationUpdates: 0,
  wsConnections: 0,
  startTime: Date.now()
};

// Function to broadcast updates to all connected clients
const broadcastUpdate = (type, data) => {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  let sentCount = 0;
  
  wsConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  });
  
  if (sentCount > 0) {
    console.log(`Broadcasted ${type} to ${sentCount} clients`);
  }
};

// Broadcast to specific user (for portfolio updates)
const broadcastToUser = (userId, type, data) => {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  let sentCount = 0;
  
  wsConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.userId === userId) {
      try {
        ws.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error sending WebSocket message to user:', error);
      }
    }
  });
  
  if (sentCount > 0) {
    console.log(`Broadcasted ${type} to user ${userId}`);
  }
};

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Ngrok browser warning skip middleware
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

// Add caching for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cached API fetch function
const cachedFetch = async (url, cacheKey) => {
  const now = Date.now();
  const cached = cache.get(cacheKey);
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached data for: ${cacheKey}`);
    return cached.data;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: now });
    console.log(`Cached new data for: ${cacheKey}`);
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for ${cacheKey}:`, error);
    // Return cached data if available, even if expired
    if (cached) {
      console.log(`Using expired cached data for: ${cacheKey}`);
      return cached.data;
    }
    throw error;
  }
};

// Middleware for logging activity
const logActivityMiddleware = async (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    // Log activity after response is sent
    setTimeout(async () => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await db.getUserById(decoded.userId);
          
          if (user) {
            const activity = {
              id: 'activity_' + Date.now().toString(),
              userId: user.id,
              action: req.method + ' ' + req.path,
              entityType: req.path.split('/')[1] || 'general',
              entityId: req.params.id || req.body.id || null,
              details: {
                method: req.method,
                path: req.path,
                body: req.body,
                params: req.params,
                query: req.query
              },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              createdAt: new Date().toISOString()
            };
            
            await db.logActivity(activity);
          }
        }
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    }, 100);
    
    originalSend.call(this, data);
  };
  next();
};

// Middleware for checking permissions
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const userWithRoles = await db.getUserWithRoles(decoded.userId);
      
      if (!userWithRoles) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Check if user has admin role (full access)
      if (userWithRoles.roles && userWithRoles.roles.includes('Админ')) {
        return next();
      }
      
      // Check specific permissions
      if (userWithRoles.allPermissions && userWithRoles.allPermissions[resource]) {
        const permissions = userWithRoles.allPermissions[resource];
        if (permissions[action]) {
          return next();
        }
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    } catch (error) {
      console.error('Error checking permissions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Apply logging middleware
app.use(logActivityMiddleware);

// In-memory storage (в реальном проекте используйте базу данных)
let users = [];
let accounts = [];
let coins = [];

// Simulation management
let activeSimulations = new Map(); // coinId -> simulation data
let simulationIntervals = new Map(); // coinId -> interval reference

// Popular coins for CoinGecko API
const popularCoins = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
  { id: 'solana', symbol: 'sol', name: 'Solana' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP' },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche' },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
  { id: 'polygon', symbol: 'matic', name: 'Polygon' },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap' },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin' },
  { id: 'stellar', symbol: 'xlm', name: 'Stellar' },
  { id: 'cosmos', symbol: 'atom', name: 'Cosmos' },
  { id: 'monero', symbol: 'xmr', name: 'Monero' },
  { id: 'algorand', symbol: 'algo', name: 'Algorand' },
  { id: 'vechain', symbol: 'vet', name: 'VeChain' },
  { id: 'filecoin', symbol: 'fil', name: 'Filecoin' },
  { id: 'internet-computer', symbol: 'icp', name: 'Internet Computer' }
];

// Initialize roles system
const initializeRoles = async () => {
  try {
    const roles = [
      {
        id: 'role_admin',
        name: 'Админ',
        description: 'Полный доступ ко всем разделам и функциям',
        permissions: {
          coins: { read: true, write: true, delete: true },
          users: { read: true, write: true, delete: true },
          requisites: { read: true, write: true, delete: true },
          admin: { read: true, write: true, delete: true },
          roles: { read: true, write: true, delete: true }
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'role_analyst',
        name: 'Аналитик',
        description: 'Доступ к разделам Монеты и Пользователи',
        permissions: {
          coins: { read: true, write: true, delete: false },
          users: { read: true, write: true, delete: false },
          requisites: { read: false, write: false, delete: false },
          admin: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false }
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'role_manager',
        name: 'Менеджер',
        description: 'Доступ только к управлению пользователями',
        permissions: {
          coins: { read: false, write: false, delete: false },
          users: { read: true, write: true, delete: false },
          requisites: { read: false, write: false, delete: false },
          admin: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false }
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'role_team_lead',
        name: 'Тим-лидер',
        description: 'Доступ только к управлению пользователями',
        permissions: {
          coins: { read: false, write: false, delete: false },
          users: { read: true, write: true, delete: false },
          requisites: { read: false, write: false, delete: false },
          admin: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false }
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'role_head',
        name: 'Хед',
        description: 'Доступ только к управлению пользователями',
        permissions: {
          coins: { read: false, write: false, delete: false },
          users: { read: true, write: true, delete: false },
          requisites: { read: false, write: false, delete: false },
          admin: { read: false, write: false, delete: false },
          roles: { read: false, write: false, delete: false }
        },
        createdAt: new Date().toISOString()
      }
    ];

    for (const role of roles) {
      const existingRole = await db.getRoleByName(role.name);
      if (!existingRole) {
        await db.createRole(role);
        console.log(`Role created: ${role.name}`);
      }
    }
  } catch (error) {
    console.error('Error initializing roles:', error);
  }
};



// Fetch coin prices from CoinGecko and save to database
const fetchCoinPrices = async () => {
  try {
    const coinIds = popularCoins.map(coin => coin.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    
    const data = await cachedFetch(url, 'coin_prices');
    
    // Update coins array and save to database
    const updatedCoins = [];
    
    for (const coin of popularCoins) {
      const coinData = data[coin.id];
      if (coinData) {
        // Check if coin is in simulation
        const isInSimulation = activeSimulations.has(coin.id);
        
        const coinInfo = {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          price: coinData.usd || 0,
          priceChange: coinData.usd_24h_change || 0,
          marketCap: coinData.usd_market_cap || 0,
          volume: coinData.usd_24h_vol || 0,
          category: getCategoryBySymbol(coin.symbol),
          status: 'active',
          description: getDescriptionBySymbol(coin.symbol),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Only save to database if not in simulation
        if (!isInSimulation) {
          await db.saveCoin(coinInfo);
          
          // Save price history
          await db.savePriceHistory(coin.id, {
            price: coinInfo.price,
            priceChange: coinInfo.priceChange,
            marketCap: coinInfo.marketCap,
            volume: coinInfo.volume
          });
        } else {
          console.log(`Skipping price update for ${coin.id} - simulation active`);
        }
        
        updatedCoins.push(coinInfo);
      }
    }
    
    // Update in-memory array
    coins = updatedCoins;
    
    console.log(`Updated prices for ${coins.length} coins and saved to database at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error fetching coin prices:', error);
  }
};

// Helper function to get category by symbol
const getCategoryBySymbol = (symbol) => {
  const categories = {
    'btc': 'infrastructure',
    'eth': 'infrastructure',
    'bnb': 'infrastructure',
    'sol': 'infrastructure',
    'ada': 'infrastructure',
    'xrp': 'infrastructure',
    'dot': 'infrastructure',
    'doge': 'meme',
    'avax': 'infrastructure',
    'link': 'defi',
    'matic': 'infrastructure',
    'uni': 'defi',
    'ltc': 'infrastructure',
    'xlm': 'infrastructure',
    'atom': 'infrastructure',
    'xmr': 'infrastructure',
    'algo': 'infrastructure',
    'vet': 'infrastructure',
    'fil': 'infrastructure',
    'icp': 'infrastructure'
  };
  return categories[symbol] || 'infrastructure';
};

// Helper function to get description by symbol
const getDescriptionBySymbol = (symbol) => {
  const descriptions = {
    'btc': 'Первая и самая популярная криптовалюта',
    'eth': 'Платформа для смарт-контрактов и dApps',
    'bnb': 'Нативная монета Binance Smart Chain',
    'sol': 'Быстрая блокчейн-платформа',
    'ada': 'Блокчейн-платформа с научным подходом',
    'xrp': 'Платформа для быстрых международных платежей',
    'dot': 'Мультичейн экосистема',
    'doge': 'Популярная мем-криптовалюта',
    'avax': 'Высокопроизводительная блокчейн-платформа',
    'link': 'Оракул для смарт-контрактов',
    'matic': 'Масштабируемое решение для Ethereum',
    'uni': 'Децентрализованная биржа',
    'ltc': 'Быстрая альтернатива Bitcoin',
    'xlm': 'Платформа для международных платежей',
    'atom': 'Интероперабельная блокчейн-сеть',
    'xmr': 'Приватная криптовалюта',
    'algo': 'Блокчейн с доказательством участия',
    'vet': 'Блокчейн для цепочек поставок',
    'fil': 'Децентрализованное хранилище',
    'icp': 'Интернет-компьютер блокчейн'
  };
  return descriptions[symbol] || 'Криптовалюта';
};

// Advanced simulation patterns
const getMarketVolatility = () => {
  const now = new Date();
  const hour = now.getHours();
  
  // Минимальная волатильность для плавного роста
  let baseVolatility = 0.3; // Значительно уменьшена базовая волатильность
  
  if (hour >= 9 && hour <= 17) {
    baseVolatility = 0.4; // Market hours - немного выше
  } else if (hour >= 22 || hour <= 6) {
    baseVolatility = 0.2; // Late night - еще ниже
  }
  
  // Add weekend effect
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseVolatility *= 0.7; // Weekend - еще меньше волатильности
  }
  
  return baseVolatility;
};

const generatePricePattern = (progress, volatilityMultiplier) => {
  const marketVolatility = getMarketVolatility();
  const adjustedVolatility = Math.min(volatilityMultiplier * marketVolatility, 0.01); // Максимум 1% колебания
  
  // Минимальные волновые паттерны для плавного роста
  const wave1 = Math.sin(progress * Math.PI * 8) * 0.002 * adjustedVolatility; // Очень низкая частота
  const wave2 = Math.sin(progress * Math.PI * 4) * 0.003 * adjustedVolatility;  // Низкая частота
  const wave3 = Math.sin(progress * Math.PI * 2) * 0.004 * adjustedVolatility;  // Средняя частота
  
  // Минимальный случайный шум
  const microNoise = (Math.random() - 0.5) * 0.003 * adjustedVolatility;
  const macroNoise = (Math.random() - 0.5) * 0.005 * adjustedVolatility;
  
  // Очень редкие и слабые всплески
  const spikeChance = Math.random();
  let spike = 0;
  if (spikeChance < 0.01) { // 1% шанс положительного всплеска
    spike = Math.random() * 0.008 * adjustedVolatility;
  } else if (spikeChance < 0.02) { // 1% шанс отрицательного всплеска
    spike = -Math.random() * 0.006 * adjustedVolatility;
  }
  
  // Минимальная модификация тренда
  const trendModifier = Math.sin(progress * Math.PI * 1.5) * 0.002;
  
  return {
    waves: wave1 + wave2 + wave3,
    noise: microNoise + macroNoise,
    spike,
    trendModifier,
    marketVolatility
  };
};

// Simulation functions
const startSimulation = async (coinId, targetPrice, durationMinutes) => {
  try {
    console.log('startSimulation called with:', { coinId, targetPrice, durationMinutes });
    
    // Get current coin data
    const coin = await db.getCoinById(coinId);
    if (!coin) {
      console.log('Coin not found in database:', coinId);
      throw new Error('Coin not found');
    }

    console.log('Current coin data:', coin);

    const startPrice = coin.price;
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    
    // Calculate price change per minute
    const totalPriceChange = targetPrice - startPrice;
    const priceChangePerMinute = totalPriceChange / durationMinutes;
    
    console.log('Price calculations:', {
      startPrice,
      targetPrice,
      totalPriceChange,
      priceChangePerMinute,
      durationMinutes
    });
    
    // Store simulation data
    const simulationData = {
      coinId,
      startPrice,
      targetPrice,
      startTime,
      endTime,
      durationMinutes,
      priceChangePerMinute,
      isActive: true,
      phase: 'rising' // rising, falling, completed
    };
    
    activeSimulations.set(coinId, simulationData);
    console.log('Simulation data stored:', simulationData);
    
    // Start simulation interval (every 1 minute for more frequent updates)
    const interval = setInterval(async () => {
      console.log('Simulation interval triggered for:', coinId);
      await updateSimulationPrice(coinId);
    }, 1 * 60 * 1000); // 1 minute
    
    simulationIntervals.set(coinId, interval);
    console.log('Simulation interval set for:', coinId);
    
    // Initial price update
    console.log('Performing initial price update for:', coinId);
    await updateSimulationPrice(coinId);
    
    console.log(`Simulation started for ${coinId}: ${startPrice} -> ${targetPrice} over ${durationMinutes} minutes`);
    
    return true;
  } catch (error) {
    console.error('Error starting simulation:', error);
    return false;
  }
};

const updateSimulationPrice = async (coinId) => {
  try {
    console.log('updateSimulationPrice called for:', coinId);
    
    const simulation = activeSimulations.get(coinId);
    if (!simulation || !simulation.isActive) {
      console.log('No active simulation found for:', coinId);
      return;
    }
    
    console.log('Current simulation data:', simulation);
    
    const now = Date.now();
    const elapsedMinutes = (now - simulation.startTime) / (60 * 1000);
    
    console.log('Time calculations:', { now, elapsedMinutes, phase: simulation.phase });
    
    let newPrice;
    
    if (simulation.phase === 'rising') {
      // Calculate base price during rising phase
      const basePrice = simulation.startPrice + (simulation.priceChangePerMinute * elapsedMinutes);
      
      // Add realistic price fluctuations using advanced patterns
      const progress = Math.min(elapsedMinutes / simulation.durationMinutes, 1); // Cap at 1
      
      // Calculate volatility based on price range (minimal volatility for smooth growth)
      const priceRange = Math.abs(simulation.targetPrice - simulation.startPrice);
      const volatilityMultiplier = Math.min(0.5 + (priceRange / simulation.startPrice) * 0.3, 1.2); // Max 1.2x volatility
      
      // Generate advanced price pattern
      const pattern = generatePricePattern(progress, volatilityMultiplier);
      
      // Combine all fluctuations with trend modification
      const fluctuationMultiplier = 1 + pattern.waves + pattern.noise + pattern.spike + pattern.trendModifier;
      
      // Apply fluctuations to base price
      newPrice = basePrice * fluctuationMultiplier;
      
      console.log('Rising phase calculation with advanced patterns:', {
        startPrice: simulation.startPrice,
        basePrice,
        progress,
        volatilityMultiplier: volatilityMultiplier.toFixed(2),
        marketVolatility: pattern.marketVolatility.toFixed(2),
        waves: pattern.waves.toFixed(4),
        noise: pattern.noise.toFixed(4),
        spike: pattern.spike.toFixed(4),
        trendModifier: pattern.trendModifier.toFixed(4),
        fluctuationMultiplier: fluctuationMultiplier.toFixed(4),
        newPrice
      });
      
      // Check if target reached (use base price for comparison)
      if ((simulation.priceChangePerMinute > 0 && basePrice >= simulation.targetPrice) ||
          (simulation.priceChangePerMinute < 0 && basePrice <= simulation.targetPrice)) {
        
        newPrice = simulation.targetPrice;
        simulation.phase = 'falling';
        simulation.fallStartTime = now;
        simulation.fallStartPrice = simulation.targetPrice;
        
        console.log(`Target price reached for ${coinId}, starting fallback phase`);
        console.log('Final base price:', basePrice, 'Target:', simulation.targetPrice);
      }
    } else if (simulation.phase === 'falling') {
      // Calculate price during falling phase (return to real API price)
      const fallElapsedMinutes = (now - simulation.fallStartTime) / (60 * 1000);
      const fallDuration = 30; // 30 minutes to return to real price
      
      console.log('Falling phase calculation:', {
        fallElapsedMinutes,
        fallDuration,
        fallStartPrice: simulation.fallStartPrice
      });
      
      if (fallElapsedMinutes >= fallDuration) {
        // Simulation completed, return to real API price
        console.log('Simulation completed, stopping for:', coinId);
        await stopSimulation(coinId);
        return;
      }
      
      // Linear interpolation back to real price with small fluctuations
      const realPrice = await getRealPriceFromAPI(coinId);
      const fallProgress = Math.min(fallElapsedMinutes / fallDuration, 1); // Cap at 1
      const baseFallPrice = simulation.fallStartPrice + (realPrice - simulation.fallStartPrice) * fallProgress;
      
      // Add minimal fluctuations during fallback
      const fallWave = Math.sin(fallProgress * Math.PI * 2) * 0.002;
      const fallNoise = (Math.random() - 0.5) * 0.003;
      const fallFluctuation = 1 + fallWave + fallNoise;
      
      newPrice = baseFallPrice * fallFluctuation;
      
      console.log('Falling interpolation with fluctuations:', {
        realPrice,
        fallProgress,
        baseFallPrice,
        fallWave: fallWave.toFixed(4),
        fallNoise: fallNoise.toFixed(4),
        fallFluctuation: fallFluctuation.toFixed(4),
        newPrice
      });
    }
    
    console.log('Final new price:', newPrice);
    
    // Validate price before updating
    if (newPrice <= 0) {
      console.error('Invalid price calculated:', newPrice);
      return;
    }
    
    // Update coin price in database
    console.log('Updating coin in database:', coinId, newPrice);
    const priceChangePercent = ((newPrice - simulation.startPrice) / simulation.startPrice) * 100;
    await db.updateCoin(coinId, {
      price: newPrice,
      priceChange: priceChangePercent,
      updatedAt: new Date().toISOString()
    });
    
    // Save to price history
    console.log('Saving to price history:', coinId, newPrice);
    await db.savePriceHistory(coinId, {
      price: newPrice,
      priceChange: ((newPrice - simulation.startPrice) / simulation.startPrice) * 100,
      marketCap: 0, // Will be calculated based on new price
      volume: 0
    });
    
    // Broadcast price update to all connected clients
    broadcastUpdate('price_update', {
      coinId,
      price: newPrice,
      priceChange: ((newPrice - simulation.startPrice) / simulation.startPrice) * 100,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Simulation update for ${coinId}: $${newPrice.toFixed(6)}`);
    performanceMetrics.simulationUpdates++;
    
  } catch (error) {
    console.error('Error updating simulation price:', error);
    performanceMetrics.apiErrors++;
  }
};

const getRealPriceFromAPI = async (coinId) => {
  try {
    const coin = popularCoins.find(c => c.id === coinId);
    if (!coin) {
      throw new Error('Coin not found in popular coins list');
    }
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const data = await cachedFetch(url, `price_${coinId}`);
    
    if (!data[coinId] || !data[coinId].usd) {
      console.warn(`No price data for ${coinId} from API`);
      return 0;
    }
    
    return data[coinId].usd;
  } catch (error) {
    console.error('Error fetching real price from API:', error);
    return 0;
  }
};

const stopSimulation = async (coinId) => {
  try {
    // Clear interval
    const interval = simulationIntervals.get(coinId);
    if (interval) {
      clearInterval(interval);
      simulationIntervals.delete(coinId);
    }
    
    // Remove simulation data
    activeSimulations.delete(coinId);
    
    // Get real price from API and update
    const realPrice = await getRealPriceFromAPI(coinId);
    if (realPrice > 0) {
      await db.updateCoin(coinId, {
        price: realPrice,
        priceChange: 0, // Reset price change when simulation stops
        updatedAt: new Date().toISOString()
      });
      
      await db.savePriceHistory(coinId, {
        price: realPrice,
        priceChange: 0,
        marketCap: 0,
        volume: 0
      });
    }
    
    console.log(`Simulation stopped for ${coinId}, returned to real price: $${realPrice}`);
    
  } catch (error) {
    console.error('Error stopping simulation:', error);
  }
};

// Validation middleware
const validateRegistration = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Имя пользователя должно содержать от 3 до 30 символов'),
  body('email').isEmail().normalizeEmail().withMessage('Введите корректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Введите корректный email'),
  body('password').notEmpty().withMessage('Введите пароль')
];

// Rate limiting for trading operations
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

const rateLimitMiddleware = (req, res, next) => {
  const userId = req.user?.userId || req.ip;
  const now = Date.now();
  
  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const userLimit = rateLimitMap.get(userId);
  
  if (now > userLimit.resetTime) {
    // Reset the counter
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }
  
  userLimit.count++;
  next();
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Validation middleware for trading operations
const validateTradingOperation = [
  body('coinId').notEmpty().withMessage('Coin ID is required'),
  body('amount').isFloat({ min: 0.00000001 }).withMessage('Amount must be greater than 0.00000001'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be greater than 0'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'splash.html'));
});

app.get('/coin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'coin.html'));
});

app.get('/crmcoindetal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crmcoindetal.html'));
});



// Registration endpoint
app.post('/api/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array().map(err => err.msg) 
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUserByEmail = await db.getUserByEmail(email);
    const existingUserByUsername = await db.getUserByUsername(username);

    if (existingUserByEmail || existingUserByUsername) {
      return res.status(400).json({
        success: false,
        errors: ['Пользователь с таким email или именем пользователя уже существует']
      });
    }



    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      status: 'pending', // New users start with pending status
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);
    
    console.log(`New user registered: ${newUser.username} (${newUser.email}) with status: ${newUser.status}`);

    // Create account for user
    const newAccount = {
      id: Date.now().toString() + '_acc',
      userId: newUser.id,
      balance: {
        USD: 0, // Starting balance
        BTC: 0,
        ETH: 0
      },
      createdAt: new Date().toISOString()
    };

    await db.createAccount(newAccount);

    // Assign default user role
    try {
      const userRole = await db.getRoleByName('Пользователь');
      if (userRole) {
        const userRoleAssignment = {
          id: 'user_role_' + Date.now(),
          userId: newUser.id,
          roleId: userRole.id,
          assignedBy: newUser.id, // Self-assigned for new users
          assignedAt: new Date().toISOString()
        };
        
        await db.assignRoleToUser(userRoleAssignment);
        console.log(`Default user role assigned to ${newUser.username}`);
      }
    } catch (roleError) {
      console.warn('Could not assign default role to new user:', roleError.message);
      // Don't fail registration if role assignment fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Аккаунт успешно создан',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при регистрации']
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Allow login by email or username
    let user;
    if (email.includes('@')) {
      // Login by email
      user = await db.getUserByEmail(email);
    } else {
      // Login by username
      user = await db.getUserByUsername(email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        errors: ['Неверный email/username или пароль']
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        errors: ['Неверный email/username или пароль']
      });
    }

    // Update last login time
    await db.updateUserLastLogin(user.id);

    // Get user roles
    const userRoles = await db.getUserRoles(user.id);
    const roles = userRoles.map(role => role.roleName);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        roles: roles
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при входе']
    });
  }
});

// Get all users (admin only)
app.get('/api/users', checkPermission('users', 'read'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getUserByEmail(decoded.email);
    


    const users = await db.getAllUsers();
    const usersWithAccounts = [];

    for (const userData of users) {
      const account = await db.getAccountByUserId(userData.id);
      usersWithAccounts.push({
        ...userData,
        balance: account ? account.balance : { USD: 0, BTC: 0, ETH: 0 }
      });
    }

    console.log(`Retrieved ${usersWithAccounts.length} users from database`);

    res.json({
      success: true,
      users: usersWithAccounts
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении пользователей']
    });
  }
});

// Create new user (admin only)
app.post('/api/users', checkPermission('users', 'write'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const adminUser = await db.getUserByEmail(decoded.email);
    


    const { username, email, password, status, notes } = req.body;

    // Check if user already exists
    const existingUserByEmail = await db.getUserByEmail(email);
    const existingUserByUsername = await db.getUserByUsername(username);

    if (existingUserByEmail || existingUserByUsername) {
      return res.status(400).json({
        success: false,
        errors: ['Пользователь с таким email или именем пользователя уже существует']
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      status: status || 'pending',
      notes: notes || null,
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    // Create account for user
    const newAccount = {
      id: Date.now().toString() + '_acc',
      userId: newUser.id,
      balance: {
        USD: 0, // Starting balance
        
      },
      createdAt: new Date().toISOString()
    };

    await db.createAccount(newAccount);

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно создан',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при создании пользователя']
    });
  }
});

// Update user (admin only)
app.put('/api/users/:id', checkPermission('users', 'write'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const adminUser = await db.getUserByEmail(decoded.email);
    


    const userId = req.params.id;
    const { username, email, status, balance, notes } = req.body;

    // Check if target user exists
    const targetUser = await db.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        errors: ['Пользователь не найден']
      });
    }

    // Update user data
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length > 0) {
      await db.updateUser(userId, updates);
      console.log(`Updated user ${userId} with:`, updates);
    }

    // Update account balance if provided
    if (balance !== undefined) {
      const account = await db.getAccountByUserId(userId);
      if (account) {
        account.balance.USD = parseFloat(balance) || 0;
        await db.createAccount(account); // This will update the existing account
        console.log(`Updated balance for user ${userId} to: $${account.balance.USD}`);
      } else {
        // Create account if it doesn't exist
        const newAccount = {
          id: Date.now().toString() + '_acc',
          userId: userId,
          balance: {
            USD: parseFloat(balance) || 0,
            BTC: 0,
            ETH: 0
          },
          createdAt: new Date().toISOString()
        };
        await db.createAccount(newAccount);
        console.log(`Created new account for user ${userId} with balance: $${newAccount.balance.USD}`);
      }
    }

    res.json({
      success: true,
      message: 'Пользователь успешно обновлен'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при обновлении пользователя']
    });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', checkPermission('users', 'delete'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const adminUser = await db.getUserByEmail(decoded.email);
    


    const userId = req.params.id;



    await db.deleteUser(userId);

    res.json({
      success: true,
      message: 'Пользователь успешно удален'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при удалении пользователя']
    });
  }
});

// Get user account data
app.get('/api/account', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getUserByEmail(decoded.email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        errors: ['Пользователь не найден']
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        errors: ['Ваш аккаунт не активен. Обратитесь к администратору.']
      });
    }

    const account = await db.getAccountByUserId(user.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        errors: ['Аккаунт не найден']
      });
    }

    res.json({
      success: true,
      account
    });

  } catch (error) {
    console.error('Account fetch error:', error);
    res.status(401).json({
      success: false,
      errors: ['Недействительный токен']
    });
  }
});

// Check username availability
app.get('/api/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await db.getUserByUsername(username);
    res.json({
      success: true,
      available: !user
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при проверке имени пользователя']
    });
  }
});

// Check email availability
app.get('/api/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await db.getUserByEmail(email);
    res.json({
      success: true,
      available: !user
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при проверке email']
    });
  }
});

// Get user balance
app.get('/api/users/:id/balance', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId; // Используем userId из JWT токена

    // Get account from database
    const account = await db.getAccountByUserId(userId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        errors: ['Аккаунт не найден']
      });
    }

    res.json({
      success: true,
      balance: account.balance.USD || 0
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении баланса']
    });
  }
});

// Update user balance
app.put('/api/users/:id/balance', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId; // Используем userId из JWT токена
    const { balance } = req.body;

    if (balance === undefined || isNaN(parseFloat(balance))) {
      return res.status(400).json({
        success: false,
        errors: ['Неверное значение баланса']
      });
    }

    // Get account from database
    let account = await db.getAccountByUserId(userId);
    
    if (!account) {
      // Create account if it doesn't exist
      account = {
        id: Date.now().toString() + '_acc',
        userId: userId,
        balance: {
          USD: parseFloat(balance) || 0,
          BTC: 0,
          ETH: 0
        },
        createdAt: new Date().toISOString()
      };
      await db.createAccount(account);
    } else {
      // Update existing account
      account.balance.USD = parseFloat(balance) || 0;
      await db.createAccount(account); // This will update the existing account
    }

    console.log(`Updated balance for user ${userId} to: $${account.balance.USD}`);

    // Broadcast balance update to all connected clients
    broadcastUpdate('balanceUpdate', {
      userId: userId,
      balance: account.balance.USD
    });

    res.json({
      success: true,
      balance: account.balance.USD,
      message: 'Баланс успешно обновлен'
    });

  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при обновлении баланса']
    });
  }
});

// Coins API endpoints
const validateCoin = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Название должно содержать от 2 до 100 символов'),
  body('symbol').trim().isLength({ min: 1, max: 10 }).withMessage('Символ должен содержать от 1 до 10 символов'),
  body('price').isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
  body('marketCap').isFloat({ min: 0 }).withMessage('Рыночная капитализация должна быть положительным числом'),
  body('volume').isFloat({ min: 0 }).withMessage('Объем должен быть положительным числом'),
  body('category').isIn(['defi', 'gaming', 'infrastructure', 'meme']).withMessage('Неверная категория'),
  body('status').isIn(['active', 'inactive', 'pending']).withMessage('Неверный статус')
];

// Get all coins (public endpoint - no authentication required)
app.get('/api/coins/public', async (req, res) => {
  try {
    // This endpoint is public and doesn't require authentication
    const coins = await db.getAllCoins();
    
    res.json({
      success: true,
      data: coins
    });
  } catch (error) {
    console.error('Get public coins error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении списка криптовалют']
    });
  }
});

// Get all coins (for exchange - no permission check)
app.get('/api/coins/exchange', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get coins from database with real-time prices
    const dbCoins = await db.getAllCoins();
    
    // Update in-memory array
    coins = dbCoins;
    
    // Add additional data for better display
    const enhancedCoins = dbCoins.map(coin => ({
      ...coin,
      marketCap: coin.price * (coin.circulatingSupply || 1000000), // Calculate market cap
      volume24h: coin.volume24h || Math.random() * 1000000000, // Add volume if not present
      priceChange: coin.priceChange || (Math.random() * 20 - 10), // Add price change if not present
      priceChange24h: coin.priceChange24h || (Math.random() * 20 - 10), // Add 24h change
      high24h: coin.high24h || coin.price * (1 + Math.random() * 0.1), // Add 24h high
      low24h: coin.low24h || coin.price * (1 - Math.random() * 0.1), // Add 24h low
    }));
    
    res.json({
      success: true,
      coins: enhancedCoins
    });

  } catch (error) {
    console.error('Get coins error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении монет']
    });
  }
});

// Get all coins
app.get('/api/coins', checkPermission('coins', 'read'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get coins from database
    const dbCoins = await db.getAllCoins();
    
    // Update in-memory array
    coins = dbCoins;
    
    res.json({
      success: true,
      coins: dbCoins
    });

  } catch (error) {
    console.error('Get coins error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении монет']
    });
  }
});

// Get top 5 coins by price change
app.get('/api/coins/top/gainers', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get coins from database
    const dbCoins = await db.getAllCoins();
    
    // Filter active coins and sort by price change (descending)
    const topCoins = dbCoins
      .filter(coin => coin.status === 'active')
      .sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0))
      .slice(0, 5);
    
    res.json({
      success: true,
      coins: topCoins
    });

  } catch (error) {
    console.error('Get top coins error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении топ монет']
    });
  }
});

// Get specific coin
app.get('/api/coins/:id', checkPermission('coins', 'read'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;

    const coin = await db.getCoinById(id);
    if (!coin) {
      return res.status(404).json({
        success: false,
        errors: ['Монета не найдена']
      });
    }

    res.json({
      success: true,
      coin: coin
    });

  } catch (error) {
    console.error('Get coin error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении монеты']
    });
  }
});

// Add new coin
app.post('/api/coins', checkPermission('coins', 'write'), validateCoin, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array().map(err => err.msg) 
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, symbol, price, marketCap, volume, category, description, status } = req.body;

    // Check if coin with same symbol already exists
    const existingCoin = coins.find(coin => coin.symbol.toLowerCase() === symbol.toLowerCase());
    if (existingCoin) {
      return res.status(400).json({
        success: false,
        errors: ['Монета с таким символом уже существует']
      });
    }

    // Create new coin
    const newCoin = {
      id: Date.now().toString(),
      name,
      symbol: symbol.toUpperCase(),
      price: parseFloat(price),
      marketCap: parseFloat(marketCap),
      volume: parseFloat(volume),
      category,
      description: description || '',
      status,
      priceChange: (Math.random() - 0.5) * 20, // Random price change for demo
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    coins.push(newCoin);

    res.status(201).json({
      success: true,
      message: 'Монета успешно добавлена',
      coin: newCoin
    });

  } catch (error) {
    console.error('Add coin error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при добавлении монеты']
    });
  }
});

// Update coin
app.put('/api/coins/:id', checkPermission('coins', 'write'), validateCoin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array().map(err => err.msg) 
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;
    const { name, symbol, category, description, status } = req.body;

    const existingCoin = await db.getCoinById(id);
    if (!existingCoin) {
      return res.status(404).json({
        success: false,
        errors: ['Монета не найдена']
      });
    }

    // Update coin in database
    const updates = {
      name,
      symbol: symbol.toUpperCase(),
      category,
      description: description || '',
      status,
      updatedAt: new Date().toISOString()
    };

    await db.updateCoin(id, updates);

    // Get updated coin
    const updatedCoin = await db.getCoinById(id);

    res.json({
      success: true,
      message: 'Монета успешно обновлена',
      coin: updatedCoin
    });

  } catch (error) {
    console.error('Update coin error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при обновлении монеты']
    });
  }
});

// Delete coin
app.delete('/api/coins/:id', checkPermission('coins', 'delete'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;

    const existingCoin = await db.getCoinById(id);
    if (!existingCoin) {
      return res.status(404).json({
        success: false,
        errors: ['Монета не найдена']
      });
    }

    await db.deleteCoin(id);

    res.json({
      success: true,
      message: 'Монета успешно удалена'
    });

  } catch (error) {
    console.error('Delete coin error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при удалении монеты']
    });
  }
});

// Force update coin prices
app.post('/api/coins/update-prices', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    await fetchCoinPrices();

    res.json({
      success: true,
      message: 'Цены монет обновлены',
      coinsCount: coins.length
    });

  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при обновлении цен']
    });
  }
});

// Start simulation for a coin
app.post('/api/coins/:id/simulation', async (req, res) => {
  try {
    console.log('Simulation request received:', req.params, req.body);
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified for user:', decoded);
    
    const { id } = req.params;
    const { targetPrice, timeMinutes } = req.body;

    console.log('Simulation parameters:', { id, targetPrice, timeMinutes });

    // Validate input
    if (!targetPrice || targetPrice <= 0) {
      console.log('Invalid target price:', targetPrice);
      return res.status(400).json({
        success: false,
        errors: ['Целевая цена должна быть больше 0']
      });
    }

    if (!timeMinutes || timeMinutes <= 0 || timeMinutes > 10080) {
      console.log('Invalid time minutes:', timeMinutes);
      return res.status(400).json({
        success: false,
        errors: ['Время должно быть от 1 до 10080 минут']
      });
    }

    // Check if coin exists
    console.log('Checking if coin exists:', id);
    const coin = await db.getCoinById(id);
    if (!coin) {
      console.log('Coin not found:', id);
      return res.status(404).json({
        success: false,
        errors: ['Монета не найдена']
      });
    }

    console.log('Coin found:', coin);

    // Check if simulation is already active
    if (activeSimulations.has(id)) {
      console.log('Simulation already active for:', id);
      return res.status(400).json({
        success: false,
        errors: ['Симуляция уже активна для этой монеты']
      });
    }

    // Start simulation
    console.log('Starting simulation for:', id);
    const success = await startSimulation(id, targetPrice, timeMinutes);
    
    if (success) {
      console.log('Simulation started successfully for:', id);
      res.json({
        success: true,
        message: 'Симуляция запущена',
        simulation: {
          coinId: id,
          targetPrice,
          durationMinutes: timeMinutes,
          startPrice: coin.price
        }
      });
    } else {
      console.log('Failed to start simulation for:', id);
      res.status(500).json({
        success: false,
        errors: ['Ошибка при запуске симуляции']
      });
    }

  } catch (error) {
    console.error('Start simulation error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при запуске симуляции: ' + error.message]
    });
  }
});

// Stop simulation for a coin
app.post('/api/coins/:id/simulation/stop', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;

    // Check if simulation is active
    if (!activeSimulations.has(id)) {
      return res.status(400).json({
        success: false,
        errors: ['Симуляция не активна для этой монеты']
      });
    }

    // Stop simulation
    await stopSimulation(id);

    res.json({
      success: true,
      message: 'Симуляция остановлена'
    });

  } catch (error) {
    console.error('Stop simulation error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при остановке симуляции']
    });
  }
});

// Get simulation status for a coin
app.get('/api/coins/:id/simulation', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;

    const simulation = activeSimulations.get(id);
    
    if (simulation) {
      res.json({
        success: true,
        simulation: {
          coinId: id,
          isActive: simulation.isActive,
          phase: simulation.phase,
          startPrice: simulation.startPrice,
          targetPrice: simulation.targetPrice,
          startTime: simulation.startTime,
          priceChangePerMinute: simulation.priceChangePerMinute
        }
      });
    } else {
      res.json({
        success: true,
        simulation: null
      });
    }

  } catch (error) {
    console.error('Get simulation status error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении статуса симуляции']
    });
  }
});

// Get price history for a coin
app.get('/api/coins/:id/price-history', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    // Check if coin exists
    const coin = await db.getCoinById(id);
    if (!coin) {
      return res.status(404).json({
        success: false,
        errors: ['Монета не найдена']
      });
    }

    let priceHistory;
    if (startDate && endDate) {
      priceHistory = await db.getPriceHistoryByDateRange(id, startDate, endDate);
    } else {
      priceHistory = await db.getPriceHistory(id, parseInt(limit));
    }

    res.json({
      success: true,
      coin: coin,
      priceHistory: priceHistory
    });

  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении истории цен']
    });
  }
});

// Requisites API endpoints

// Validation middleware for requisites
const validateRequisite = [
  body('type').isIn(['card', 'account', 'crypto']).withMessage('Неверный тип реквизитов'),
  body('name').isLength({ min: 3 }).withMessage('Название должно содержать минимум 3 символа'),
  body('number').isLength({ min: 5 }).withMessage('Номер должен содержать минимум 5 символов'),
  body('bank').isLength({ min: 2 }).withMessage('Укажите банк или сеть'),
  body('holder').isLength({ min: 2 }).withMessage('Укажите получателя'),
  body('status').isIn(['active', 'inactive', 'pending']).withMessage('Неверный статус')
];

// Get all requisites
app.get('/api/requisites', checkPermission('requisites', 'read'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const requisites = await db.getAllRequisites();

    res.json({
      success: true,
      requisites: requisites
    });

  } catch (error) {
    console.error('Get requisites error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении реквизитов']
    });
  }
});

// Create new requisite
app.post('/api/requisites', checkPermission('requisites', 'write'), validateRequisite, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(error => error.msg)
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { type, name, number, bank, holder, status, description } = req.body;

    const requisite = {
      id: 'req_' + Date.now().toString(),
      type,
      name,
      number,
      bank,
      holder,
      status,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.createRequisite(requisite);

    res.status(201).json({
      success: true,
      requisite: requisite,
      message: 'Реквизиты успешно созданы'
    });

  } catch (error) {
    console.error('Create requisite error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при создании реквизитов']
    });
  }
});

// Update requisite
app.put('/api/requisites/:id', checkPermission('requisites', 'write'), validateRequisite, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(error => error.msg)
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;
    const { type, name, number, bank, holder, status, description } = req.body;

    // Check if requisite exists
    const existingRequisite = await db.getRequisiteById(id);
    if (!existingRequisite) {
      return res.status(404).json({
        success: false,
        errors: ['Реквизиты не найдены']
      });
    }

    const updatedRequisite = {
      ...existingRequisite,
      type,
      name,
      number,
      bank,
      holder,
      status,
      description: description || '',
      updatedAt: new Date().toISOString()
    };

    await db.updateRequisite(id, updatedRequisite);

    res.json({
      success: true,
      requisite: updatedRequisite,
      message: 'Реквизиты успешно обновлены'
    });

  } catch (error) {
    console.error('Update requisite error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при обновлении реквизитов']
    });
  }
});

// Delete requisite
app.delete('/api/requisites/:id', checkPermission('requisites', 'delete'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;

    // Check if requisite exists
    const existingRequisite = await db.getRequisiteById(id);
    if (!existingRequisite) {
      return res.status(404).json({
        success: false,
        errors: ['Реквизиты не найдены']
      });
    }

    await db.deleteRequisite(id);

    res.json({
      success: true,
      message: 'Реквизиты успешно удалены'
    });

  } catch (error) {
    console.error('Delete requisite error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при удалении реквизитов']
    });
  }
});

// Get requisites for exchange (public endpoint for exchange integration)
app.get('/api/exchange/requisites', async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    // Get all active requisites from CRM
    const allRequisites = await db.getAllRequisites();
    const activeRequisites = allRequisites.filter(r => r.status === 'active');
    
    // Group requisites by type and currency
    const exchangeRequisites = {
      currency: currency,
      card: activeRequisites.filter(r => r.type === 'card'),
      crypto: activeRequisites.filter(r => r.type === 'crypto'),
      transfer: activeRequisites.filter(r => r.type === 'account'),
      lastUpdated: new Date().toISOString()
    };
    
    // Broadcast update to connected WebSocket clients
    broadcastUpdate('requisites_updated', {
      currency: currency,
      requisites: exchangeRequisites
    });
    
    res.json({
      success: true,
      data: exchangeRequisites
    });

  } catch (error) {
    console.error('Get exchange requisites error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении реквизитов для биржи']
    });
  }
});

// WebSocket endpoint for real-time requisites updates
app.get('/api/exchange/requisites/ws', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Send initial data
  const initialData = {
    type: 'requisites_initial',
    timestamp: Date.now()
  };
  sendUpdate(initialData);
  
  // Keep connection alive
  const interval = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

// ==================== ADMIN & ROLES API ENDPOINTS ====================

// Get all roles
app.get('/api/roles', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userWithRoles = await db.getUserWithRoles(decoded.userId);
    
    // Check if user has admin permissions
    if (!userWithRoles.roles || !userWithRoles.roles.includes('Админ')) {
      return res.status(403).json({
        success: false,
        errors: ['Недостаточно прав для просмотра ролей']
      });
    }

    const roles = await db.getAllRoles();
    
    res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении ролей']
    });
  }
});









// Health check endpoint
app.get('/api/health', (req, res) => {
  const uptime = Date.now() - performanceMetrics.startTime;
  const memoryUsage = process.memoryUsage();
  
  res.json({
    success: true,
    data: {
      uptime: Math.floor(uptime / 1000), // seconds
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) // MB
      },
      metrics: {
        apiCalls: performanceMetrics.apiCalls,
        apiErrors: performanceMetrics.apiErrors,
        simulationUpdates: performanceMetrics.simulationUpdates,
        wsConnections: wsConnections.size,
        activeSimulations: activeSimulations.size
      },
      cache: {
        size: cache.size,
        keys: Array.from(cache.keys())
      }
    }
  });
});

// Get user permissions
app.get('/api/user/permissions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token userId:', decoded.userId);
    
    const userWithRoles = await db.getUserWithRoles(decoded.userId);
    console.log('User with roles:', userWithRoles);
    
    if (!userWithRoles) {
      return res.status(404).json({
        success: false,
        errors: ['Пользователь не найден']
      });
    }

    const userRoles = await db.getUserRoles(decoded.userId);
    console.log('User roles:', userRoles);
    
    const responseData = {
      success: true,
      data: {
        user: {
          id: userWithRoles.id,
          username: userWithRoles.username,
          email: userWithRoles.email,
          roles: userWithRoles.roles || []
        },
        roles: userRoles,
        permissions: userWithRoles.allPermissions || {}
      }
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении прав доступа']
    });
  }
});

// Portfolio Management API Endpoints

// Get user's portfolio
app.get('/api/users/:userId/portfolio', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        errors: ['Доступ запрещен']
      });
    }

    const portfolio = await db.getUserPortfolio(req.params.userId);
    const portfolioValue = await db.getPortfolioValue(req.params.userId);

    res.json({
      success: true,
      portfolio,
      portfolioValue
    });

  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении портфеля']
    });
  }
});

// Buy coins (add to portfolio)
app.post('/api/users/:userId/portfolio/buy', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        errors: ['Доступ запрещен']
      });
    }

    const { coinSymbol, coinName, amount, price, fee = 0 } = req.body;

    if (!coinSymbol || !coinName || !amount || !price) {
      return res.status(400).json({
        success: false,
        errors: ['Не все обязательные поля заполнены']
      });
    }

    // Check if user has enough balance
    const account = await db.getAccountByUserId(req.params.userId);
    const totalCost = (amount * price) + fee;

    if (!account || parseFloat(account.balance) < totalCost) {
      return res.status(400).json({
        success: false,
        errors: ['Недостаточно средств на балансе']
      });
    }

    // Update user balance
    const newBalance = parseFloat(account.balance) - totalCost;
    await db.updateAccount(req.params.userId, newBalance.toString());

    // Add to portfolio
    const result = await db.addToPortfolio(req.params.userId, coinSymbol, coinName, amount, price, fee);

    // Log activity
    await db.logActivity({
      userId: req.params.userId,
      action: 'portfolio_buy',
      entityType: 'portfolio',
      entityId: coinSymbol,
      details: JSON.stringify({
        coinSymbol,
        coinName,
        amount,
        price,
        fee,
        totalCost,
        newBalance
      })
    });

    res.json({
      success: true,
      message: 'Покупка успешно выполнена',
      data: result
    });

  } catch (error) {
    console.error('Buy coins error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при покупке']
    });
  }
});

// Sell coins (remove from portfolio)
app.post('/api/users/:userId/portfolio/sell', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        errors: ['Доступ запрещен']
      });
    }

    const { coinSymbol, amount, price, fee = 0 } = req.body;

    if (!coinSymbol || !amount || !price) {
      return res.status(400).json({
        success: false,
        errors: ['Не все обязательные поля заполнены']
      });
    }

    // Remove from portfolio
    const result = await db.removeFromPortfolio(req.params.userId, coinSymbol, amount, price, fee);

    // Update user balance
    const account = await db.getAccountByUserId(req.params.userId);
    const currentBalance = parseFloat(account.balance);
    const saleValue = (amount * price) - fee;
    const newBalance = currentBalance + saleValue;
    
    await db.updateAccount(req.params.userId, newBalance.toString());

    // Log activity
    await db.logActivity({
      userId: req.params.userId,
      action: 'portfolio_sell',
      entityType: 'portfolio',
      entityId: coinSymbol,
      details: JSON.stringify({
        coinSymbol,
        amount,
        price,
        fee,
        saleValue,
        newBalance
      })
    });

    res.json({
      success: true,
      message: 'Продажа успешно выполнена',
      data: result
    });

  } catch (error) {
    console.error('Sell coins error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при продаже']
    });
  }
});

// Get portfolio transactions
app.get('/api/users/:userId/portfolio/transactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        errors: ['Токен не предоставлен']
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        errors: ['Доступ запрещен']
      });
    }

    const filters = {
      coinSymbol: req.query.coinSymbol,
      transactionType: req.query.transactionType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const transactions = await db.getPortfolioTransactions(req.params.userId, filters);

    res.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('Get portfolio transactions error:', error);
    res.status(500).json({
      success: false,
      errors: ['Ошибка сервера при получении транзакций']
    });
  }
});

// ===== PORTFOLIO ENDPOINTS =====

// Get user portfolio
app.get('/api/users/:id/portfolio', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if user is accessing their own portfolio or has admin rights
    if (id !== userId && !req.user.roles?.includes('Админ')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const portfolio = await db.getUserPortfolio(id);
    
    res.json({
      success: true,
      portfolio: portfolio
    });

  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching portfolio'
    });
  }
});

// Buy coins
app.post('/api/users/:id/portfolio/buy', authenticateToken, rateLimitMiddleware, validateTradingOperation, async (req, res) => {
  const { id } = req.params;
  const { coinId, amount, price } = req.body;
  const userId = req.user.userId;

  // Check if user is accessing their own portfolio
  if (id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    // Start database transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get current user balance
    const account = await db.getAccountByUserId(userId);
    if (!account) {
      await new Promise((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const currentBalance = account.balance.USD || 0;
    const totalCost = amount * price;

    // Validate balance
    if (currentBalance < totalCost) {
      await new Promise((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Get current portfolio for logging
    const portfolioBefore = await db.getUserPortfolio(userId);

    // Update balance
    const newBalance = currentBalance - totalCost;
    await db.updateAccount(userId, { USD: newBalance });

    // Get coin information for logo
    const coinInfo = await db.getCoinById(coinId);
    const logo = coinInfo ? coinInfo.logo || '/logos/default.svg' : '/logos/default.svg';
    
    // Add to portfolio
    await db.addToPortfolio(userId, coinId, amount, price, logo);

    // Get updated portfolio for logging
    const portfolioAfter = await db.getUserPortfolio(userId);

    // Log operation
    await db.logOperation({
      userId,
      operation_type: 'buy',
      coin_id: coinId,
      amount,
      price,
      total_value: totalCost,
      balance_before: currentBalance,
      balance_after: newBalance,
      portfolio_before: JSON.stringify(portfolioBefore),
      portfolio_after: JSON.stringify(portfolioAfter),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      created_at: new Date().toISOString()
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Broadcast portfolio update to specific user
    broadcastToUser(userId, 'portfolio_update', {
      userId,
      type: 'buy',
      coinId,
      amount,
      newBalance,
      portfolio: portfolioAfter
    });

    res.json({
      success: true,
      message: 'Purchase completed successfully',
      newBalance,
      portfolio: portfolioAfter
    });

  } catch (error) {
    // Rollback transaction on error
    try {
      await new Promise((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }

    console.error('Buy operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during purchase'
    });
  }
});

// Sell coins
app.post('/api/users/:id/portfolio/sell', authenticateToken, rateLimitMiddleware, validateTradingOperation, async (req, res) => {
  const { id } = req.params;
  const { coinId, amount, price } = req.body;
  const userId = req.user.userId;

  // Check if user is accessing their own portfolio
  if (id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    // Start database transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get current user balance
    const account = await db.getAccountByUserId(userId);
    if (!account) {
      await new Promise((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const currentBalance = account.balance.USD || 0;
    const totalValue = amount * price;

    // Get current portfolio for logging
    const portfolioBefore = await db.getUserPortfolio(userId);

    // Remove from portfolio
    await db.removeFromPortfolio(userId, coinId, amount);

    // Update balance
    const newBalance = currentBalance + totalValue;
    await db.updateAccount(userId, { USD: newBalance });

    // Get updated portfolio for logging
    const portfolioAfter = await db.getUserPortfolio(userId);

    // Log operation
    await db.logOperation({
      userId,
      operation_type: 'sell',
      coin_id: coinId,
      amount,
      price,
      total_value: totalValue,
      balance_before: currentBalance,
      balance_after: newBalance,
      portfolio_before: JSON.stringify(portfolioBefore),
      portfolio_after: JSON.stringify(portfolioAfter),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      created_at: new Date().toISOString()
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Broadcast portfolio update to specific user
    broadcastToUser(userId, 'portfolio_update', {
      userId,
      type: 'sell',
      coinId,
      amount,
      newBalance,
      portfolio: portfolioAfter
    });

    res.json({
      success: true,
      message: 'Sale completed successfully',
      newBalance,
      portfolio: portfolioAfter
    });

  } catch (error) {
    // Rollback transaction on error
    try {
      await new Promise((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }

    console.error('Sell operation error:', error);
    
    if (error.message === 'Coin not found in portfolio') {
      return res.status(400).json({
        success: false,
        error: 'Coin not found in portfolio'
      });
    }
    
    if (error.message === 'Insufficient amount in portfolio') {
      return res.status(400).json({
        success: false,
        error: 'Insufficient amount in portfolio'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error during sale'
    });
  }
});

// Static files middleware (after all routes)
app.use(express.static('public'));

server.listen(PORT, async () => {
  try {
    // Initialize database
    await db.initializeDatabase();
    console.log('Database initialized successfully');
    
    // Initialize roles system
    await initializeRoles();
    console.log('Roles system initialized successfully');
    

    
    // Initial coin prices fetch
    await fetchCoinPrices();
    
    // Update prices every 5 minutes
    setInterval(fetchCoinPrices, 5 * 60 * 1000);
    
    // Cleanup old price history every day
    setInterval(async () => {
      try {
        await db.cleanupOldPriceHistory();
      } catch (error) {
        console.error('Error cleaning up old price history:', error);
      }
    }, 24 * 60 * 60 * 1000);
    
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
    console.log('Coin prices will be updated every 5 minutes');
    console.log('Price history will be cleaned up daily');
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  server.close(async () => {
    try {
      await db.closeDatabase();
      console.log('Server shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});
