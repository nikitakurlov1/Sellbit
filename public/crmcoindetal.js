// Global variables
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let currentCoin = null;
let priceChart = null;
let ws = null; // WebSocket connection

// Отладочная информация при загрузке
console.log('crmcoindetal.js loaded');
console.log('Current URL:', window.location.href);
console.log('Search params:', window.location.search);
console.log('Auth token present:', !!authToken);

// DOM elements
const currentUserElement = document.getElementById('currentUser');
const logoutBtn = document.getElementById('logoutBtn');
const editInfoBtn = document.getElementById('editInfoBtn');
const editInfoModal = document.getElementById('editInfoModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEdit = document.getElementById('cancelEdit');
const editInfoForm = document.getElementById('editInfoForm');
const simulationForm = document.getElementById('simulationForm');
const simulationType = document.getElementById('simulationType');
const timeInputGroup = document.getElementById('timeInputGroup');
const dateInputGroup = document.getElementById('dateInputGroup');
const resetSimulation = document.getElementById('resetSimulation');
const stopSimulationBtn = document.getElementById('stopSimulation');
const simulationResults = document.getElementById('simulationResults');
const refreshChartBtn = document.getElementById('refreshChartBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationContainer = document.getElementById('notificationContainer');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    checkAuth();
    setupEventListeners();
    loadCoinData();
    initializeChart();
    initializeWebSocket(); // Initialize WebSocket connection
    
    // Test modal functionality
    console.log('Edit button element:', editInfoBtn);
    console.log('Modal element:', editInfoModal);
});

// Check authentication
function checkAuth() {
    console.log('Checking authentication...');
    console.log('Auth token:', authToken ? 'present' : 'missing');
    console.log('Current user:', currentUser);
    
    if (!authToken) {
        console.warn('No auth token found, but continuing...');
        // Не перенаправляем сразу, а показываем предупреждение
        showNotification('Предупреждение', 'Токен авторизации не найден. Некоторые функции могут быть недоступны.', 'warning');
        return;
    }
    
    if (!currentUser) {
        console.warn('No current user found, but continuing...');
        // Не перенаправляем сразу, а показываем предупреждение
        showNotification('Предупреждение', 'Данные пользователя не найдены. Некоторые функции могут быть недоступны.', 'warning');
        return;
    }
    
    if (currentUserElement) {
        currentUserElement.textContent = currentUser.username || currentUser.email || 'Пользователь';
    }
    
    console.log('Authentication check completed successfully');
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener added');
    } else {
        console.warn('Logout button not found');
    }
    
    // Edit info modal
    if (editInfoBtn) {
        editInfoBtn.addEventListener('click', () => {
            console.log('Edit button clicked');
            // Ensure form is populated with current data
            if (currentCoin) {
                const editName = document.getElementById('editName');
                const editSymbol = document.getElementById('editSymbol');
                const editCategory = document.getElementById('editCategory');
                const editStatus = document.getElementById('editStatus');
                const editDescription = document.getElementById('editDescription');
                
                if (editName) editName.value = currentCoin.name || '';
                if (editSymbol) editSymbol.value = currentCoin.symbol || '';
                if (editCategory) editCategory.value = currentCoin.category || 'infrastructure';
                if (editStatus) editStatus.value = currentCoin.status || 'active';
                if (editDescription) editDescription.value = currentCoin.description || '';
            }
            if (editInfoModal) {
                editInfoModal.classList.add('active');
                console.log('Edit modal opened');
            }
        });
        console.log('Edit button event listener added');
    } else {
        console.warn('Edit button not found');
    }
    
    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            if (editInfoModal) {
                editInfoModal.classList.remove('active');
                console.log('Edit modal closed');
            }
        });
        console.log('Close modal button listener added');
    } else {
        console.warn('Close modal button not found');
    }
    
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            if (editInfoModal) {
                editInfoModal.classList.remove('active');
                console.log('Edit modal cancelled');
            }
        });
        console.log('Cancel edit button listener added');
    } else {
        console.warn('Cancel edit button not found');
    }
    
    if (editInfoForm) {
        editInfoForm.addEventListener('submit', handleEditInfo);
        console.log('Edit form event listener added');
    } else {
        console.warn('Edit form not found');
    }
    
    // Simulation form
    if (simulationForm) {
        simulationForm.addEventListener('submit', handleSimulation);
        console.log('Simulation form listener added');
    } else {
        console.warn('Simulation form not found');
    }
    
    if (simulationType) {
        simulationType.addEventListener('change', handleSimulationTypeChange);
        console.log('Simulation type listener added');
    } else {
        console.warn('Simulation type not found');
    }
    
    if (resetSimulation) {
        resetSimulation.addEventListener('click', resetSimulationForm);
        console.log('Reset simulation listener added');
    } else {
        console.warn('Reset simulation button not found');
    }
    
    if (stopSimulationBtn) {
        stopSimulationBtn.addEventListener('click', stopSimulation);
        console.log('Stop simulation listener added');
    } else {
        console.warn('Stop simulation button not found');
    }
    
    // Chart controls
    if (refreshChartBtn) {
        refreshChartBtn.addEventListener('click', updateChart);
        console.log('Refresh chart listener added');
    } else {
        console.warn('Refresh chart button not found');
    }
    
    // Close modal on outside click
    if (editInfoModal) {
        editInfoModal.addEventListener('click', (e) => {
            if (e.target === editInfoModal) {
                editInfoModal.classList.remove('active');
                console.log('Edit modal closed by outside click');
            }
        });
        console.log('Modal outside click listener added');
    } else {
        console.warn('Modal element not found');
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editInfoModal && editInfoModal.classList.contains('active')) {
            editInfoModal.classList.remove('active');
            console.log('Edit modal closed by Escape key');
        }
    });
    console.log('Escape key listener added');
    
    console.log('All event listeners setup completed');
}

