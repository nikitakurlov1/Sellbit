// Инициализация страницы пополнения
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    setupEventListeners();
    generatePaymentComment();
});

function initializePage() {
    // Устанавливаем начальное состояние
    showPaymentDetails('card');
    setupFileUpload();
    
    // Восстанавливаем выбранную валюту или устанавливаем USD по умолчанию
    const savedCurrency = localStorage.getItem('selectedCurrency') || 'USD';
    selectCurrency(savedCurrency);
}

function setupEventListeners() {
    // Обработчики для выбора способа оплаты
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            const methodType = this.dataset.method;
            selectPaymentMethod(methodType);
        });
    });

    // Обработчик для радио кнопок
    const radioButtons = document.querySelectorAll('input[name="paymentMethod"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                showPaymentDetails(this.value);
            }
        });
    });
}

function selectPaymentMethod(methodType) {
    // Убираем выделение со всех методов
    document.querySelectorAll('.payment-method').forEach(method => {
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
    
    // Показываем соответствующие реквизиты
    showPaymentDetails(methodType);
}

function showPaymentDetails(methodType) {
    // Скрываем все блоки с реквизитами
    document.querySelectorAll('.payment-details').forEach(details => {
        details.style.display = 'none';
    });
    
    // Показываем нужный блок
    const detailsElement = document.getElementById(`${methodType}Details`);
    if (detailsElement) {
        detailsElement.style.display = 'block';
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
    
    // Обновляем реквизиты в зависимости от валюты
    updatePaymentRequisites(currency);
}

async function updatePaymentRequisites(currency) {
    try {
        // Загружаем реквизиты из CRM
        const response = await fetch(`/api/exchange/requisites?currency=${currency}`);
        if (!response.ok) {
            throw new Error('Failed to fetch requisites');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.errors?.join(', ') || 'Failed to load requisites');
        }
        
        const requisites = result.data;
        
        // Обновляем реквизиты для карты
        updateCardRequisites(requisites.card);
        
        // Обновляем реквизиты для криптовалюты
        updateCryptoRequisites(requisites.crypto);
        
        // Обновляем реквизиты для банковского перевода
        updateTransferRequisites(requisites.transfer);
        
        // Сохраняем последнее обновление
        localStorage.setItem('lastRequisitesUpdate', new Date().toISOString());
        
    } catch (error) {
        console.error('Error loading requisites from CRM:', error);
        // Fallback to hardcoded requisites if CRM is unavailable
        const fallbackRequisites = getRequisitesByCurrency(currency);
        updateCardRequisites(fallbackRequisites.card);
        updateCryptoRequisites(fallbackRequisites.crypto);
        updateTransferRequisites(fallbackRequisites.transfer);
        
        // Show warning to user
        showNotification('Внимание', 'Реквизиты загружены из резервной копии. CRM недоступна.', 'warning');
    }
}

function getRequisitesByCurrency(currency) {
    const requisites = {
        USD: {
            card: {
                cardNumber: '4276 1600 1234 5678',
                recipient: 'ООО "СейлБит"',
                bank: 'JPMorgan Chase Bank'
            },
            crypto: {
                btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            },
            transfer: {
                bank: 'JPMorgan Chase Bank',
                account: '021000021',
                routing: '021000021',
                swift: 'CHASUS33'
            }
        },
        EUR: {
            card: {
                cardNumber: '4000 0000 0000 0002',
                recipient: 'SellBit GmbH',
                bank: 'Deutsche Bank'
            },
            crypto: {
                btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            },
            transfer: {
                bank: 'Deutsche Bank',
                account: 'DE89370400440532013000',
                routing: 'COBADEFFXXX',
                swift: 'COBADEFFXXX'
            }
        },
        RUB: {
            card: {
                cardNumber: '4276 1600 1234 5678',
                recipient: 'ООО "СейлБит"',
                bank: 'ПАО Сбербанк'
            },
            crypto: {
                btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                eth: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            },
            transfer: {
                bank: 'ПАО Сбербанк',
                account: '40702810123456789012',
                routing: '044525225',
                swift: 'SABRRUMM'
            }
        }
    };
    
    return requisites[currency] || requisites.USD;
}

function updateCardRequisites(requisites) {
    const cardDetailsContainer = document.getElementById('cardDetails');
    
    if (!requisites || requisites.length === 0) {
        if (cardDetailsContainer) {
            cardDetailsContainer.innerHTML = `
                <div class="requisite-item">
                    <div class="requisite-label">Номер карты</div>
                    <div class="requisite-value">
                        <span>Реквизиты не настроены</span>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Берем первый активный реквизит карты
    const cardRequisite = requisites[0];
    
    if (cardDetailsContainer) {
        cardDetailsContainer.innerHTML = `
            <div class="requisite-item">
                <div class="requisite-label">Номер карты</div>
                <div class="requisite-value">
                    <span>${cardRequisite.number}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${cardRequisite.number}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="requisite-item">
                <div class="requisite-label">Получатель</div>
                <div class="requisite-value">
                    <span>${cardRequisite.holder}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${cardRequisite.holder}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="requisite-item">
                <div class="requisite-label">Банк</div>
                <div class="requisite-value">
                    <span>${cardRequisite.bank}</span>
                </div>
            </div>
        `;
    }
}

function updateCryptoRequisites(requisites) {
    const cryptoDetailsContainer = document.getElementById('cryptoDetails');
    
    if (!requisites || requisites.length === 0) {
        if (cryptoDetailsContainer) {
            cryptoDetailsContainer.innerHTML = `
                <div class="requisite-item">
                    <div class="requisite-label">Криптовалютные адреса</div>
                    <div class="requisite-value">
                        <span>Реквизиты не настроены</span>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    if (cryptoDetailsContainer) {
        let cryptoHTML = '';
        
        requisites.forEach((requisite, index) => {
            const cryptoName = getCryptoName(requisite.bank);
            cryptoHTML += `
                <div class="requisite-item">
                    <div class="requisite-label">${cryptoName}</div>
                    <div class="requisite-value">
                        <span>${requisite.number}</span>
                        <button class="copy-btn" onclick="copyToClipboard('${requisite.number}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        cryptoDetailsContainer.innerHTML = cryptoHTML;
    }
}

function getCryptoName(bank) {
    const cryptoMap = {
        'bitcoin': 'Bitcoin (BTC)',
        'ethereum': 'Ethereum (ETH)',
        'usdt': 'Tether (USDT)',
        'btc': 'Bitcoin (BTC)',
        'eth': 'Ethereum (ETH)',
        'tron': 'Tron (TRX)',
        'binance': 'Binance Coin (BNB)',
        'cardano': 'Cardano (ADA)',
        'solana': 'Solana (SOL)',
        'polkadot': 'Polkadot (DOT)'
    };
    
    const bankLower = bank.toLowerCase();
    for (const [key, value] of Object.entries(cryptoMap)) {
        if (bankLower.includes(key)) {
            return value;
        }
    }
    
    return bank || 'Криптовалюта';
}

function updateTransferRequisites(requisites) {
    const transferDetailsContainer = document.getElementById('transferDetails');
    
    if (!requisites || requisites.length === 0) {
        if (transferDetailsContainer) {
            transferDetailsContainer.innerHTML = `
                <div class="requisite-item">
                    <div class="requisite-label">Банковский перевод</div>
                    <div class="requisite-value">
                        <span>Реквизиты не настроены</span>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Берем первый активный реквизит банковского счета
    const transferRequisite = requisites[0];
    
    if (transferDetailsContainer) {
        transferDetailsContainer.innerHTML = `
            <div class="requisite-item">
                <div class="requisite-label">Банк</div>
                <div class="requisite-value">
                    <span>${transferRequisite.bank}</span>
                </div>
            </div>
            <div class="requisite-item">
                <div class="requisite-label">Получатель</div>
                <div class="requisite-value">
                    <span>${transferRequisite.holder}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${transferRequisite.holder}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="requisite-item">
                <div class="requisite-label">Номер счета</div>
                <div class="requisite-value">
                    <span>${transferRequisite.number}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${transferRequisite.number}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
    }
}

// Функция для копирования в буфер обмена
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Скопировано!', 'Текст скопирован в буфер обмена', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showNotification('Ошибка!', 'Не удалось скопировать текст', 'error');
    }
}

// Функция для показа уведомлений
function showNotification(title, message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Добавляем стили для уведомлений
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 300px;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-success {
                border-left: 4px solid #28a745;
            }
            
            .notification-error {
                border-left: 4px solid #dc3545;
            }
            
            .notification-warning {
                border-left: 4px solid #ffc107;
            }
            
            .notification-info {
                border-left: 4px solid #17a2b8;
            }
            
            .notification-content h4 {
                margin: 0 0 4px 0;
                font-size: 14px;
                font-weight: 600;
            }
            
            .notification-content p {
                margin: 0;
                font-size: 12px;
                color: #666;
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #999;
                padding: 4px;
            }
            
            .notification-close:hover {
                color: #333;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Добавляем уведомление на страницу
    document.body.appendChild(notification);
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function generatePaymentComment() {
    // Генерируем уникальный комментарий к платежу
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const comment = `DEP-${timestamp.toString().slice(-6)}-${random.toString().padStart(3, '0')}`;
    
    const commentElement = document.getElementById('paymentComment');
    if (commentElement) {
        commentElement.textContent = comment;
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Скопировано', 'Текст скопирован в буфер обмена', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Скопировано', 'Текст скопирован в буфер обмена', 'success');
    } catch (err) {
        showToast('Ошибка', 'Не удалось скопировать текст', 'error');
    }
    
    document.body.removeChild(textArea);
}

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('receiptFile');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4A88FF';
            uploadArea.style.background = 'rgba(74, 136, 255, 0.05)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#E5E5E7';
            uploadArea.style.background = 'transparent';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#E5E5E7';
            uploadArea.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
}

function handleFileUpload(file) {
    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
        showToast('Ошибка', 'Пожалуйста, выберите изображение', 'error');
        return;
    }
    
    // Проверяем размер файла (5 МБ)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ошибка', 'Размер файла не должен превышать 5 МБ', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        showReceiptPreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showReceiptPreview(imageSrc) {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('receiptPreview');
    const previewImage = document.getElementById('previewImage');
    
    if (uploadArea && preview && previewImage) {
        uploadArea.style.display = 'none';
        previewImage.src = imageSrc;
        preview.style.display = 'block';
    }
}

function removeReceipt() {
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('receiptPreview');
    const fileInput = document.getElementById('receiptFile');
    
    if (uploadArea && preview && fileInput) {
        uploadArea.style.display = 'block';
        preview.style.display = 'none';
        fileInput.value = '';
    }
}

function submitDeposit() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const hasReceipt = document.getElementById('receiptPreview').style.display !== 'none';
    
    // Валидация
    if (!amount || amount <= 0) {
        showToast('Ошибка', 'Введите сумму пополнения', 'error');
        return;
    }
    
    if (!hasReceipt) {
        showToast('Ошибка', 'Пожалуйста, загрузите чек об оплате', 'error');
        return;
    }
    
    // Отправляем заявку
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    
    // Имитация отправки
    setTimeout(() => {
        showToast('Успех', 'Заявка отправлена! Мы обработаем её в течение 24 часов', 'success');
        
        // Возвращаем кнопку в исходное состояние
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить заявку';
        
        // Очищаем форму
        document.getElementById('depositAmount').value = '';
        removeReceipt();
        generatePaymentComment();
        
        // Возвращаемся на главную через 2 секунды
        setTimeout(() => {
            goBack();
        }, 2000);
    }, 2000);
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

// WebSocket подключение для автоматической синхронизации реквизитов
let wsConnection = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function initializeWebSocket() {
    try {
        // Используем EventSource для Server-Sent Events
        const eventSource = new EventSource('/api/exchange/requisites/ws');
        
        eventSource.onopen = function(event) {
            console.log('WebSocket connection established for requisites sync');
            reconnectAttempts = 0;
        };
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'requisites_updated') {
                    console.log('Requisites updated via WebSocket:', data);
                    
                    // Обновляем реквизиты на странице
                    const currentCurrency = document.querySelector('input[name="currency"]:checked')?.value || 'USD';
                    if (data.data.currency === currentCurrency) {
                        updatePaymentRequisites(currentCurrency);
                        showNotification('Обновление', 'Реквизиты обновлены из CRM', 'info');
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        eventSource.onerror = function(event) {
            console.error('WebSocket connection error:', event);
            
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                
                setTimeout(() => {
                    eventSource.close();
                    initializeWebSocket();
                }, 5000 * reconnectAttempts); // Экспоненциальная задержка
            } else {
                console.error('Max reconnection attempts reached');
                showNotification('Предупреждение', 'Соединение с CRM потеряно. Реквизиты могут быть устаревшими.', 'warning');
            }
        };
        
        // Сохраняем соединение для возможности закрытия
        wsConnection = eventSource;
        
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
    }
}

// Инициализируем WebSocket при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Запускаем WebSocket подключение с небольшой задержкой
    setTimeout(() => {
        initializeWebSocket();
    }, 1000);
});

// Закрываем WebSocket при уходе со страницы
window.addEventListener('beforeunload', function() {
    if (wsConnection) {
        wsConnection.close();
    }
});
