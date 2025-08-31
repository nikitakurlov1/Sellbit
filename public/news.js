// Инициализация страницы новостей
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    loadNews();
});

// Данные о новостях
const newsData = [
    {
        id: 1,
        title: 'Bitcoin достиг нового максимума в $120,000',
        excerpt: 'Крупнейшая криптовалюта по капитализации преодолела психологический барьер в $120,000, что вызвало всплеск активности на рынке.',
        category: 'bitcoin',
        source: 'CryptoNews',
        time: '2 часа назад',
        views: '15.2K',
        featured: true,
        popularity: 95
    },
    {
        id: 2,
        title: 'Ethereum 2.0: Обновление Beacon Chain успешно запущено',
        excerpt: 'Долгожданное обновление Ethereum 2.0 наконец-то запущено, что должно значительно улучшить масштабируемость сети.',
        category: 'ethereum',
        source: 'ETHNews',
        time: '4 часа назад',
        views: '12.8K',
        featured: true,
        popularity: 88
    },
    {
        id: 3,
        title: 'Новые правила регулирования криптовалют в ЕС',
        excerpt: 'Европейский союз представил новые правила регулирования криптовалютной индустрии, которые вступят в силу в следующем году.',
        category: 'regulation',
        source: 'CryptoRegulation',
        time: '6 часов назад',
        views: '9.5K',
        featured: false,
        popularity: 82
    },
    {
        id: 4,
        title: 'DeFi протоколы показывают рекордную активность',
        excerpt: 'Общая заблокированная стоимость в DeFi протоколах достигла нового рекорда, превысив $200 миллиардов.',
        category: 'defi',
        source: 'DeFiPulse',
        time: '8 часов назад',
        views: '7.3K',
        featured: false,
        popularity: 75
    },
    {
        id: 5,
        title: 'NFT коллекция продана за $50 миллионов',
        excerpt: 'Редкая коллекция NFT была продана на аукционе за рекордную сумму, что подтверждает растущий интерес к цифровому искусству.',
        category: 'nft',
        source: 'NFTWorld',
        time: '10 часов назад',
        views: '6.1K',
        featured: false,
        popularity: 68
    },
    {
        id: 6,
        title: 'Solana обгоняет Ethereum по скорости транзакций',
        excerpt: 'Блокчейн Solana демонстрирует впечатляющую производительность, обрабатывая более 65,000 транзакций в секунду.',
        category: 'ethereum',
        source: 'BlockchainNews',
        time: '12 часов назад',
        views: '5.8K',
        featured: false,
        popularity: 72
    },
    {
        id: 7,
        title: 'Центральные банки изучают CBDC',
        excerpt: 'Более 80% центральных банков мира активно изучают возможность выпуска цифровых валют центральных банков.',
        category: 'regulation',
        source: 'CentralBanking',
        time: '14 часов назад',
        views: '4.9K',
        featured: false,
        popularity: 65
    },
    {
        id: 8,
        title: 'Новый DeFi протокол привлекает $100M инвестиций',
        excerpt: 'Инновационный DeFi протокол привлек крупные инвестиции от ведущих венчурных фондов.',
        category: 'defi',
        source: 'VentureCrypto',
        time: '16 часов назад',
        views: '4.2K',
        featured: false,
        popularity: 58
    },
    {
        id: 9,
        title: 'Bitcoin ETF одобрен в Канаде',
        excerpt: 'Канадские регуляторы одобрили первый в мире Bitcoin ETF, что может открыть путь для институциональных инвесторов.',
        category: 'bitcoin',
        source: 'CryptoETF',
        time: '18 часов назад',
        views: '3.7K',
        featured: false,
        popularity: 85
    },
    {
        id: 10,
        title: 'NFT рынок растет на 300%',
        excerpt: 'Объем торгов NFT вырос на 300% по сравнению с прошлым месяцем, демонстрируя растущий интерес к цифровым активам.',
        category: 'nft',
        source: 'NFTMarket',
        time: '20 часов назад',
        views: '3.1K',
        featured: false,
        popularity: 62
    }
];

