// Подробная информация о криптовалютах
window.CoinData = {
    // Bitcoin
    'bitcoin': {
        name: 'Bitcoin',
        symbol: 'BTC',
        description: 'Bitcoin (BTC) - первая и самая известная криптовалюта, созданная в 2009 году Сатоши Накамото. Это децентрализованная цифровая валюта, которая работает на технологии блокчейн.',
        algorithm: 'SHA-256',
        maxSupply: '21,000,000 BTC',
        blockTime: '~10 минут',
        creator: 'Satoshi Nakamoto',
        founded: '2009',
        consensus: 'Proof of Work',
        features: ['Первая криптовалюта', 'Наибольшая рыночная капитализация', 'Высокая безопасность']
    },
    
    // Ethereum
    'ethereum': {
        name: 'Ethereum',
        symbol: 'ETH',
        description: 'Ethereum (ETH) - платформа для создания децентрализованных приложений (dApps) и смарт-контрактов. Основана Виталиком Бутериным в 2015 году.',
        algorithm: 'Ethash → Proof of Stake',
        maxSupply: 'Неограничен',
        blockTime: '~12 секунд',
        creator: 'Vitalik Buterin',
        founded: '2015',
        consensus: 'Proof of Stake',
        features: ['Смарт-контракты', 'DeFi платформа', 'NFT поддержка']
    },
    
    // Binance Coin
    'binancecoin': {
        name: 'Binance Coin',
        symbol: 'BNB',
        description: 'Binance Coin (BNB) - нативная криптовалюта экосистемы Binance. Используется для оплаты комиссий, стейкинга и участия в ICO.',
        algorithm: 'BEP-20',
        maxSupply: '200,000,000 BNB',
        blockTime: '~3 секунды',
        creator: 'Binance',
        founded: '2017',
        consensus: 'Proof of Staked Authority',
        features: ['Скидки на комиссии', 'Стейкинг', 'Binance Smart Chain']
    },
    
    // Solana
    'solana': {
        name: 'Solana',
        symbol: 'SOL',
        description: 'Solana (SOL) - высокопроизводительный блокчейн, способный обрабатывать до 65,000 транзакций в секунду. Использует инновационный механизм консенсуса.',
        algorithm: 'Proof of History',
        maxSupply: 'Неограничен',
        blockTime: '~400 миллисекунд',
        creator: 'Anatoly Yakovenko',
        founded: '2020',
        consensus: 'Proof of Stake + Proof of History',
        features: ['Высокая скорость', 'Низкие комиссии', 'Смарт-контракты']
    },
    
    // Cardano
    'cardano': {
        name: 'Cardano',
        symbol: 'ADA',
        description: 'Cardano (ADA) - блокчейн-платформа третьего поколения, построенная на научных принципах и peer-reviewed исследованиях.',
        algorithm: 'Ouroboros',
        maxSupply: '45,000,000,000 ADA',
        blockTime: '~20 секунд',
        creator: 'Charles Hoskinson',
        founded: '2017',
        consensus: 'Proof of Stake',
        features: ['Научный подход', 'Многослойная архитектура', 'Устойчивое развитие']
    },
    
    // Ripple
    'ripple': {
        name: 'Ripple',
        symbol: 'XRP',
        description: 'Ripple (XRP) - криптовалюта и платежный протокол, предназначенный для быстрых и дешевых международных денежных переводов.',
        algorithm: 'Consensus Protocol',
        maxSupply: '100,000,000,000 XRP',
        blockTime: '~3-5 секунд',
        creator: 'Ripple Labs',
        founded: '2012',
        consensus: 'Consensus Protocol',
        features: ['Быстрые переводы', 'Низкие комиссии', 'Банковские партнерства']
    },
    
    // Polkadot
    'polkadot': {
        name: 'Polkadot',
        symbol: 'DOT',
        description: 'Polkadot (DOT) - протокол для блокчейн-интероперабельности, позволяющий различным блокчейнам обмениваться данными и транзакциями.',
        algorithm: 'Nominated Proof of Stake',
        maxSupply: 'Неограничен',
        blockTime: '~6 секунд',
        creator: 'Gavin Wood',
        founded: '2020',
        consensus: 'Nominated Proof of Stake',
        features: ['Интероперабельность', 'Парачейны', 'Обновления без форков']
    },
    
    // Dogecoin
    'dogecoin': {
        name: 'Dogecoin',
        symbol: 'DOGE',
        description: 'Dogecoin (DOGE) - криптовалюта, созданная как шутка на основе популярного интернет-мема с собакой. Стала популярной благодаря сообществу.',
        algorithm: 'Scrypt',
        maxSupply: 'Неограничен',
        blockTime: '~1 минута',
        creator: 'Billy Markus & Jackson Palmer',
        founded: '2013',
        consensus: 'Proof of Work',
        features: ['Сообщество', 'Благотворительность', 'Низкие комиссии']
    },
    
    // Avalanche
    'avalanche': {
        name: 'Avalanche',
        symbol: 'AVAX',
        description: 'Avalanche (AVAX) - платформа для создания децентрализованных приложений и финансовых инструментов с высокой производительностью.',
        algorithm: 'Avalanche Consensus',
        maxSupply: '720,000,000 AVAX',
        blockTime: '~2 секунды',
        creator: 'Emin Gün Sirer',
        founded: '2020',
        consensus: 'Avalanche Consensus',
        features: ['Высокая производительность', 'Субсети', 'Совместимость с EVM']
    },
    
    // Chainlink
    'chainlink': {
        name: 'Chainlink',
        symbol: 'LINK',
        description: 'Chainlink (LINK) - децентрализованная сеть оракулов, обеспечивающая связь между блокчейнами и внешними источниками данных.',
        algorithm: 'Ethereum ERC-20',
        maxSupply: '1,000,000,000 LINK',
        blockTime: '~15 секунд',
        creator: 'Sergey Nazarov',
        founded: '2017',
        consensus: 'Proof of Stake',
        features: ['Оракулы', 'Децентрализованные данные', 'Смарт-контракты']
    },
    
    // Polygon
    'matic-network': {
        name: 'Polygon',
        symbol: 'MATIC',
        description: 'Polygon (MATIC) - решение для масштабирования Ethereum, обеспечивающее быстрые и дешевые транзакции через сайдчейны.',
        algorithm: 'Proof of Stake',
        maxSupply: '10,000,000,000 MATIC',
        blockTime: '~2 секунды',
        creator: 'Polygon Team',
        founded: '2017',
        consensus: 'Proof of Stake',
        features: ['Масштабирование Ethereum', 'Низкие комиссии', 'Совместимость с EVM']
    },
    
    // Uniswap
    'uniswap': {
        name: 'Uniswap',
        symbol: 'UNI',
        description: 'Uniswap (UNI) - децентрализованная биржа (DEX) на Ethereum, позволяющая обменивать токены без посредников.',
        algorithm: 'Ethereum ERC-20',
        maxSupply: '1,000,000,000 UNI',
        blockTime: '~15 секунд',
        creator: 'Hayden Adams',
        founded: '2018',
        consensus: 'Proof of Stake',
        features: ['Децентрализованная торговля', 'Автоматические маркет-мейкеры', 'Ликвидность']
    },
    
    // Litecoin
    'litecoin': {
        name: 'Litecoin',
        symbol: 'LTC',
        description: 'Litecoin (LTC) - криптовалюта, созданная как "серебряная" альтернатива Bitcoin. Использует алгоритм Scrypt для майнинга.',
        algorithm: 'Scrypt',
        maxSupply: '84,000,000 LTC',
        blockTime: '~2.5 минуты',
        creator: 'Charlie Lee',
        founded: '2011',
        consensus: 'Proof of Work',
        features: ['Быстрые транзакции', 'Низкие комиссии', 'Совместимость с Bitcoin']
    },
    
    // Stellar
    'stellar': {
        name: 'Stellar',
        symbol: 'XLM',
        description: 'Stellar (XLM) - открытая сеть для финансовых операций, позволяющая переводить деньги и токены быстро и дешево.',
        algorithm: 'Stellar Consensus Protocol',
        maxSupply: '50,000,000,000 XLM',
        blockTime: '~3-5 секунд',
        creator: 'Jed McCaleb',
        founded: '2014',
        consensus: 'Stellar Consensus Protocol',
        features: ['Быстрые переводы', 'Низкие комиссии', 'Финансовая доступность']
    },
    
    // Cosmos
    'cosmos': {
        name: 'Cosmos',
        symbol: 'ATOM',
        description: 'Cosmos (ATOM) - экосистема блокчейнов, предназначенная для решения проблем масштабируемости и интероперабельности.',
        algorithm: 'Tendermint',
        maxSupply: 'Неограничен',
        blockTime: '~7 секунд',
        creator: 'Jae Kwon',
        founded: '2019',
        consensus: 'Proof of Stake',
        features: ['Интероперабельность', 'Масштабируемость', 'Совместная безопасность']
    },
    
    // Monero
    'monero': {
        name: 'Monero',
        symbol: 'XMR',
        description: 'Monero (XMR) - приватная криптовалюта, обеспечивающая полную анонимность транзакций через криптографические методы.',
        algorithm: 'RandomX',
        maxSupply: 'Неограничен',
        blockTime: '~2 минуты',
        creator: 'Monero Core Team',
        founded: '2014',
        consensus: 'Proof of Work',
        features: ['Приватность', 'Анонимность', 'Отслеживание транзакций невозможно']
    },
    
    // Algorand
    'algorand': {
        name: 'Algorand',
        symbol: 'ALGO',
        description: 'Algorand (ALGO) - блокчейн-платформа, использующая Pure Proof of Stake для обеспечения безопасности и децентрализации.',
        algorithm: 'Pure Proof of Stake',
        maxSupply: '10,000,000,000 ALGO',
        blockTime: '~4.5 секунды',
        creator: 'Silvio Micali',
        founded: '2019',
        consensus: 'Pure Proof of Stake',
        features: ['Чистый Proof of Stake', 'Высокая безопасность', 'Масштабируемость']
    },
    
    // VeChain
    'vechain': {
        name: 'VeChain',
        symbol: 'VET',
        description: 'VeChain (VET) - блокчейн-платформа для управления цепочками поставок и бизнес-процессов с использованием IoT и RFID.',
        algorithm: 'Proof of Authority',
        maxSupply: '86,712,634,466 VET',
        blockTime: '~10 секунд',
        creator: 'Sunny Lu',
        founded: '2015',
        consensus: 'Proof of Authority',
        features: ['Управление цепочками поставок', 'IoT интеграция', 'Бизнес-решения']
    },
    
    // Filecoin
    'filecoin': {
        name: 'Filecoin',
        symbol: 'FIL',
        description: 'Filecoin (FIL) - децентрализованная сеть хранения данных, позволяющая пользователям арендовать неиспользуемое дисковое пространство.',
        algorithm: 'Proof of Replication & Proof of Spacetime',
        maxSupply: '2,000,000,000 FIL',
        blockTime: '~30 секунд',
        creator: 'Protocol Labs',
        founded: '2017',
        consensus: 'Proof of Replication & Proof of Spacetime',
        features: ['Децентрализованное хранение', 'Майнинг хранения', 'IPFS интеграция']
    },
    
    // Internet Computer
    'internet-computer': {
        name: 'Internet Computer',
        symbol: 'ICP',
        description: 'Internet Computer (ICP) - блокчейн-платформа, стремящаяся стать "интернетом компьютеров" для децентрализованных приложений.',
        algorithm: 'Threshold Relay',
        maxSupply: 'Неограничен',
        blockTime: '~2 секунды',
        creator: 'DFINITY Foundation',
        founded: '2021',
        consensus: 'Threshold Relay',
        features: ['Децентрализованный интернет', 'Высокая производительность', 'Смарт-контракты']
    }
};

// Функция для получения информации о монете по ID
window.getCoinInfo = function(coinId) {
    return window.CoinData[coinId] || {
        name: 'Неизвестная монета',
        symbol: '???',
        description: 'Информация об этой монете пока недоступна.',
        algorithm: 'N/A',
        maxSupply: 'N/A',
        blockTime: 'N/A',
        creator: 'N/A',
        founded: 'N/A',
        consensus: 'N/A',
        features: []
    };
};
