// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let coins = [];
let currentPage = 1;
let itemsPerPage = 10;
let filteredCoins = [];

// Export functions for global access immediately
window.editCoin = function(coinId) {
    console.log('editCoin called with coinId:', coinId);
    console.log('Current window.location:', window.location.href);
    console.log('Redirecting to:', `/crmcoindetal.html?id=${coinId}`);
    
    // Redirect to coin detail page
    window.location.href = `/crmcoindetal.html?id=${coinId}`;
};

// Проверяем, что функция экспортирована
console.log('editCoin function exported:', typeof window.editCoin);

window.deleteCoin = async function(coinId) {
    console.log('deleteCoin called with coinId:', coinId);
    if (!confirm('Вы уверены, что хотите удалить эту монету?')) {
        return;
    }

    try {
        showLoading(true);
        const response = await api.delete(`/api/coins/${coinId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Успешно!', 'Монета удалена', 'success');
            loadCoins(); // Reload coins
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error deleting coin:', error);
        showNotification('Ошибка!', 'Не удалось удалить монету', 'error');
    } finally {
        showLoading(false);
    }
};

// DOM elements
const addCoinBtn = document.getElementById('addCoinBtn');
const refreshPricesBtn = document.getElementById('refreshPricesBtn');
const addCoinModal = document.getElementById('addCoinModal');
const closeModal = document.getElementById('closeModal');
const cancelAdd = document.getElementById('cancelAdd');
const addCoinForm = document.getElementById('addCoinForm');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const categoryFilter = document.getElementById('categoryFilter');
const coinsTableBody = document.getElementById('coinsTableBody');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserElement = document.getElementById('currentUser');

// Stats elements
const totalCoinsElement = document.getElementById('totalCoins');
const activeCoinsElement = document.getElementById('activeCoins');
const totalMarketCapElement = document.getElementById('totalMarketCap');
const totalVolumeElement = document.getElementById('totalVolume');

// Pagination elements
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageNumbersElement = document.getElementById('pageNumbers');

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    setupEventListeners();
    loadCoins();
    
    // Auto-refresh coins data every 5 minutes
    setInterval(loadCoins, 5 * 60 * 1000);
});

async function checkAuth() {
    if (!authToken) {
        window.location.href = '/';
        return;
    }

    try {
        // Get current user info and permissions
        const response = await api.get('/api/user/permissions', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get user permissions');
        }

        const data = await response.json();
        currentUser = data.data;
        
        if (currentUserElement) {
            currentUserElement.textContent = currentUser.user.username;
        }



    } catch (error) {
        console.error('Error checking auth:', error);
        // Fallback to localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            currentUser = JSON.parse(userData);
            if (currentUserElement) {
                currentUserElement.textContent = currentUser.username;
            }
        }
    }
}

function setupEventListeners() {
    // Modal events
    addCoinBtn.addEventListener('click', showAddCoinModal);
    closeModal.addEventListener('click', hideAddCoinModal);
    cancelAdd.addEventListener('click', hideAddCoinModal);
    
    // Close modal on outside click
    addCoinModal.addEventListener('click', (e) => {
        if (e.target === addCoinModal) {
            hideAddCoinModal();
        }
    });

    // Form submission
    addCoinForm.addEventListener('submit', handleAddCoin);

    // Refresh prices button
    if (refreshPricesBtn) {
        refreshPricesBtn.addEventListener('click', handleRefreshPrices);
    }

    // Search and filters
    searchInput.addEventListener('input', handleSearch);
    statusFilter.addEventListener('change', handleFilters);
    categoryFilter.addEventListener('change', handleFilters);

    // Pagination
    prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAddCoinModal();
        }
    });
}

// Modal functions
function showAddCoinModal() {
    addCoinModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideAddCoinModal() {
    addCoinModal.classList.remove('show');
    document.body.style.overflow = 'auto';
    addCoinForm.reset();
}

// API functions
async function loadCoins() {
    try {
        showLoading(true);
        const response = await api.get('/api/coins', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                coins = result.coins;
                filteredCoins = [...coins];
                updateStats();
                renderCoins();
            }
        } else if (response.status === 401) {
            handleLogout();
        }
    } catch (error) {
        console.error('Error loading coins:', error);
        showNotification('Ошибка!', 'Не удалось загрузить монеты', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAddCoin(e) {
    e.preventDefault();
    
    const formData = new FormData(addCoinForm);
    const coinData = {
        name: formData.get('name'),
        symbol: formData.get('symbol').toUpperCase(),
        price: parseFloat(formData.get('price')),
        marketCap: parseFloat(formData.get('marketCap')),
        volume: parseFloat(formData.get('volume')),
        category: formData.get('category'),
        description: formData.get('description'),
        status: formData.get('status')
    };

    try {
        showLoading(true);
        const response = await api.post('/api/coins', coinData, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Успешно!', 'Монета добавлена', 'success');
            hideAddCoinModal();
            loadCoins(); // Reload coins
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error adding coin:', error);
        showNotification('Ошибка!', 'Не удалось добавить монету', 'error');
    } finally {
        showLoading(false);
    }
}



async function handleRefreshPrices() {
    try {
        showLoading(true);
        const response = await api.post('/api/coins/update-prices', {}, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Успешно!', `Цены обновлены для ${result.coinsCount} монет`, 'success');
            loadCoins(); // Reload coins with new data
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error refreshing prices:', error);
        showNotification('Ошибка!', 'Не удалось обновить цены', 'error');
    } finally {
        showLoading(false);
    }
}

// Search and filter functions
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    applyFilters(searchTerm);
}

function handleFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    applyFilters(searchTerm);
}

function applyFilters(searchTerm) {
    filteredCoins = coins.filter(coin => {
        const matchesSearch = coin.name.toLowerCase().includes(searchTerm) ||
                             coin.symbol.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter.value || coin.status === statusFilter.value;
        const matchesCategory = !categoryFilter.value || coin.category === categoryFilter.value;
        
        return matchesSearch && matchesStatus && matchesCategory;
    });

    currentPage = 1;
    renderCoins();
}

// Rendering functions
function renderCoins() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const coinsToShow = filteredCoins.slice(startIndex, endIndex);

    console.log('Rendering coins:', coinsToShow.length);
    console.log('Sample coin:', coinsToShow[0]);

    coinsTableBody.innerHTML = '';

    if (coinsToShow.length === 0) {
        coinsTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: #666;">
                    Монеты не найдены
                </td>
            </tr>
        `;
        return;
    }

    coinsToShow.forEach(coin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="coin-checkbox" value="${coin.id}">
            </td>
            <td>
                <div class="coin-info">
                    <div class="coin-logo" data-coin-id="${coin.id}">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="coin-details">
                        <span class="coin-name">${coin.name}</span>
                        <span class="coin-symbol">${coin.symbol}</span>
                    </div>
                </div>
            </td>
            <td>${coin.symbol}</td>
            <td>$${coin.price.toFixed(6)}</td>
            <td>
                <div class="price-change ${coin.priceChange >= 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-${coin.priceChange >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                    ${Math.abs(coin.priceChange).toFixed(2)}%
                </div>
            </td>
            <td>$${formatNumber(coin.marketCap)}</td>
            <td>$${formatNumber(coin.volume)}</td>
            <td>
                <span class="status-badge ${coin.status}">${getStatusText(coin.status)}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit btn-sm" onclick="editCoin('${coin.id}')" title="Редактировать ${coin.name}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm" onclick="deleteCoin('${coin.id}')" title="Удалить ${coin.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        console.log(`Generated edit button for coin ${coin.id}:`, row.querySelector('.btn-edit').outerHTML);
        coinsTableBody.appendChild(row);
    });

    // Update logos after rendering
    CryptoLogos.updateCoinLogos();
    updatePagination();
}

function updateStats() {
    const totalCoins = coins.length;
    const activeCoins = coins.filter(coin => coin.status === 'active').length;
    const totalMarketCap = coins.reduce((sum, coin) => sum + coin.marketCap, 0);
    const totalVolume = coins.reduce((sum, coin) => sum + coin.volume, 0);

    if (totalCoinsElement) totalCoinsElement.textContent = totalCoins;
    if (activeCoinsElement) activeCoinsElement.textContent = activeCoins;
    if (totalMarketCapElement) totalMarketCapElement.textContent = `$${formatNumber(totalMarketCap)}`;
    if (totalVolumeElement) totalVolumeElement.textContent = `$${formatNumber(totalVolume)}`;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredCoins.length / itemsPerPage);
    
    // Update buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    // Update page numbers
    pageNumbersElement.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageNumber = document.createElement('span');
        pageNumber.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageNumber.textContent = i;
        pageNumber.addEventListener('click', () => changePage(i));
        pageNumbersElement.appendChild(pageNumber);
    }
}

function changePage(page) {
    const totalPages = Math.ceil(filteredCoins.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderCoins();
    }
}

// Utility functions
function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    } else {
        return num.toFixed(2);
    }
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Активная',
        'inactive': 'Неактивная',
        'pending': 'Ожидающая'
    };
    return statusMap[status] || status;
}

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

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Remove on click
    notification.addEventListener('click', () => {
        notification.remove();
    });
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    showNotification('Информация', 'Вы вышли из аккаунта', 'info');
    window.location.href = '/index.html';
}
