const bcrypt = require('bcryptjs');
const db = require('./database');

async function initializeAdmin() {
    try {
        console.log('Initializing admin user...');
        
        // Check if admin already exists
        const existingAdmin = await db.getUserByEmail('admin@sellbit.com');
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }
        
        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const adminUser = {
            id: 'admin_' + Date.now(),
            username: 'admin',
            email: 'admin@sellbit.com',
            password: hashedPassword,
            status: 'active',
            notes: 'Default administrator account',
            createdAt: new Date().toISOString()
        };
        
        await db.createUser(adminUser);
        console.log('Admin user created successfully');
        
        // Create admin account
        const adminAccount = {
            id: 'admin_acc_' + Date.now(),
            userId: adminUser.id,
            balance: {
                USD: 10000, // Starting balance for testing
                BTC: 0,
                ETH: 0
            },
            createdAt: new Date().toISOString()
        };
        
        await db.createAccount(adminAccount);
        console.log('Admin account created with $10,000 balance');
        
        // Assign admin role
        const adminRole = await db.getRoleByName('Админ');
        if (adminRole) {
            const userRole = {
                id: 'admin_role_' + Date.now(),
                userId: adminUser.id,
                roleId: adminRole.id,
                assignedBy: adminUser.id,
                assignedAt: new Date().toISOString()
            };
            
            await db.assignRoleToUser(userRole);
            console.log('Admin role assigned successfully');
        }
        
        console.log('✅ Admin initialization completed!');
        console.log('📧 Email: admin@sellbit.com');
        console.log('🔑 Password: admin123');
        console.log('💰 Starting balance: $10,000');
        
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
}

// Run initialization
initializeAdmin().then(() => {
    console.log('Admin initialization script completed');
    process.exit(0);
}).catch(error => {
    console.error('Admin initialization failed:', error);
    process.exit(1);
});
