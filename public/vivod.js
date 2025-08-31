// Инициализация страницы вывода средств
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    setupEventListeners();
    loadUserBalance();
});

function initializePage() {
    // Устанавливаем начальное состояние
    showRecipientDetails('card');
    
    // Восстанавливаем выбранную валюту или устанавливаем USD по умолчанию
    const savedCurrency = localStorage.getItem('selectedCurrency') || 'USD';
    selectCurrency(savedCurrency);
    
    // Устанавливаем комиссии по умолчанию
    updateFees();
}

function setupEventListeners() {
    // Обработчики для выбора способа вывода
    const withdrawalMethods = document.querySelectorAll('.withdrawal-method');
    withdrawalMethods.forEach(method => {
        method.addEventListener('click', function() {
            const methodType = this.dataset.method;
            selectWithdrawalMethod(methodType);
        });
    });

    // Обработчик для радио кнопок
    const radioButtons = document.querySelectorAll('input[name="withdrawalMethod"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                showRecipientDetails(this.value);
            }
        });
    });

    // Обработчик изменения суммы
    const amountInput = document.getElementById('withdrawAmount');
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            updateFees();
        });
    }

    // Обработчик для номера карты (форматирование)
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            formatCardNumber(this);
        });
    }
}

async function loadUserBalance() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.error('No auth token found');
            return;
        }

        // Получаем актуальный баланс из базы данных
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const response = await fetch(`/api/users/${payload.userId}/balance`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        let balance = 0;
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                balance = result.balance;
                // Обновляем баланс в localStorage
                const user = JSON.parse(localStorage.getItem('user')) || {};
                user.balance = balance;
                localStorage.setItem('user', JSON.stringify(user));
            }
        }

        const balanceElement = document.getElementById('availableBalance');
        if (balanceElement) {
            const currency = localStorage.getItem('selectedCurrency') || 'USD';
            const symbol = getCurrencySymbol(currency);
            balanceElement.textContent = `${symbol}${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        // Проверяем, является ли это первым выводом
        checkFirstWithdrawal();
        
    } catch (error) {
        console.error('Error loading balance:', error);
        // Показываем баланс из localStorage как fallback
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const balance = user.balance || 0;
        const balanceElement = document.getElementById('availableBalance');
        if (balanceElement) {
            const currency = localStorage.getItem('selectedCurrency') || 'USD';
            const symbol = getCurrencySymbol(currency);
            balanceElement.textContent = `${symbol}${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }
}

function checkFirstWithdrawal() {
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
    const isFirstWithdrawal = withdrawals.length === 0;
    
    if (isFirstWithdrawal) {
        showFirstWithdrawalMessage();
    }
}

function showFirstWithdrawalMessage() {
    // Заменяем кнопку "Отправить заявку" на информацию о первом выводе
    replaceSubmitButton();
}

function replaceSubmitButton() {
    const submitSection = document.querySelector('.submit-section');
    if (submitSection) {
        submitSection.innerHTML = `
            <div class="first-withdrawal-submit">
                <div class="submit-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Для первого вывода необходимо связаться с поддержкой</span>
                </div>
                <a href="https://t.me/SaleBitAdmin" target="_blank" class="telegram-submit-btn">
                    <i class="fab fa-telegram"></i>
                    Связаться с поддержкой
                </a>
            </div>
        `;
    }
}

