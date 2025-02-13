CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS recurring_sessions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS roster_students (
  id VARCHAR(36) PRIMARY KEY,
  recurring_session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recurring_session_id) REFERENCES recurring_sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_roster_student (recurring_session_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  expiration_seconds INT DEFAULT 300,
  recurring_session_id VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (recurring_session_id) REFERENCES recurring_sessions(id)
);

CREATE TABLE IF NOT EXISTS attendance_codes (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_excused BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS code_validations (
  id VARCHAR(36) PRIMARY KEY,
  code_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (code_id) REFERENCES attendance_codes(id)
);

-- Add TTL index to automatically clean up old codes
CREATE EVENT IF NOT EXISTS cleanup_old_codes
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM attendance_codes 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
