import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function initDB(): void {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(path.join(dataDir, 'kakaotalk.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'direct',
      participant_id TEXT,
      profile_image TEXT,
      last_message TEXT,
      last_message_at TEXT,
      unread_count INTEGER NOT NULL DEFAULT 0,
      owner_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      direction TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS relay_devices (
      device_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_name TEXT,
      registered_at TEXT NOT NULL,
      last_ping_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id, last_message_at);
    CREATE INDEX IF NOT EXISTS idx_relay_user ON relay_devices(user_id);
  `);

  // image_url 컬럼 마이그레이션 (기존 DB 호환)
  try {
    db.exec('ALTER TABLE messages ADD COLUMN image_url TEXT');
  } catch {
    // 이미 존재하는 경우 무시
  }

  // 업로드 디렉토리 생성
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  console.log('[DB] SQLite 초기화 완료');
}

export function getDB(): Database.Database {
  if (!db) throw new Error('DB가 초기화되지 않았습니다. initDB()를 먼저 호출하세요.');
  return db;
}
