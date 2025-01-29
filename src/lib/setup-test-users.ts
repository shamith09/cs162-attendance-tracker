import mysql from 'mysql2/promise';

async function setupTestUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'attendance_tracker'
  });

  try {
    await connection.query(`
      INSERT INTO users (id, name, email, is_admin)
      VALUES 
        (UUID(), 'Test Admin', 'admin@test.com', TRUE),
        (UUID(), 'Test Student', 'student@test.com', FALSE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        is_admin = VALUES(is_admin);
    `);
    console.log("Test users added successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error adding test users:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupTestUsers(); 