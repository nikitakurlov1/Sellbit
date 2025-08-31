const db = require('./database');

async function initializeRequisites() {
    try {
        console.log('Initializing test requisites...');
        
        // Check if requisites already exist
        const existingRequisites = await db.getAllRequisites();
        if (existingRequisites.length > 0) {
            console.log('Requisites already exist, skipping initialization');
            return;
        }
        
        const requisites = [
            {
                id: 'req_card_1',
                type: 'card',
                name: 'Visa Card',
                number: '**** **** **** 1234',
                bank: 'Tinkoff Bank',
                holder: 'IVAN IVANOV',
                status: 'active',
                description: 'Основная карта для пополнения',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'req_account_1',
                type: 'account',
                name: 'Sberbank Account',
                number: '40817810099910004312',
                bank: 'Sberbank',
                holder: 'ООО "СеллБит"',
                status: 'active',
                description: 'Банковский счет для переводов',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'req_crypto_btc',
                type: 'crypto',
                name: 'Bitcoin Wallet',
                number: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                bank: 'Bitcoin Network',
                holder: 'SellBit Exchange',
                status: 'active',
                description: 'Bitcoin кошелек для криптоплатежей',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'req_crypto_eth',
                type: 'crypto',
                name: 'Ethereum Wallet',
                number: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                bank: 'Ethereum Network',
                holder: 'SellBit Exchange',
                status: 'active',
                description: 'Ethereum кошелек для криптоплатежей',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'req_card_2',
                type: 'card',
                name: 'MasterCard',
                number: '**** **** **** 5678',
                bank: 'Alfa Bank',
                holder: 'PETR PETROV',
                status: 'active',
                description: 'Дополнительная карта',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        for (const requisite of requisites) {
            await db.createRequisite(requisite);
            console.log(`Created requisite: ${requisite.name} (${requisite.type})`);
        }
        
        console.log('✅ Requisites initialization completed!');
        console.log(`📋 Created ${requisites.length} test requisites`);
        
    } catch (error) {
        console.error('Error initializing requisites:', error);
    }
}

// Run initialization
initializeRequisites().then(() => {
    console.log('Requisites initialization script completed');
    process.exit(0);
}).catch(error => {
    console.error('Requisites initialization failed:', error);
    process.exit(1);
});
