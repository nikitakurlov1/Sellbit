// Инициализация страницы монет
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    loadCoins();
    
    // Обновляем данные каждые 30 секунд
    setInterval(async () => {
        await loadCoins();
    }, 30000);
});

// Глобальные переменные для данных монет
let coinsData = [];
let currentSort = 'market-cap';
let currentFilteredCoins = [];

function initializePage() {
    console.log('Страница монет загружена');
    console.log('Проверяем токен:', !!localStorage.getItem('authToken'));
}

async function loadCoins() {
    console.log('Начинаем загрузку монет...');
    try {
        const authToken = localStorage.getItem('authToken');
        console.log('Токен найден:', !!authToken);
        if (!authToken) {
            showToast('Ошибка', 'Необходима авторизация', 'error');
            return;
        }

        // Показываем индикаторы загрузки
        showLoadingIndicators();
        console.log('Индикаторы загрузки показаны');

        // Получаем все монеты из CRM
        console.log('Делаем запрос к API...');
        const response = await fetch('/api/coins/exchange', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('Ответ получен:', response.status);

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.coins.length > 0) {
                // Обрабатываем данные монет
                coinsData = result.coins.map(coin => ({
                    ...coin,
                    icon: getCoinIcon(coin.symbol),
                    color: getCoinColor(coin.symbol)
                }));
                
                currentFilteredCoins = [...coinsData];
                
                // Загружаем отображение
                console.log('Загружаем популярные монеты...');
                loadPopularCoins();
                console.log('Загружаем все монеты...');
                loadAllCoins();
                
                console.log(`Загружено ${coinsData.length} монет из CRM`);
                
                // Инициализируем WebSocket для обновлений в реальном времени
                initializeWebSocket();
            } else {
                showToast('Информация', 'Нет доступных монет', 'info');
                showEmptyState();
            }
        } else {
            console.error('Ошибка загрузки монет:', response.status);
            showToast('Ошибка', 'Не удалось загрузить монеты', 'error');
            showEmptyState();
        }
    } catch (error) {
        console.error('Ошибка загрузки монет:', error);
        showToast('Ошибка', 'Не удалось загрузить монеты', 'error');
        showEmptyState();
    }
}

function loadPopularCoins() {
    console.log('loadPopularCoins вызвана');
    const container = document.getElementById('popularCoins');
    console.log('Контейнер популярных монет:', !!container);
    if (!container) return;

    console.log('Количество монет в данных:', coinsData.length);
    if (coinsData.length === 0) {
        console.log('Нет монет, показываем пустое состояние');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <p>Нет доступных монет</p>
            </div>
        `;
        return;
    }

    // Берем топ-4 монеты по изменению цены
    const popularCoins = [...coinsData]
        .sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0))
        .slice(0, 4);

    container.innerHTML = popularCoins.map(coin => {
        return `
            <div class="coin-card" onclick="openCoinDetails('${coin.id}')">
                <div class="coin-header">
                    <div class="coin-icon">
                        <img src="${window.CryptoLogos.getCoinLogoBySymbol(coin.symbol)}" alt="${coin.symbol}" class="coin-logo" onerror="this.src='/logos/default.svg'">
                    </div>
                    <div class="coin-info">
                        <div class="coin-name">${coin.name}</div>
                        <div class="coin-symbol">${coin.symbol}</div>
                    </div>
                </div>
                <div class="coin-price">$${formatCurrency(coin.price)}</div>
                <div class="coin-change ${(coin.priceChange || 0) >= 0 ? 'positive' : 'negative'}">
                    ${(coin.priceChange || 0) >= 0 ? '+' : ''}${(coin.priceChange || 0).toFixed(2)}%
                </div>
            </div>
        `;
    }).join('');
}

function loadAllCoins() {
    console.log('loadAllCoins вызвана');
    const container = document.getElementById('allCoins');
    console.log('Контейнер всех монет:', !!container);
    if (!container) return;

    if (currentFilteredCoins.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Монеты не найдены</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentFilteredCoins.map(coin => {
        return `
            <div class="coin-item" onclick="openCoinDetails('${coin.id}')">
                <div class="coin-icon">
                    <img src="${window.CryptoLogos.getCoinLogoBySymbol(coin.symbol)}" alt="${coin.symbol}" class="coin-logo" onerror="this.src='/logos/default.svg'">
                </div>
                <div class="coin-info">
                    <div class="coin-name">${coin.name}</div>
                    <div class="coin-symbol">${coin.symbol}</div>
                </div>
                <div class="coin-values">
                    <div class="coin-price">$${formatCurrency(coin.price)}</div>
                    <div class="coin-change ${(coin.priceChange || 0) >= 0 ? 'positive' : 'negative'}">
                        ${(coin.priceChange || 0) >= 0 ? '+' : ''}${(coin.priceChange || 0).toFixed(2)}%
                    </div>
                    <div class="coin-market-cap">$${formatMarketCap(coin.marketCap)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBar.style.display === 'none') {
        searchBar.style.display = 'block';
        searchInput.focus();
    } else {
        searchBar.style.display = 'none';
        clearSearch();
    }
}

function filterCoins() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const clearBtn = document.querySelector('.clear-search');
    
    // Показываем/скрываем кнопку очистки
    if (searchTerm.length > 0) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    // Фильтруем монеты
    currentFilteredCoins = coinsData.filter(coin => 
        coin.name.toLowerCase().includes(searchTerm) || 
        coin.symbol.toLowerCase().includes(searchTerm)
    );
    
    // Применяем текущую сортировку
    applySorting();
    
    // Обновляем отображение
    loadAllCoins();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.querySelector('.clear-search');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Сбрасываем фильтрацию
    currentFilteredCoins = [...coinsData];
    applySorting();
    loadAllCoins();
}

