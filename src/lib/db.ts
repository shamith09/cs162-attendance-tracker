import mysql from 'mysql2/promise';

const pool = mysql.createPool(
  process.env.NODE_ENV === 'production' 
    ? {
        host: process.env.MYSQLHOST,
        port: Number(process.env.MYSQLPORT),
        user: process.env.MYSQLUSER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: {
          rejectUnauthorized: true
        },
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      }
    : {
        socketPath: '/tmp/mysql.sock',
        user: process.env.MYSQLUSER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQLDATABASE,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0
      }
);

export default pool; 