CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  ip_hash TEXT,
  user_agent TEXT,
  region TEXT,
  device_type TEXT,
  first_visit_at DATETIME,
  last_visit_at DATETIME,
  visit_count INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  start_at DATETIME,
  end_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event_type TEXT,
  target_url TEXT,
  latency_ms INTEGER,
  timestamp DATETIME,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at);
CREATE INDEX IF NOT EXISTS idx_users_first_visit ON users(first_visit_at);
CREATE INDEX IF NOT EXISTS idx_users_last_visit ON users(last_visit_at);