let currentFilter = 'all';
let currentSort = 'latest';

function initializePage() {
    console.log('Страница новостей загружена');
}

function loadNews() {
    loadFeaturedNews();
    loadAllNews();
}

function loadFeaturedNews() {
    const featuredNews = newsData.filter(news => news.featured);
    const container = document.getElementById('featuredNews');
    
    if (!container) return;

    container.innerHTML = featuredNews.map(news => {
        return `
            <div class="featured-article" onclick="openNewsArticle(${news.id})">
                <div class="article-header">
                    <div class="article-category">${getCategoryName(news.category)}</div>
                    <div class="article-time">${news.time}</div>
                </div>
                <div class="article-title">${news.title}</div>
                <div class="article-excerpt">${news.excerpt}</div>
                <div class="article-meta">
                    <div class="article-source">
                        <i class="fas fa-newspaper"></i>
                        ${news.source}
                    </div>
                    <div class="article-views">
                        <i class="fas fa-eye"></i>
                        ${news.views}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadAllNews() {
    const container = document.getElementById('newsList');
    
    if (!container) return;

    const filteredNews = filterNewsByCategory(newsData, currentFilter);
    const sortedNews = sortNewsByCriteria(filteredNews, currentSort);

    container.innerHTML = sortedNews.map(news => {
        return `
            <div class="news-item" onclick="openNewsArticle(${news.id})">
                <div class="news-content">
                    <div class="news-category">${getCategoryName(news.category)}</div>
                    <div class="news-title">${news.title}</div>
                    <div class="news-excerpt">${news.excerpt}</div>
                    <div class="news-meta">
                        <div class="news-time">
                            <i class="fas fa-clock"></i>
                            ${news.time}
                        </div>
                        <div class="news-source">
                            <i class="fas fa-newspaper"></i>
                            ${news.source}
                        </div>
                        <div class="news-views">
                            <i class="fas fa-eye"></i>
                            ${news.views}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterNews(category) {
    currentFilter = category;
    
    // Обновляем активную кнопку категории
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Перезагружаем новости
    loadAllNews();
}

function sortNews(sortBy) {
    currentSort = sortBy;
    
    // Обновляем активную кнопку сортировки
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-sort="${sortBy}"]`).classList.add('active');
    
    // Перезагружаем новости
    loadAllNews();
}

function filterNewsByCategory(news, category) {
    if (category === 'all') {
        return news;
    }
    return news.filter(item => item.category === category);
}

function sortNewsByCriteria(news, sortBy) {
    const sortedNews = [...news];
    
    switch(sortBy) {
        case 'latest':
            // Сортируем по времени (новые первыми)
            return sortedNews.sort((a, b) => {
                const timeA = getTimeInMinutes(a.time);
                const timeB = getTimeInMinutes(b.time);
                return timeA - timeB;
            });
        case 'popular':
            // Сортируем по популярности
            return sortedNews.sort((a, b) => b.popularity - a.popularity);
        default:
            return sortedNews;
    }
}

function getTimeInMinutes(timeString) {
    const match = timeString.match(/(\d+)\s+час/);
    if (match) {
        return parseInt(match[1]) * 60;
    }
    return 0;
}

function getCategoryName(category) {
    const categories = {
        'bitcoin': 'Bitcoin',
        'ethereum': 'Ethereum',
        'regulation': 'Регулирование',
        'defi': 'DeFi',
        'nft': 'NFT'
    };
    return categories[category] || category;
}

function openNewsArticle(newsId) {
    const news = newsData.find(n => n.id === newsId);
    if (news) {
        showToast('Новость', `Открывается: ${news.title}`, 'info');
        // Здесь можно добавить переход на страницу статьи
    }
}

function refreshNews() {
    const refreshBtn = document.querySelector('.refresh-btn i');
    refreshBtn.classList.add('fa-spin');
    
    // Имитация обновления
    setTimeout(() => {
        refreshBtn.classList.remove('fa-spin');
        showToast('Обновлено', 'Новости обновлены', 'success');
        loadNews();
    }, 1000);
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