function updateCoinsDisplay(filteredCoins) {
    const container = document.getElementById('allCoins');
    
    if (!container) return;

    if (filteredCoins.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Монеты не найдены</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredCoins.map(coin => {
        return `
            <div class="coin-item" onclick="openCoinDetails('${coin.id}')">
                <div class="coin-icon">
                    <img src="${window.CryptoLogos.getCoinLogoBySymbol(coin.symbol)}" alt="${coin.symbol}" class="coin-logo" onerror="this.src='/logos/default.svg'">
                </div>
                <div class="coin-info">
                    <div class="coin-name">${coin.name}</div>
                    <div class="coin-symbol">${coin.symbol}</div>
                </div>
                <div class="coin-values">
                    <div class="coin-price">$${formatCurrency(coin.price)}</div>
                    <div class="coin-change ${(coin.priceChange || 0) >= 0 ? 'positive' : 'negative'}">
                        ${(coin.priceChange || 0) >= 0 ? '+' : ''}${(coin.priceChange || 0).toFixed(2)}%
                    </div>
                    <div class="coin-market-cap">$${formatMarketCap(coin.marketCap)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function sortCoins(sortBy) {
    currentSort = sortBy;
    
    // Обновляем активную кнопку сортировки
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-sort="${sortBy}"]`).classList.add('active');
    
    // Применяем сортировку
    applySorting();
    loadAllCoins();
}

function applySorting() {
    switch(currentSort) {
        case 'market-cap':
            currentFilteredCoins.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
            break;
        case 'price':
            currentFilteredCoins.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'change':
            currentFilteredCoins.sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0));
            break;
    }
}

function openCoinDetails(coinId) {
    window.location.href = `coininfo.html?coin=${coinId}`;
}

// Функции для работы с иконками и цветами монет
function getCoinIcon(symbol) {
    const iconMap = {
        'BTC': 'fab fa-bitcoin',
        'ETH': 'fab fa-ethereum',
        'BNB': 'fas fa-coins',
        'SOL': 'fas fa-bolt',
        'ADA': 'fas fa-chart-line',
        'XRP': 'fas fa-waves',
        'DOT': 'fas fa-circle',
        'DOGE': 'fas fa-dog',
        'AVAX': 'fas fa-mountain',
        'LINK': 'fas fa-link',
        'MATIC': 'fas fa-polygon',
        'UNI': 'fas fa-exchange-alt',
        'LTC': 'fas fa-coins',
        'XLM': 'fas fa-star',
        'ATOM': 'fas fa-atom',
        'XMR': 'fas fa-shield-alt',
        'ALGO': 'fas fa-chart-bar',
        'VET': 'fas fa-car',
        'FIL': 'fas fa-hdd',
        'ICP': 'fas fa-network-wired'
    };
    
    return iconMap[symbol] || 'fas fa-coins';
}

function getCoinColor(symbol) {
    const colorMap = {
        'BTC': '#f7931a',
        'ETH': '#627eea',
        'BNB': '#f3ba2f',
        'SOL': '#9945ff',
        'ADA': '#0033ad',
        'XRP': '#23292f',
        'DOT': '#e6007a',
        'DOGE': '#c2a633',
        'AVAX': '#e84142',
        'LINK': '#2a5ada',
        'MATIC': '#8247e5',
        'UNI': '#ff007a',
        'LTC': '#a6a9aa',
        'XLM': '#000000',
        'ATOM': '#2e3148',
        'XMR': '#ff6600',
        'ALGO': '#000000',
        'VET': '#15bdff',
        'FIL': '#0090ff',
        'ICP': '#29a4ff'
    };
    
    return colorMap[symbol] || '#6c757d';
}