// Load coin data from URL parameters
async function loadCoinData() {
    console.log('loadCoinData called');
    
    const urlParams = new URLSearchParams(window.location.search);
    const coinId = urlParams.get('id');
    
    console.log('URL params:', { coinId, authToken: authToken ? 'present' : 'missing' });
    console.log('Full URL:', window.location.href);
    console.log('Search params:', window.location.search);
    
    if (!coinId) {
        showNotification('Ошибка!', 'ID монеты не указан', 'error');
        console.error('No coin ID found in URL');
        return;
    }
    
    try {
        showLoading(true);
        console.log('Fetching coin data for:', coinId);
        
        // Проверяем наличие токена перед запросом
        if (!authToken) {
            console.warn('No auth token, showing demo data');
            // Показываем демо данные если нет токена
            currentCoin = {
                id: coinId,
                name: 'Demo Coin',
                symbol: 'DEMO',
                price: 100.00,
                priceChange: 5.25,
                marketCap: 1000000000,
                volume: 50000000,
                category: 'infrastructure',
                status: 'active',
                description: 'Демонстрационная монета'
            };
            updateCoinDisplay();
            showNotification('Информация', 'Показаны демо данные (токен авторизации не найден)', 'info');
            return;
        }
        
        const response = await fetch(`/api/coins/${coinId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Coin data response status:', response.status);
        
        const result = await response.json();
        console.log('Coin data result:', result);
        
        if (result.success) {
            currentCoin = result.coin;
            console.log('Current coin set:', currentCoin);
            updateCoinDisplay();
            updateChart();
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error loading coin data:', error);
        showNotification('Ошибка!', 'Не удалось загрузить данные монеты', 'error');
        
        // Показываем демо данные в случае ошибки
        currentCoin = {
            id: coinId,
            name: 'Demo Coin',
            symbol: 'DEMO',
            price: 100.00,
            priceChange: 5.25,
            marketCap: 1000000000,
            volume: 50000000,
            category: 'infrastructure',
            status: 'active',
            description: 'Демонстрационная монета (ошибка загрузки)'
        };
        updateCoinDisplay();
    } finally {
        showLoading(false);
    }
}

// Update coin display
function updateCoinDisplay() {
    if (!currentCoin) {
        console.warn('No current coin data to display');
        return;
    }
    
    console.log('Updating coin display for:', currentCoin);
    
    // Update header with logo
    const coinIcon = document.getElementById('coinIcon');
    if (coinIcon) {
        coinIcon.innerHTML = '';
        try {
            const logo = CryptoLogos.createCoinLogo(currentCoin.id, 32, 'coin-logo');
            coinIcon.appendChild(logo);
        } catch (error) {
            console.warn('Error creating coin logo:', error);
            coinIcon.innerHTML = '<i class="fas fa-coins"></i>';
        }
    }
    
    // Update basic info
    const coinName = document.getElementById('coinName');
    const coinSymbol = document.getElementById('coinSymbol');
    const coinCategory = document.getElementById('coinCategory');
    
    if (coinName) coinName.textContent = currentCoin.name;
    if (coinSymbol) coinSymbol.textContent = currentCoin.symbol;
    if (coinCategory) coinCategory.textContent = getCategoryDisplayName(currentCoin.category);
    
    // Update price info
    const currentPrice = document.getElementById('currentPrice');
    const marketCap = document.getElementById('marketCap');
    const volume24h = document.getElementById('volume24h');
    
    if (currentPrice) currentPrice.textContent = formatPrice(currentCoin.price);
    if (marketCap) marketCap.textContent = formatMarketCap(currentCoin.marketCap);
    if (volume24h) volume24h.textContent = formatVolume(currentCoin.volume);
    
    // Update price change
    const priceChangeElement = document.getElementById('priceChange');
    if (priceChangeElement) {
        const change = currentCoin.priceChange || 0;
        priceChangeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        priceChangeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Update info section
    const infoName = document.getElementById('infoName');
    const infoSymbol = document.getElementById('infoSymbol');
    const infoCategory = document.getElementById('infoCategory');
    const infoStatus = document.getElementById('infoStatus');
    const infoDescription = document.getElementById('infoDescription');
    
    if (infoName) infoName.textContent = currentCoin.name;
    if (infoSymbol) infoSymbol.textContent = currentCoin.symbol;
    if (infoCategory) infoCategory.textContent = getCategoryDisplayName(currentCoin.category);
    if (infoStatus) {
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = getStatusDisplayName(currentCoin.status);
            // Remove all status classes and add the current one
            statusBadge.className = 'status-badge';
            statusBadge.classList.add(currentCoin.status || 'active');
        } else {
            infoStatus.textContent = getStatusDisplayName(currentCoin.status);
        }
    }
    if (infoDescription) infoDescription.textContent = currentCoin.description || 'Описание не указано';
    
    // Update edit form
    const editName = document.getElementById('editName');
    const editSymbol = document.getElementById('editSymbol');
    const editCategory = document.getElementById('editCategory');
    const editStatus = document.getElementById('editStatus');
    const editDescription = document.getElementById('editDescription');
    
    if (editName) editName.value = currentCoin.name;
    if (editSymbol) editSymbol.value = currentCoin.symbol;
    if (editCategory) editCategory.value = currentCoin.category;
    if (editStatus) editStatus.value = currentCoin.status;
    if (editDescription) editDescription.value = currentCoin.description || '';
    
    console.log('Coin display updated successfully');
}

// Update only current price display (for simulation monitoring)
async function updateCurrentPrice() {
    if (!currentCoin) return;
    
    try {
        const response = await fetch(`/api/coins/${currentCoin.id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentCoin = result.coin;
            
            // Update only price-related elements
            document.getElementById('currentPrice').textContent = formatPrice(currentCoin.price);
            document.getElementById('marketCap').textContent = formatMarketCap(currentCoin.marketCap);
            document.getElementById('volume24h').textContent = formatVolume(currentCoin.volume);
            
            // Update price change
            const priceChangeElement = document.getElementById('priceChange');
            const change = currentCoin.priceChange || 0;
            priceChangeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            priceChangeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    } catch (error) {
        console.error('Error updating current price:', error);
    }
}

// Initialize chart
function initializeChart() {
    console.log('Initializing chart...');
    
    const canvas = document.getElementById('priceChart');
    if (!canvas) {
        console.warn('Price chart canvas not found');
        return;
    }
    
    try {
        const ctx = canvas.getContext('2d');
        
        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Цена (USD)',
                    data: [],
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return 'Цена: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        grid: {
                            color: '#f0f0f0'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 2,
                        hoverRadius: 4
                    },
                    line: {
                        tension: 0.2 // Slightly reduce tension for more natural curves
                    }
                },
                animation: {
                    duration: 750 // Faster animations for more responsive feel
                }
            }
        });
        
        console.log('Chart initialized successfully');
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// Debounce chart updates to prevent too frequent updates
let chartUpdateTimeout = null;

