// History Page JavaScript

class HistoryPage {
    constructor() {
        this.currentFilter = 'all';
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentPage = 0;
        this.itemsPerPage = 20;
        this.filters = {
            period: 'all',
            status: ['completed'],
            minAmount: null,
            maxAmount: null
        };
        this.init();
    }

    init() {
        this.loadTransactions();
        this.bindEvents();
        this.updateStats();
        this.renderTransactions();
    }

    bindEvents() {
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectFilter(e.target.closest('.filter-tab').dataset.filter);
            });
        });

        // Modal events
        const filterModal = document.getElementById('filterModal');
        if (filterModal) {
            filterModal.addEventListener('click', (e) => {
                if (e.target === filterModal) {
                    this.closeFilterModal();
                }
            });
        }
    }

    loadTransactions() {
        // Загружаем все типы транзакций из localStorage
        this.transactions = [];
        
        // Покупки
        const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
        purchases.forEach(purchase => {
            this.transactions.push({
                id: `buy_${purchase.id}`,
                type: 'buy',
                title: `Покупка ${purchase.coinName}`,
                amount: purchase.amount,
                currency: purchase.currency,
                date: purchase.date || new Date().toISOString(),
                status: 'completed',
                details: `${purchase.coinAmount} ${purchase.coinSymbol}`,
                icon: 'fas fa-arrow-up'
            });
        });

        // Продажи
        const sales = JSON.parse(localStorage.getItem('sales')) || [];
        sales.forEach(sale => {
            this.transactions.push({
                id: `sell_${sale.id}`,
                type: 'sell',
                title: `Продажа ${sale.coinName}`,
                amount: sale.amount,
                currency: sale.currency,
                date: sale.date || new Date().toISOString(),
                status: 'completed',
                details: `${sale.coinAmount} ${sale.coinSymbol}`,
                icon: 'fas fa-arrow-down'
            });
        });

        // Активные ставки
        const activeStakes = JSON.parse(localStorage.getItem('activeStakes')) || [];
        activeStakes.forEach(stake => {
            this.transactions.push({
                id: `stake_active_${stake.id}`,
                type: 'stake',
                title: `Ставка ${stake.coinName}`,
                amount: stake.amount,
                currency: 'USD',
                date: stake.startTime,
                status: 'pending',
                details: `${stake.direction === 'up' ? 'Рост' : 'Падение'} • ${stake.timeHours}ч • x${stake.winMultiplier}`,
                icon: 'fas fa-chart-line',
                profit: 0,
                isActive: true
            });
        });

        // Завершенные ставки из истории
        const stakeHistory = JSON.parse(localStorage.getItem('stakeHistory')) || [];
        stakeHistory.forEach(stake => {
            this.transactions.push({
                id: `stake_completed_${stake.id}`,
                type: 'stake',
                title: `Ставка ${stake.coinName}`,
                amount: stake.amount,
                currency: 'USD',
                date: stake.startTime,
                status: 'completed',
                details: `${stake.direction === 'up' ? 'Рост' : 'Падение'} • ${stake.timeHours}ч • ${stake.result === 'win' ? 'Победа' : 'Проигрыш'}`,
                icon: 'fas fa-chart-line',
                profit: stake.profit || 0,
                isActive: false,
                result: stake.result,
                winAmount: stake.winAmount
            });
        });

        // Пополнения
        const deposits = JSON.parse(localStorage.getItem('deposits')) || [];
        deposits.forEach(deposit => {
            this.transactions.push({
                id: `deposit_${deposit.id}`,
                type: 'deposit',
                title: 'Пополнение баланса',
                amount: deposit.amount,
                currency: deposit.currency,
                date: deposit.date || new Date().toISOString(),
                status: 'completed',
                details: deposit.method || 'Банковская карта',
                icon: 'fas fa-plus'
            });
        });

        // Выводы
        const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
        withdrawals.forEach(withdrawal => {
            this.transactions.push({
                id: `withdraw_${withdrawal.id}`,
                type: 'withdraw',
                title: 'Вывод средств',
                amount: withdrawal.amount,
                currency: withdrawal.currency,
                date: withdrawal.date || new Date().toISOString(),
                status: 'completed',
                details: withdrawal.method || 'Банковская карта',
                icon: 'fas fa-arrow-up'
            });
        });

        // Сортируем по дате (новые сначала)
        this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.applyFilters();
    }

    selectFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-filter="${filter}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        this.applyFilters();
        this.renderTransactions();
    }

    applyFilters() {
        this.filteredTransactions = this.transactions.filter(transaction => {
            // Filter by type
            if (this.currentFilter !== 'all' && transaction.type !== this.currentFilter) {
                return false;
            }
            
            // Filter by period
            if (this.filters.period !== 'all') {
                const transactionDate = new Date(transaction.date);
                const now = new Date();
                
                switch (this.filters.period) {
                    case 'today':
                        if (transactionDate.toDateString() !== now.toDateString()) {
                            return false;
                        }
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (transactionDate < weekAgo) {
                            return false;
                        }
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        if (transactionDate < monthAgo) {
                            return false;
                        }
                        break;
                    case 'year':
                        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        if (transactionDate < yearAgo) {
                            return false;
                        }
                        break;
                }
            }
            
            // Filter by status
            if (!this.filters.status.includes(transaction.status)) {
                return false;
            }
            
            // Filter by amount
            if (this.filters.minAmount !== null && transaction.amount < this.filters.minAmount) {
                return false;
            }
            if (this.filters.maxAmount !== null && transaction.amount > this.filters.maxAmount) {
                return false;
            }
            
            return true;
        });
        
        this.currentPage = 0;
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        const loadMoreSection = document.getElementById('loadMoreSection');
        
        if (!container) return;
        
        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const transactionsToShow = this.filteredTransactions.slice(startIndex, endIndex);
        
        if (this.currentPage === 0) {
            if (transactionsToShow.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <h3>История пуста</h3>
                        <p>У вас пока нет операций в выбранном фильтре</p>
                    </div>
                `;
                if (loadMoreSection) loadMoreSection.style.display = 'none';
                return;
            }
            
            container.innerHTML = '';
        }
        
        transactionsToShow.forEach(transaction => {
            const transactionElement = this.createTransactionElement(transaction);
            container.appendChild(transactionElement);
        });
        
        // Show/hide load more button
        if (loadMoreSection) {
            loadMoreSection.style.display = endIndex < this.filteredTransactions.length ? 'block' : 'none';
        }
    }

    createTransactionElement(transaction) {
        const element = document.createElement('div');
        element.className = 'transaction-item';
        
        // Специальное отображение для ставок
        if (transaction.type === 'stake') {
            const statusClass = transaction.isActive ? 'active' : (transaction.result === 'win' ? 'win' : 'loss');
            const statusText = transaction.isActive ? 'Активна' : (transaction.result === 'win' ? 'Победа' : 'Проигрыш');
            const profitText = transaction.isActive ? 'В процессе' : 
                (transaction.result === 'win' ? `+$${transaction.winAmount.toFixed(2)}` : `-$${transaction.amount.toFixed(2)}`);
            
            element.innerHTML = `
                <div class="transaction-icon ${transaction.type} ${statusClass}">
                    <i class="${transaction.icon}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-title">${transaction.title}</div>
                    <div class="transaction-details">
                        <span>${transaction.details}</span>
                        <span>•</span>
                        <span>${this.formatDate(transaction.date)}</span>
                    </div>
                    <div class="transaction-status ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                <div class="transaction-amount">
                    <div>$${transaction.amount.toFixed(2)}</div>
                    <div style="font-size: 12px; color: ${transaction.result === 'win' ? '#34C759' : transaction.result === 'loss' ? '#FF3B30' : '#8E8E93'}">
                        ${profitText}
                    </div>
                </div>
            `;
        } else {
            // Обычное отображение для других транзакций
            element.innerHTML = `
                <div class="transaction-icon ${transaction.type}">
                    <i class="${transaction.icon}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-title">${transaction.title}</div>
                    <div class="transaction-details">
                        <span>${transaction.details}</span>
                        <span>•</span>
                        <span>${this.formatDate(transaction.date)}</span>
                    </div>
                    <div class="transaction-status ${transaction.status}">
                        ${this.getStatusText(transaction.status)}
                    </div>
                </div>
                <div class="transaction-amount">
                    ${transaction.profit !== undefined ? 
                        `<div>${transaction.amount > 0 ? '+' : ''}$${transaction.amount.toFixed(2)}</div>
                         <div style="font-size: 12px; color: ${transaction.profit >= 0 ? '#34C759' : '#FF3B30'}">
                             ${transaction.profit >= 0 ? '+' : ''}$${transaction.profit.toFixed(2)}
                         </div>` :
                        `${transaction.amount > 0 ? '+' : ''}$${transaction.amount.toFixed(2)}`
                    }
                </div>
            `;
        }
        
        return element;
    }

    updateStats() {
        const stats = {
            buy: 0,
            sell: 0,
            stake: 0,
            deposit: 0
        };
        
        this.transactions.forEach(transaction => {
            if (stats.hasOwnProperty(transaction.type)) {
                stats[transaction.type]++;
            }
        });
        
        // Update display
        const totalBuys = document.getElementById('totalBuys');
        const totalSells = document.getElementById('totalSells');
        const totalStakes = document.getElementById('totalStakes');
        const totalDeposits = document.getElementById('totalDeposits');
        
        if (totalBuys) totalBuys.textContent = stats.buy;
        if (totalSells) totalSells.textContent = stats.sell;
        if (totalStakes) totalStakes.textContent = stats.stake;
        if (totalDeposits) totalDeposits.textContent = stats.deposit;
    }

    loadMoreTransactions() {
        this.currentPage++;
        this.renderTransactions();
    }

    toggleFilterModal() {
        const modal = document.getElementById('filterModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeFilterModal() {
        const modal = document.getElementById('filterModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    applyFilters() {
        const periodFilter = document.getElementById('periodFilter');
        const minAmount = document.getElementById('minAmount');
        const maxAmount = document.getElementById('maxAmount');
        const statusCheckboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
        
        this.filters.period = periodFilter ? periodFilter.value : 'all';
        this.filters.minAmount = minAmount && minAmount.value ? parseFloat(minAmount.value) : null;
        this.filters.maxAmount = maxAmount && maxAmount.value ? parseFloat(maxAmount.value) : null;
        
        this.filters.status = [];
        statusCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                this.filters.status.push(checkbox.value);
            }
        });
        
        this.applyFilters();
        this.renderTransactions();
        this.closeFilterModal();
        this.showToast('Фильтры применены', 'success');
    }

    resetFilters() {
        const periodFilter = document.getElementById('periodFilter');
        const minAmount = document.getElementById('minAmount');
        const maxAmount = document.getElementById('maxAmount');
        const statusCheckboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
        
        if (periodFilter) periodFilter.value = 'all';
        if (minAmount) minAmount.value = '';
        if (maxAmount) maxAmount.value = '';
        
        statusCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === 'completed';
        });
        
        this.filters = {
            period: 'all',
            status: ['completed'],
            minAmount: null,
            maxAmount: null
        };
        
        this.applyFilters();
        this.renderTransactions();
        this.showToast('Фильтры сброшены', 'info');
    }

    exportHistory() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `history_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        this.showToast('История экспортирована', 'success');
    }

    generateCSV() {
        const headers = ['Дата', 'Тип', 'Операция', 'Сумма', 'Валюта', 'Статус', 'Детали'];
        const rows = this.filteredTransactions.map(transaction => [
            this.formatDate(transaction.date),
            this.getTypeText(transaction.type),
            transaction.title,
            transaction.amount.toFixed(2),
            transaction.currency,
            this.getStatusText(transaction.status),
            transaction.details
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (transactionDate.getTime() === today.getTime()) {
            return 'Сегодня';
        } else if (transactionDate.getTime() === yesterday.getTime()) {
            return 'Вчера';
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    }

    getStatusText(status) {
        const statusMap = {
            'completed': 'Завершено',
            'pending': 'В обработке',
            'failed': 'Неудачно'
        };
        return statusMap[status] || status;
    }

    getTypeText(type) {
        const typeMap = {
            'buy': 'Покупка',
            'sell': 'Продажа',
            'stake': 'Ставка',
            'deposit': 'Пополнение',
            'withdraw': 'Вывод'
        };
        return typeMap[type] || type;
    }

    getPeriodText(minutes) {
        if (minutes < 60) {
            return `${minutes} мин`;
        } else if (minutes < 1440) {
            const hours = minutes / 60;
            return `${hours} ч`;
        } else {
            const days = minutes / 1440;
            return `${days} дн`;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Global functions for onclick handlers
function goBack() {
    window.history.back();
}

function toggleFilterModal() {
    if (window.historyPage) {
        window.historyPage.toggleFilterModal();
    }
}

function closeFilterModal() {
    if (window.historyPage) {
        window.historyPage.closeFilterModal();
    }
}

function applyFilters() {
    if (window.historyPage) {
        window.historyPage.applyFilters();
    }
}

function resetFilters() {
    if (window.historyPage) {
        window.historyPage.resetFilters();
    }
}

function exportHistory() {
    if (window.historyPage) {
        window.historyPage.exportHistory();
    }
}

function loadMoreTransactions() {
    if (window.historyPage) {
        window.historyPage.loadMoreTransactions();
    }
}

// Initialize history page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.historyPage = new HistoryPage();
});
