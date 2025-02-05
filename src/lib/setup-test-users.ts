import mysql from "mysql2/promise";

async function setupTestUsers() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "attendance_tracker",
  });

  try {
    await connection.query(`
      INSERT INTO users (id, email, name, is_admin)
      VALUES 
        (UUID(), 'admin@test.com', 'Test Admin', TRUE),
        (UUID(), 'admin2@test.com', 'Test Admin 2', TRUE),
        (UUID(), 'student@test.com', 'Test Student', FALSE)
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