// Update chart with real data from database
async function updateChart() {
    if (!currentCoin) return;
    
    // Clear existing timeout
    if (chartUpdateTimeout) {
        clearTimeout(chartUpdateTimeout);
    }
    
    // Debounce chart updates
    chartUpdateTimeout = setTimeout(async () => {
        try {
            showLoading(true);
            
            // Get price history from database
            const response = await fetch(`/api/coins/${currentCoin.id}/price-history?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                const priceHistory = result.priceHistory;
                
                // Sort by timestamp (oldest first)
                priceHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Prepare chart data
                const labels = priceHistory.map(item => formatChartLabel(new Date(item.timestamp)));
                const prices = priceHistory.map(item => item.price);
                
                // Update chart
                priceChart.data.labels = labels;
                priceChart.data.datasets[0].data = prices;
                priceChart.update();
                
                console.log(`Chart updated with ${priceHistory.length} data points`);
            } else {
                showNotification('Ошибка!', 'Не удалось загрузить данные графика', 'error');
            }
        } catch (error) {
            console.error('Error updating chart:', error);
            showNotification('Ошибка!', 'Не удалось загрузить данные графика', 'error');
        } finally {
            showLoading(false);
        }
    }, 500); // 500ms debounce
}

// Format chart label
function formatChartLabel(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Simulation is now handled by backend - no need for frontend simulation overlay



// Handle edit info form submission
async function handleEditInfo(e) {
    e.preventDefault();
    
    const formData = new FormData(editInfoForm);
    const data = {
        name: formData.get('name'),
        symbol: formData.get('symbol'),
        category: formData.get('category'),
        status: formData.get('status'),
        description: formData.get('description')
    };
    
    try {
        showLoading(true);
        const response = await fetch(`/api/coins/${currentCoin.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentCoin = { ...currentCoin, ...data };
            updateCoinDisplay();
            editInfoModal.classList.remove('active');
            showNotification('Успешно!', 'Информация о монете обновлена', 'success');
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error updating coin info:', error);
        showNotification('Ошибка!', 'Не удалось обновить информацию', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle simulation form submission
async function handleSimulation(e) {
    e.preventDefault();
    
    const formData = new FormData(simulationForm);
    const targetPrice = parseFloat(formData.get('targetPrice'));
    const simulationType = formData.get('simulationType');
    const timeMinutes = formData.get('timeMinutes');
    const targetDate = formData.get('targetDate');
    
    if (!targetPrice || targetPrice <= 0) {
        showNotification('Ошибка!', 'Введите корректную целевую цену', 'error');
        return;
    }
    
    // Check if currentCoin is available
    if (!currentCoin || !currentCoin.id) {
        console.error('currentCoin is not available:', currentCoin);
        showNotification('Ошибка!', 'Данные монеты не загружены', 'error');
        return;
    }
    
    console.log('currentCoin data:', currentCoin);
    
    // Calculate time in minutes
    let durationMinutes;
    if (simulationType === 'time') {
        if (!timeMinutes || timeMinutes <= 0) {
            showNotification('Ошибка!', 'Введите корректное время', 'error');
            return;
        }
        durationMinutes = parseInt(timeMinutes);
    } else {
        if (!targetDate) {
            showNotification('Ошибка!', 'Выберите целевую дату', 'error');
            return;
        }
        const targetDateTime = new Date(targetDate);
        const now = new Date();
        durationMinutes = Math.round((targetDateTime - now) / (1000 * 60));
        
        if (durationMinutes <= 0) {
            showNotification('Ошибка!', 'Целевая дата должна быть в будущем', 'error');
            return;
        }
    }
    
    try {
        showLoading(true);
        
        console.log('Sending simulation request:', {
            coinId: currentCoin.id,
            targetPrice,
            durationMinutes,
            authToken: authToken ? 'present' : 'missing'
        });
        
        // Send simulation request to backend
        const response = await fetch(`/api/coins/${currentCoin.id}/simulation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                targetPrice: targetPrice,
                timeMinutes: durationMinutes
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            const currentPrice = currentCoin.price;
            const change = ((targetPrice - currentPrice) / currentPrice) * 100;
            
            // Update results
            document.getElementById('resultCurrentPrice').textContent = formatPrice(currentPrice);
            document.getElementById('resultTargetPrice').textContent = formatPrice(targetPrice);
            document.getElementById('resultChange').textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            document.getElementById('resultTime').textContent = `${durationMinutes} минут`;
            
            // Show results
            simulationResults.classList.remove('hidden');
            
            // Start monitoring simulation progress
            startSimulationMonitoring();
            
            showNotification('Успешно!', 'Симуляция запущена на сервере', 'success');
        } else {
            console.error('Simulation failed:', result.errors);
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error starting simulation:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        showNotification('Ошибка!', 'Не удалось запустить симуляцию: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}



// Handle simulation type change
function handleSimulationTypeChange() {
    const type = simulationType.value;
    
    if (type === 'time') {
        timeInputGroup.classList.remove('hidden');
        dateInputGroup.classList.add('hidden');
    } else {
        timeInputGroup.classList.add('hidden');
        dateInputGroup.classList.remove('hidden');
    }
}

// Start monitoring simulation progress
function startSimulationMonitoring() {
    // Update chart every 10 seconds to show simulation progress more frequently
    const monitoringInterval = setInterval(async () => {
        try {
            // Check simulation status
            const response = await fetch(`/api/coins/${currentCoin.id}/simulation`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const result = await response.json();
            
            if (result.success && result.simulation) {
                // Simulation is active, update chart and coin data
                updateChart();
                updateCurrentPrice(); // Update only price display
            } else {
                // Simulation completed, stop monitoring
                clearInterval(monitoringInterval);
                showNotification('Информация!', 'Симуляция завершена', 'info');
                // Final update
                loadCoinData();
                updateChart();
            }
        } catch (error) {
            console.error('Error monitoring simulation:', error);
            // Don't stop monitoring on error, just log it
        }
    }, 10000); // 10 seconds
    
    // Store interval reference for cleanup
    window.simulationMonitoringInterval = monitoringInterval;
}

// Stop simulation
async function stopSimulation() {
    try {
        const response = await fetch(`/api/coins/${currentCoin.id}/simulation/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Успешно!', 'Симуляция остановлена', 'success');
            resetSimulationForm();
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error stopping simulation:', error);
        showNotification('Ошибка!', 'Не удалось остановить симуляцию', 'error');
    }
}

// Reset simulation form
function resetSimulationForm() {
    simulationForm.reset();
    simulationResults.classList.add('hidden');
    
    // Stop monitoring if active
    if (window.simulationMonitoringInterval) {
        clearInterval(window.simulationMonitoringInterval);
        window.simulationMonitoringInterval = null;
    }
    
    // Remove simulation from chart
    if (priceChart.data.datasets.length > 1) {
        priceChart.data.datasets = [priceChart.data.datasets[0]];
        priceChart.update();
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

// Utility functions
function formatPrice(price) {
    if (price >= 1) {
        return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return '$' + price.toFixed(6);
    }
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return '$' + (marketCap / 1e12).toFixed(2) + 'T';
    } else if (marketCap >= 1e9) {
        return '$' + (marketCap / 1e9).toFixed(2) + 'B';
    } else if (marketCap >= 1e6) {
        return '$' + (marketCap / 1e6).toFixed(2) + 'M';
    } else {
        return '$' + marketCap.toLocaleString();
    }
}

function formatVolume(volume) {
    if (volume >= 1e12) {
        return '$' + (volume / 1e12).toFixed(2) + 'T';
    } else if (volume >= 1e9) {
        return '$' + (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
        return '$' + (volume / 1e6).toFixed(2) + 'M';
    } else {
        return '$' + volume.toLocaleString();
    }
}

function getCategoryDisplayName(category) {
    const categories = {
        'defi': 'DeFi',
        'gaming': 'Gaming',
        'infrastructure': 'Инфраструктура',
        'meme': 'Meme'
    };
    return categories[category] || category;
}

function getStatusDisplayName(status) {
    const statuses = {
        'active': 'Активная',
        'inactive': 'Неактивная',
        'pending': 'Ожидающая',
        'simulation-high': 'Simulation High',
        'simulation-down': 'Simulation Down'
    };
    return statuses[status] || status;
}

// Loading and notification functions
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Test function for modal
function testModal() {
    console.log('Testing modal functionality...');
    console.log('Edit button:', editInfoBtn);
    console.log('Modal:', editInfoModal);
    console.log('Modal classes:', editInfoModal.className);
    
    if (editInfoBtn && editInfoModal) {
        editInfoModal.classList.add('active');
        console.log('Modal should be visible now');
        console.log('Modal classes after adding active:', editInfoModal.className);
    } else {
        console.error('Modal elements not found');
    }
}

// Make test function available globally
window.testModal = testModal;

// Initialize WebSocket connection
function initializeWebSocket() {
    console.log('Initializing WebSocket...');
    
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('WebSocket URL:', wsUrl);
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket connection established');
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'price_update' && currentCoin && message.data.coinId === currentCoin.id) {
                    // Update current coin price
                    currentCoin.price = message.data.price;
                    currentCoin.priceChange = message.data.priceChange;
                    
                    // Update display
                    updateCurrentPriceDisplay();
                    
                    // Update chart if simulation is active
                    if (window.simulationMonitoringInterval) {
                        updateChart();
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        ws.onclose = () => {
            console.log('WebSocket connection closed');
            // Reconnect after 5 seconds
            setTimeout(initializeWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        console.log('WebSocket initialization completed');
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
    }
}

// Update only price display elements (for WebSocket updates)
function updateCurrentPriceDisplay() {
    if (!currentCoin) {
        console.warn('No current coin data for price update');
        return;
    }
    
    console.log('Updating current price display');
    
    // Update price-related elements
    const currentPriceElement = document.getElementById('currentPrice');
    if (currentPriceElement) {
        currentPriceElement.textContent = formatPrice(currentCoin.price);
    }
    
    // Update price change
    const priceChangeElement = document.getElementById('priceChange');
    if (priceChangeElement) {
        const change = currentCoin.priceChange || 0;
        priceChangeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        priceChangeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    console.log('Current price display updated');
}
