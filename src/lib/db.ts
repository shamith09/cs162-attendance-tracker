import mysql from 'mysql2/promise';

const pool = mysql.createPool(
  process.env.NODE_ENV === 'production' 
    ? {
        host: process.env.MYSQL_PUBLIC_URL?.split('@')[1]?.split(':')[0],
        port: Number(process.env.MYSQLPORT),
        user: process.env.MYSQLUSER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQLDATABASE,
        ssl: {
          rejectUnauthorized: true
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      }
    : {
        socketPath: '/tmp/mysql.sock',
        user: process.env.MYSQLUSER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQLDATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      }
);

export default pool; 