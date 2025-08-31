const db = require('./database');

async function initializeRoles() {
    try {
        console.log('Initializing default roles...');
        
        // Check if roles already exist
        const existingRoles = await db.getAllRoles();
        if (existingRoles.length > 0) {
            console.log('Roles already exist, skipping initialization');
            return;
        }
        
        // Create Admin role
        const adminRole = {
            id: 'admin_role_' + Date.now(),
            name: 'Админ',
            description: 'Полный доступ ко всем функциям системы',
            permissions: {
                users: { read: true, write: true, delete: true },
                coins: { read: true, write: true, delete: true },
                requisites: { read: true, write: true, delete: true },
                transactions: { read: true, write: true, delete: true },
                portfolio: { read: true, write: true, delete: true }
            },
            createdAt: new Date().toISOString()
        };
        
        await db.createRole(adminRole);
        console.log('✅ Admin role created');
        
        // Create User role
        const userRole = {
            id: 'user_role_' + Date.now(),
            name: 'Пользователь',
            description: 'Базовые права для работы с криптовалютой',
            permissions: {
                coins: { read: true },
                portfolio: { read: true, write: true },
                transactions: { read: true, write: true }
            },
            createdAt: new Date().toISOString()
        };
        
        await db.createRole(userRole);
        console.log('✅ User role created');
        
        // Create Guest role
        const guestRole = {
            id: 'guest_role_' + Date.now(),
            name: 'Гость',
            description: 'Только просмотр криптовалют',
            permissions: {
                coins: { read: true }
            },
            createdAt: new Date().toISOString()
        };
        
        await db.createRole(guestRole);
        console.log('✅ Guest role created');
        
        console.log('🎉 All default roles initialized successfully!');
        
    } catch (error) {
        console.error('Error initializing roles:', error);
    }
}

// Run initialization
initializeRoles().then(() => {
    console.log('Role initialization script completed');
    process.exit(0);
}).catch(error => {
    console.error('Role initialization failed:', error);
    process.exit(1);
});