function selectCurrency(currency) {
    // Убираем активный класс со всех кнопок валют
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранной валюте
    const selectedBtn = document.querySelector(`[data-currency="${currency}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Сохраняем выбранную валюту
    localStorage.setItem('selectedCurrency', currency);
    
    // Обновляем баланс и комиссии
    loadUserBalance();
    updateFees();
}

function getCurrencySymbol(currency) {
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'RUB': '₽'
    };
    return symbols[currency] || '$';
}

function selectWithdrawalMethod(methodType) {
    // Убираем выделение со всех методов
    document.querySelectorAll('.withdrawal-method').forEach(method => {
        method.classList.remove('selected');
    });
    
    // Выделяем выбранный метод
    const selectedMethod = document.querySelector(`[data-method="${methodType}"]`);
    if (selectedMethod) {
        selectedMethod.classList.add('selected');
    }
    
    // Устанавливаем радио кнопку
    const radio = document.querySelector(`input[value="${methodType}"]`);
    if (radio) {
        radio.checked = true;
    }
    
    // Показываем соответствующие поля для ввода реквизитов
    showRecipientDetails(methodType);
}

function showRecipientDetails(methodType) {
    // Скрываем все блоки с реквизитами
    document.querySelectorAll('.recipient-details').forEach(details => {
        details.style.display = 'none';
    });
    
    // Показываем нужный блок
    const detailsElement = document.getElementById(`${methodType}Details`);
    if (detailsElement) {
        detailsElement.style.display = 'block';
    }
}

function setMaxAmount() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const balance = user ? user.balance : 0;
    const amountInput = document.getElementById('withdrawAmount');
    
    if (amountInput) {
        amountInput.value = balance.toFixed(2);
        updateFees();
    }
}

function setHalfAmount() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const balance = user ? user.balance : 0;
    const amountInput = document.getElementById('withdrawAmount');
    
    if (amountInput) {
        const halfAmount = balance / 2;
        amountInput.value = halfAmount.toFixed(2);
        updateFees();
    }
}

function updateFees() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    const currency = localStorage.getItem('selectedCurrency') || 'USD';
    const symbol = getCurrencySymbol(currency);
    
    // Рассчитываем комиссию (например, 2.5%)
    const feeRate = 0.025;
    const fee = amount * feeRate;
    const amountToReceive = amount - fee;
    
    // Обновляем отображение
    const feeElement = document.getElementById('feeAmount');
    const receiveElement = document.getElementById('amountToReceive');
    
    if (feeElement) {
        feeElement.textContent = `${symbol}${fee.toFixed(2)}`;
    }
    if (receiveElement) {
        receiveElement.textContent = `${symbol}${amountToReceive.toFixed(2)}`;
    }
}

function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value;
}

function validateForm() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.querySelector('input[name="withdrawalMethod"]:checked').value;
    
    // Проверяем сумму
    if (!amount || amount <= 0) {
        showToast('Ошибка', 'Введите сумму вывода', 'error');
        return false;
    }
    
    // Проверяем доступный баланс
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const balance = user.balance || 0;
    if (amount > balance) {
        showToast('Ошибка', 'Недостаточно средств', 'error');
        return false;
    }
    
    // Проверяем, является ли это первым выводом
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
    const isFirstWithdrawal = withdrawals.length === 0;
    
    if (isFirstWithdrawal) {
        showToast('Первый вывод', 'Для первого вывода необходимо связаться с поддержкой в Telegram', 'info');
        // Открываем Telegram
        setTimeout(() => {
            window.open('https://t.me/SaleBitAdmin', '_blank');
        }, 1000);
        return false;
    }
    
    // Проверяем реквизиты в зависимости от метода
    if (method === 'card') {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const cardHolder = document.getElementById('cardHolder').value.trim();
        
        if (cardNumber.length < 16) {
            showToast('Ошибка', 'Введите корректный номер карты', 'error');
            return false;
        }
        if (cardHolder.length < 3) {
            showToast('Ошибка', 'Введите имя владельца карты', 'error');
            return false;
        }
    } else if (method === 'crypto') {
        const cryptoAddress = document.getElementById('cryptoAddress').value.trim();
        if (cryptoAddress.length < 10) {
            showToast('Ошибка', 'Введите корректный адрес кошелька', 'error');
            return false;
        }
    } else if (method === 'transfer') {
        const accountNumber = document.getElementById('accountNumber').value.trim();
        const recipientName = document.getElementById('recipientName').value.trim();
        
        if (accountNumber.length < 10) {
            showToast('Ошибка', 'Введите корректный номер счета', 'error');
            return false;
        }
        if (recipientName.length < 3) {
            showToast('Ошибка', 'Введите имя получателя', 'error');
            return false;
        }
    }
    
    return true;
}

function submitWithdrawal() {
    if (!validateForm()) {
        return;
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    
    // Получаем данные формы
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.querySelector('input[name="withdrawalMethod"]:checked').value;
    const currency = localStorage.getItem('selectedCurrency') || 'USD';
    
    // Создаем объект вывода
    const withdrawal = {
        id: Date.now() + Math.random(),
        amount: amount,
        currency: currency,
        method: method,
        status: 'pending',
        date: new Date().toISOString(),
        details: getWithdrawalDetails(method)
    };
    
    // Сохраняем в историю выводов
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
    withdrawals.push(withdrawal);
    localStorage.setItem('withdrawals', JSON.stringify(withdrawals));
    
    // Списываем средства с баланса
    const user = JSON.parse(localStorage.getItem('user')) || {};
    user.balance -= amount;
    localStorage.setItem('user', JSON.stringify(user));
    
    // Синхронизируем с сервером
    if (window.BalanceSync) {
        window.BalanceSync.updateServerBalance(user.balance);
    }
    
    // Имитация отправки
    setTimeout(() => {
        showToast('Успех', 'Заявка на вывод отправлена! Обработка займет 1-3 рабочих дня', 'success');
        
        // Возвращаем кнопку в исходное состояние
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить заявку';
        
        // Очищаем форму
        document.getElementById('withdrawAmount').value = '';
        updateFees();
        
        // Обновляем отображение баланса
        loadUserBalance();
        
        // Возвращаемся на главную через 2 секунды
        setTimeout(() => {
            goBack();
        }, 2000);
    }, 2000);
}

function getWithdrawalDetails(method) {
    switch(method) {
        case 'card':
            const cardNumber = document.getElementById('cardNumber').value;
            const cardHolder = document.getElementById('cardHolder').value;
            return `Карта: ${cardNumber} (${cardHolder})`;
        case 'crypto':
            const cryptoType = document.getElementById('cryptoType').value;
            const cryptoAddress = document.getElementById('cryptoAddress').value;
            return `${cryptoType}: ${cryptoAddress}`;
        case 'transfer':
            const bankName = document.getElementById('bankName').value;
            const accountNumber = document.getElementById('accountNumber').value;
            return `${bankName}: ${accountNumber}`;
        default:
            return 'Не указано';
    }
}

function goBack() {
    if (document.referrer && document.referrer.includes('home.html')) {
        window.history.back();
    } else {
        window.location.href = 'home.html';
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
