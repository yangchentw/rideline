PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, name TEXT NOT NULL, starts_at TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', route TEXT NOT NULL, distance REAL NOT NULL, checkpoints TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), name TEXT NOT NULL, token TEXT NOT NULL UNIQUE, joined_at TEXT NOT NULL, UNIQUE(event_id,name));
CREATE TABLE IF NOT EXISTS checkins (event_id TEXT NOT NULL REFERENCES events(id), participant_id TEXT NOT NULL REFERENCES participants(id), checkpoint_id TEXT NOT NULL, arrived_at TEXT NOT NULL, PRIMARY KEY(event_id,participant_id,checkpoint_id));
CREATE INDEX IF NOT EXISTS participants_event ON participants(event_id);
CREATE TABLE IF NOT EXISTS event_keys (event_id TEXT PRIMARY KEY REFERENCES events(id), salt TEXT NOT NULL, hash TEXT NOT NULL);