// Функции для индикаторов загрузки и состояний
function showLoadingIndicators() {
    const popularContainer = document.getElementById('popularCoins');
    const allCoinsContainer = document.getElementById('allCoins');
    
    if (popularContainer) {
        popularContainer.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Загрузка популярных монет...</span>
            </div>
        `;
    }
    
    if (allCoinsContainer) {
        allCoinsContainer.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Загрузка всех монет...</span>
            </div>
        `;
    }
}

function showEmptyState() {
    const popularContainer = document.getElementById('popularCoins');
    const allCoinsContainer = document.getElementById('allCoins');
    
    if (popularContainer) {
        popularContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <p>Нет доступных монет</p>
            </div>
        `;
    }
    
    if (allCoinsContainer) {
        allCoinsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <p>Нет доступных монет</p>
            </div>
        `;
    }
}

// WebSocket connection for real-time updates
let ws = null;

function initializeWebSocket() {
    console.log('Initializing WebSocket for coins page...');
    
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('WebSocket URL:', wsUrl);
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket connection established for coins page');
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'price_update') {
                    // Update coin data
                    const coinIndex = coinsData.findIndex(coin => coin.id === message.data.coinId);
                    if (coinIndex !== -1) {
                        coinsData[coinIndex].price = message.data.price;
                        coinsData[coinIndex].priceChange = message.data.priceChange;
                        
                        // Update display
                        updateCoinDisplay(message.data.coinId);
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        ws.onclose = () => {
            console.log('WebSocket connection closed for coins page');
            // Reconnect after 5 seconds
            setTimeout(initializeWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error for coins page:', error);
        };
        
        console.log('WebSocket initialization completed for coins page');
    } catch (error) {
        console.error('Error initializing WebSocket for coins page:', error);
    }
}

// Update specific coin display
function updateCoinDisplay(coinId) {
    // Update popular coins
    const popularContainer = document.getElementById('popularCoins');
    if (popularContainer) {
        const coinCard = popularContainer.querySelector(`[onclick*="${coinId}"]`);
        if (coinCard) {
            const coin = coinsData.find(c => c.id === coinId);
            if (coin) {
                const priceElement = coinCard.querySelector('.coin-price');
                const changeElement = coinCard.querySelector('.coin-change');
                
                if (priceElement) {
                    priceElement.textContent = `$${formatCurrency(coin.price)}`;
                }
                if (changeElement) {
                    changeElement.textContent = `${(coin.priceChange || 0) >= 0 ? '+' : ''}${(coin.priceChange || 0).toFixed(2)}%`;
                    changeElement.className = `coin-change ${(coin.priceChange || 0) >= 0 ? 'positive' : 'negative'}`;
                }
            }
        }
    }
    
    // Update all coins list
    const allCoinsContainer = document.getElementById('allCoins');
    if (allCoinsContainer) {
        const coinItem = allCoinsContainer.querySelector(`[onclick*="${coinId}"]`);
        if (coinItem) {
            const coin = coinsData.find(c => c.id === coinId);
            if (coin) {
                const priceElement = coinItem.querySelector('.coin-price');
                const changeElement = coinItem.querySelector('.coin-change');
                
                if (priceElement) {
                    priceElement.textContent = `$${formatCurrency(coin.price)}`;
                }
                if (changeElement) {
                    changeElement.textContent = `${(coin.priceChange || 0) >= 0 ? '+' : ''}${(coin.priceChange || 0).toFixed(2)}%`;
                    changeElement.className = `coin-change ${(coin.priceChange || 0) >= 0 ? 'positive' : 'negative'}`;
                }
            }
        }
    }
}

// Функция для показа уведомлений
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-title">${title}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-message">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function goBack() {
    if (document.referrer && document.referrer.includes('home.html')) {
        window.history.back();
    } else {
        window.location.href = 'home.html';
    }
}

function formatCurrency(amount) {
    if (amount >= 1000) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (amount >= 1) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    }
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1000000000000) {
        return (marketCap / 1000000000000).toFixed(1) + 'T';
    } else if (marketCap >= 1000000000) {
        return (marketCap / 1000000000).toFixed(1) + 'B';
    } else if (marketCap >= 1000000) {
        return (marketCap / 1000000).toFixed(1) + 'M';
    } else {
        return marketCap.toLocaleString();
    }
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div><strong>${title}</strong></div>
        <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}


