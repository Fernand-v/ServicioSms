
const desa ='';  
const prod ='';  

const oracledb = require('oracledb');
async function initialize() {
    try {
        await oracledb.createPool({
            user: 'adcs',
            password: 'centu',
            connectString: desa,
            poolAlias: 'default', 
        });
        console.log('Database connection pool initialized');
    } catch (err) {
        console.error('Error initializing database connection pool:', err);
        throw err;
    }
}

async function close() {
    try {
        await oracledb.getPool('default').close();
        console.log('Database connection pool closed');
    } catch (err) {
        console.error('Error closing database connection pool:', err);
        throw err;
    }
}

module.exports = {
    initialize,
    close
};