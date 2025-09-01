const db = require('./database');

async function initializeProductionDatabase() {
    try {
        console.log('Initializing production database...');
        
        // Initialize database
        await db.initializeDatabase();
        console.log('Database initialized successfully');
        
        // Initialize roles system
        await require('./init-roles')();
        console.log('Roles system initialized successfully');
        
        // Initialize admin user
        await require('./init-admin')();
        console.log('Admin user initialized successfully');
        
        // Initialize requisites
        await require('./init-requisites')();
        console.log('Requisites initialized successfully');
        
        console.log('Production database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing production database:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeProductionDatabase();
}

module.exports = initializeProductionDatabase;
