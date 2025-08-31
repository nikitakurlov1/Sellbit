// Инициализация страницы технической поддержки
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
});

function initializePage() {
    // Страница готова к использованию
    console.log('Страница технической поддержки загружена');
}

function contactSupport(type) {
    switch(type) {
        case 'telegram':
            // Открываем Telegram
            window.open('https://t.me/SaleBitAdmin', '_blank');
            showToast('Telegram', 'Открываем чат в Telegram', 'info');
            break;
            
        case 'email':
            // Открываем почтовый клиент
            const subject = encodeURIComponent('Техническая поддержка SellBit');
            const body = encodeURIComponent('Здравствуйте! Мне нужна помощь с...');
            window.open(`mailto:support@sellbit.com?subject=${subject}&body=${body}`, '_blank');
            showToast('Email', 'Открываем почтовый клиент', 'info');
            break;
            
        case 'chat':
            // Имитация открытия чата
            showToast('Онлайн чат', 'Чат будет открыт в новом окне', 'info');
            // Здесь можно добавить интеграцию с чат-системой
            setTimeout(() => {
                window.open('https://t.me/SaleBitAdmin', '_blank');
            }, 1000);
            break;
    }
}

function toggleFAQ(item) {
    // Закрываем все другие FAQ
    const allFAQ = document.querySelectorAll('.faq-item');
    allFAQ.forEach(faq => {
        if (faq !== item) {
            faq.classList.remove('active');
        }
    });
    
    // Переключаем текущий FAQ
    item.classList.toggle('active');
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
