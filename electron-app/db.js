/* ============================================
   Focus - Database Module (better-sqlite3)
   Stores session history for stats and recovery.
   ============================================ */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Database = require('better-sqlite3');

const SCHEMA_VERSION = 2;

let db = null;

function getDbPath() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }
  return path.join(userData, 'focus.db');
}

function initDb() {
  if (db) return db;

  const dbPath = getDbPath();
  console.log('[DB] Opening database at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations();
  return db;
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = db.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get();
  const current = row ? parseInt(row.value, 10) : 0;

  if (current < 1) {
    console.log('[DB] Running migration to v1');
    db.exec(`
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_uuid TEXT NOT NULL UNIQUE,
        phase TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        planned_ms INTEGER NOT NULL,
        actual_ms INTEGER,
        status TEXT NOT NULL,
        cycle_index INTEGER,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
      );
      CREATE INDEX idx_sessions_started_at ON sessions(started_at);
      CREATE INDEX idx_sessions_status ON sessions(status);
    `);
    db.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run('1');
  }

  if (current < 2) {
    console.log('[DB] Running migration to v2 (notes + note_tasks)');
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body_md TEXT NOT NULL DEFAULT '',
        pinned INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
        updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
      );

      CREATE TABLE IF NOT EXISTS note_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
        updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_note_tasks_note_id_sort ON note_tasks(note_id, sort_order ASC);
      CREATE INDEX IF NOT EXISTS idx_note_tasks_done ON note_tasks(done);
    `);
    db.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run(String(SCHEMA_VERSION));
  }
}

const stmts = {
  insertSession: null,
  completeSession: null,
  abandonSession: null,
  findActive: null,
  deleteSession: null,
  todaySessions: null,
  rangeSessions: null,
  listNotesWithTasks: null,
  createNote: null,
  createTask: null,
  toggleTask: null,
};

function prepStmts() {
  stmts.insertSession = db.prepare(`
    INSERT INTO sessions (session_uuid, phase, started_at, planned_ms, status, cycle_index)
    VALUES (@session_uuid, @phase, @started_at, @planned_ms, 'active', @cycle_index)
  `);
  stmts.completeSession = db.prepare(`
    UPDATE sessions
       SET ended_at = @ended_at, actual_ms = @actual_ms, status = 'completed'
     WHERE session_uuid = @session_uuid AND status = 'active'
  `);
  stmts.abandonSession = db.prepare(`
    UPDATE sessions
       SET ended_at = @ended_at, actual_ms = @actual_ms, status = 'abandoned'
     WHERE session_uuid = @session_uuid AND status = 'active'
  `);
  stmts.findActive = db.prepare(`
    SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1
  `);
  stmts.deleteSession = db.prepare(`
    DELETE FROM sessions WHERE session_uuid = ?
  `);
  stmts.rangeSessions = db.prepare(`
    SELECT phase, started_at, ended_at, actual_ms, status
      FROM sessions
     WHERE started_at >= ? AND started_at < ?
     ORDER BY started_at ASC
  `);
  stmts.listNotesWithTasks = db.prepare(`
    SELECT
      n.id AS note_id,
      n.title AS note_title,
      n.body_md AS note_body_md,
      n.updated_at AS note_updated_at,
      t.id AS task_id,
      t.text AS task_text,
      t.done AS task_done,
      t.sort_order AS task_sort_order
    FROM notes n
    LEFT JOIN note_tasks t ON t.note_id = n.id
    WHERE n.archived = 0
    ORDER BY n.updated_at DESC, t.sort_order ASC, t.id ASC
  `);
  stmts.createNote = db.prepare(`
    INSERT INTO notes (title, body_md, updated_at)
    VALUES (@title, @body_md, @updated_at)
  `);
  stmts.createTask = db.prepare(`
    INSERT INTO note_tasks (note_id, text, done, sort_order, updated_at)
    VALUES (@note_id, @text, 0, @sort_order, @updated_at)
  `);
  stmts.toggleTask = db.prepare(`
    UPDATE note_tasks
       SET done = @done, updated_at = @updated_at
     WHERE id = @task_id
  `);
}

function startSession({ sessionUuid, phase, startedAt, plannedMs, cycleIndex }) {
  if (!stmts.insertSession) prepStmts();
  stmts.insertSession.run({
    session_uuid: sessionUuid,
    phase,
    started_at: startedAt,
    planned_ms: plannedMs,
    cycle_index: cycleIndex ?? null,
  });
}

function completeSession({ sessionUuid, endedAt, actualMs }) {
  if (!stmts.completeSession) prepStmts();
  return stmts.completeSession.run({
    session_uuid: sessionUuid,
    ended_at: endedAt,
    actual_ms: actualMs,
  }).changes;
}

function abandonSession({ sessionUuid, endedAt, actualMs }) {
  if (!stmts.abandonSession) prepStmts();
  return stmts.abandonSession.run({
    session_uuid: sessionUuid,
    ended_at: endedAt,
    actual_ms: actualMs,
  }).changes;
}

function findActiveSession() {
  if (!stmts.findActive) prepStmts();
  return stmts.findActive.get() || null;
}

function deleteSession(sessionUuid) {
  if (!stmts.deleteSession) prepStmts();
  return stmts.deleteSession.run(sessionUuid).changes;
}

function getStats() {
  if (!stmts.rangeSessions) prepStmts();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgoStart = startOfToday - 6 * dayMs;
  const tomorrowStart = startOfToday + dayMs;

  const rows = stmts.rangeSessions.all(sevenDaysAgoStart, tomorrowStart);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfToday - i * dayMs;
    days.push({
      dayStart,
      label: new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' }),
      focusMs: 0,
      pomodoros: 0,
    });
  }

  let todayFocusMs = 0;
  let todayPomodoros = 0;

  for (const r of rows) {
    if (r.status !== 'completed') continue;
    if (r.phase !== 'work' && r.phase !== 'Work') continue;

    const ms = r.actual_ms || 0;
    const dayIndex = Math.floor((r.started_at - sevenDaysAgoStart) / dayMs);
    if (dayIndex >= 0 && dayIndex < 7) {
      days[dayIndex].focusMs += ms;
      days[dayIndex].pomodoros += 1;
    }
    if (r.started_at >= startOfToday && r.started_at < tomorrowStart) {
      todayFocusMs += ms;
      todayPomodoros += 1;
    }
  }

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].pomodoros > 0) streak++;
    else if (i < days.length - 1) break;
  }

  return {
    todayFocusMs,
    todayPomodoros,
    streak,
    days,
  };
}

function listNotes() {
  if (!stmts.listNotesWithTasks) prepStmts();
  const rows = stmts.listNotesWithTasks.all();
  const byId = new Map();

  for (const r of rows) {
    if (!byId.has(r.note_id)) {
      byId.set(r.note_id, {
        id: r.note_id,
        title: r.note_title,
        bodyMd: r.note_body_md,
        updatedAt: r.note_updated_at,
        tasks: [],
      });
    }
    if (r.task_id !== null && r.task_id !== undefined) {
      byId.get(r.note_id).tasks.push({
        id: r.task_id,
        text: r.task_text,
        done: r.task_done === 1,
        sortOrder: r.task_sort_order,
      });
    }
  }

  return Array.from(byId.values());
}

function createNote({ title, bodyMd = '' }) {
  if (!stmts.createNote) prepStmts();
  const now = Date.now();
  const result = stmts.createNote.run({
    title,
    body_md: bodyMd,
    updated_at: now,
  });
  return {
    id: result.lastInsertRowid,
    title,
    bodyMd,
    updatedAt: now,
    tasks: [],
  };
}

function createTask({ noteId, text }) {
  if (!stmts.createTask) prepStmts();
  const now = Date.now();
  const nextSort = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM note_tasks WHERE note_id = ?`).get(noteId);
  const result = stmts.createTask.run({
    note_id: noteId,
    text,
    sort_order: nextSort.next,
    updated_at: now,
  });
  db.prepare(`UPDATE notes SET updated_at = ? WHERE id = ?`).run(now, noteId);
  return {
    id: result.lastInsertRowid,
    noteId,
    text,
    done: false,
    sortOrder: nextSort.next,
    updatedAt: now,
  };
}

function toggleTask({ taskId, done }) {
  if (!stmts.toggleTask) prepStmts();
  const now = Date.now();
  const changes = stmts.toggleTask.run({
    task_id: taskId,
    done: done ? 1 : 0,
    updated_at: now,
  }).changes;
  return { changes, updatedAt: now };
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDb,
  startSession,
  completeSession,
  abandonSession,
  findActiveSession,
  deleteSession,
  getStats,
  listNotes,
  createNote,
  createTask,
  toggleTask,
  close,
};
