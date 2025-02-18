
require('dotenv').config();
const oracledb = require('oracledb');
async function initialize() {
    try {
        await oracledb.createPool({
            user: process.env.PROD_DB_USER,
            password: process.env.PROD_DB_PASSWORD,
            connectString: process.env.PROD_DB_CONNECTSTRING ,
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
