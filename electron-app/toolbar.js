/* ============================================
   Toolbar Renderer Process
   Handles toolbar button clicks and syncs with main window
   ============================================ */

const { ipcRenderer } = require('electron');

console.log('[Toolbar] Script loaded');

// DOM Elements
const elements = {
  toolbarSettingsBtn: document.getElementById('toolbar-settings-btn'),
  toolbarNotesBtn: document.getElementById('toolbar-notes-btn'),
  toolbarNotesPanel: document.getElementById('toolbar-notes-panel'),
  toolbarNoteInput: document.getElementById('toolbar-note-input'),
  addNoteDot: document.getElementById('add-note-dot'),
  addNoteForm: document.getElementById('timeline-add-form'),
  toolbarNotesList: document.getElementById('toolbar-notes-list'),
  projectFilterRow: document.getElementById('project-filter-row'),
  projectPicker: document.getElementById('project-picker'),
  projPickList: document.getElementById('proj-pick-list'),
  projPickInput: document.getElementById('proj-pick-input'),
};

const PROJECT_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#e8572a'];

let notesPreferredWidth  = parseInt(localStorage.getItem('toolbar-notes-width')  || '320', 10);
let notesPreferredHeight = parseInt(localStorage.getItem('toolbar-notes-height') || '320', 10);

const notesState = {
  isOpen: false,
  notes: [],
  openNoteIds: new Set(),
  addFormOpen: false,
  taskModes: new Map(),     // noteId → 'task' | 'text'
  selected: null,           // { type, noteId, taskId?, isTextType?, el }
  activeTaskId: null,       // task currently linked to timer
  activeNoteId: null,       // note currently linked to timer (mutually exclusive with activeTaskId)
  taskRunSince: null,       // Date.now() when active item's timer started
  timerRunState: 'idle',    // mirrors renderer runState
  projects: [],             // list of { id, name, color }
  activeProjectId: null,    // null = show all; project id = filter to that project
  pickerNoteId: null,       // which note's project picker is currently open
  undoStack: [],            // [{ type:'task'|'note', ... }] — max 10 entries
};

function formatTaskTime(ms) {
  if (!ms || ms < 1000) return '';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

let liveTicker = null;

function startLiveTicker() {
  if (liveTicker) clearInterval(liveTicker);
  liveTicker = setInterval(() => {
    if (notesState.timerRunState !== 'running' || !notesState.taskRunSince) { stopLiveTicker(); return; }
    const sessionMs = Date.now() - notesState.taskRunSince;
    if (notesState.activeTaskId) {
      let savedMs = 0;
      for (const note of notesState.notes) {
        const task = (note.tasks || []).find((t) => t.id === notesState.activeTaskId);
        if (task) { savedMs = task.timeMs || 0; break; }
      }
      const row = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.task-row[data-task-id="${notesState.activeTaskId}"]`);
      if (row) updateTaskTimeDisplay(row, savedMs + sessionMs);
    } else if (notesState.activeNoteId) {
      const noteEl = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${notesState.activeNoteId}"]`);
      if (noteEl) {
        let savedMs = 0;
        const note = notesState.notes.find((n) => n.id === notesState.activeNoteId);
        if (note) savedMs = note.timeMs || 0;
        const timeSpan = noteEl.querySelector('.note-time');
        if (timeSpan) timeSpan.textContent = formatTaskTime(savedMs + sessionMs);
      }
    }
  }, 500);
}

function stopLiveTicker() {
  if (liveTicker) { clearInterval(liveTicker); liveTicker = null; }
}
/* ============================================
   Button Handlers
   ============================================ */

function handleSettings() {
  console.log('[Toolbar] Settings clicked');
  ipcRenderer.send('toolbar-action', 'settings');
}

function handleNotes() {
  console.log('[Toolbar] Notes clicked');
  toggleNotesPanel();
}

/* ============================================
   Update Toolbar State
   ============================================ */

// Listen for state updates from main process
ipcRenderer.on('timer-state-update', (event, state) => {
  const prev = notesState.timerRunState;
  notesState.timerRunState = state.runState;

  if (prev === 'running' && state.runState !== 'running') {
    recordActiveTime();
    stopLiveTicker();
  }
  if (prev !== 'running' && state.runState === 'running' && (notesState.activeTaskId || notesState.activeNoteId)) {
    notesState.taskRunSince = Date.now();
    startLiveTicker();
  }

});

function toggleNotesPanel(forceOpen = null) {
  notesState.isOpen = forceOpen === null ? !notesState.isOpen : !!forceOpen;
  document.body.classList.toggle('notes-open', notesState.isOpen);
  ipcRenderer.send('toolbar-notes-visibility', {
    open: notesState.isOpen,
    width: notesPreferredWidth,
    height: notesPreferredHeight,
  });
  if (notesState.isOpen) {
    loadNotes();
  } else {
    // Reset add form when closing panel
    notesState.addFormOpen = false;
    if (elements.addNoteForm) elements.addNoteForm.classList.remove('is-open');
    stopLiveTicker();
  }
}

function loadNotes() {
  Promise.all([
    ipcRenderer.invoke('notes-list'),
    ipcRenderer.invoke('project-list'),
  ]).then(([notesRes, projRes]) => {
    if (notesRes && notesRes.ok) notesState.notes = Array.isArray(notesRes.notes) ? notesRes.notes : [];
    if (projRes && projRes.ok) notesState.projects = Array.isArray(projRes.projects) ? projRes.projects : [];
    renderProjectFilter();
    renderNotes();
  }).catch((err) => {
    console.warn('[Toolbar] load failed:', err);
  });
}

function renderNotes() {
  if (!elements.toolbarNotesList) return;
  clearSelection();

  const visibleNotes = notesState.activeProjectId
    ? notesState.notes.filter((n) => n.projectId === notesState.activeProjectId)
    : notesState.notes;

  if (!visibleNotes.length) {
    elements.toolbarNotesList.innerHTML = '<div class="timeline-empty">No notes yet</div>';
    return;
  }

  elements.toolbarNotesList.innerHTML = visibleNotes.map((note) => {
    const isOpen = notesState.openNoteIds.has(note.id);
    const noteTotalMs = (note.timeMs || 0) + (note.tasks || []).reduce((s, t) => s + (t.timeMs || 0), 0);
    const isNoteTimerActive = notesState.activeNoteId === note.id;
    const tasks = (note.tasks || []).map((task) => {
      const timeLabel = formatTaskTime(task.timeMs);
      const isActive = notesState.activeTaskId === task.id;
      const editBtn = `<button class="task-edit-btn" data-task-id="${task.id}" data-note-id="${note.id}" title="Edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>`;
      const delBtn = `<button class="task-delete-btn" data-task-id="${task.id}" data-note-id="${note.id}">×</button>`;
      if (task.taskType === 'text') {
        return `
          <div class="task-row text-type" data-task-id="${task.id}" data-note-id="${note.id}">
            <span class="task-text">${escapeHtml(task.text)}</span>
            ${timeLabel ? `<span class="task-time">${timeLabel}</span>` : ''}
            ${editBtn}${delBtn}
          </div>
        `;
      }
      return `
        <label class="task-row ${task.done ? 'done' : ''}${isActive ? ' is-active-task' : ''}" data-task-id="${task.id}" data-note-id="${note.id}">
          <input type="checkbox" data-task-id="${task.id}" ${task.done ? 'checked' : ''} />
          <span class="task-text">${escapeHtml(task.text)}</span>
          ${timeLabel ? `<span class="task-time">${timeLabel}</span>` : ''}
          ${editBtn}${delBtn}
        </label>
      `;
    }).join('');

    return `
      <div class="timeline-note${isOpen ? ' is-open' : ''}" data-note-id="${note.id}">
        <div class="timeline-node">
          <div class="timeline-dot${noteTotalMs > 0 ? ' has-time' : ''}${isNoteTimerActive ? ' is-timer-active' : ''}" data-note-id="${note.id}"></div>
        </div>
        <div class="timeline-note-card">
          <div class="timeline-note-header" data-note-id="${note.id}">
            ${note.projectId ? `<span class="note-project-badge" style="color:${note.projectColor};border-color:${note.projectColor}40;background:${note.projectColor}18" data-note-id="${note.id}" title="${escapeHtml(note.projectName)}">${escapeHtml(note.projectName.length > 10 ? note.projectName.slice(0, 10) + '…' : note.projectName)}</span>` : ''}
            <span class="note-title">${escapeHtml(note.title)}</span>
            ${isOpen && noteTotalMs > 0 ? `<span class="note-time">${formatTaskTime(noteTotalMs)}</span>` : ''}
            <div class="timeline-note-actions">
              <button class="note-action-btn note-project-btn" data-note-id="${note.id}" title="Assign project">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </button>
              <button class="note-action-btn note-edit-btn" data-note-id="${note.id}" title="Edit note title">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="note-action-btn note-delete-btn" data-note-id="${note.id}" title="Delete note">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/>
                  <line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="timeline-note-body">
            <div class="timeline-tasks">${tasks}</div>
            <div class="task-add-row">
              <input type="text" data-note-input="${note.id}" data-mode="task" placeholder="+ task" autocomplete="off" spellcheck="false" />
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  elements.toolbarNotesList.querySelectorAll('.timeline-dot[data-note-id]').forEach((node) => {
    node.addEventListener('click', () => toggleNote(parseInt(node.dataset.noteId, 10)));
  });
  elements.toolbarNotesList.querySelectorAll('.timeline-note-header[data-note-id]').forEach((node) => {
    node.addEventListener('click', () => toggleNote(parseInt(node.dataset.noteId, 10)));
  });
  elements.toolbarNotesList.querySelectorAll('input[type="checkbox"][data-task-id]').forEach((node) => {
    node.addEventListener('change', onTaskToggle);
  });
  elements.toolbarNotesList.querySelectorAll('input[data-note-input]').forEach((node) => {
    node.addEventListener('keydown', onTaskInputKeydown);
  });
  elements.toolbarNotesList.querySelectorAll('.note-delete-btn[data-note-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(parseInt(node.dataset.noteId, 10));
    });
  });
  elements.toolbarNotesList.querySelectorAll('.note-edit-btn[data-note-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const noteId = parseInt(node.dataset.noteId, 10);
      const header = node.closest('.timeline-note-header');
      if (!header) return;
      const titleSpan = header.querySelector('.note-title');
      if (!titleSpan) return;
      startInlineEdit(header, titleSpan.textContent, (newTitle) => {
        ipcRenderer.invoke('note-update', { noteId, title: newTitle }).catch(() => {});
        const note = notesState.notes.find((n) => n.id === noteId);
        if (note) note.title = newTitle;
      });
    });
  });
  elements.toolbarNotesList.querySelectorAll('.task-delete-btn[data-task-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(parseInt(node.dataset.taskId, 10), parseInt(node.dataset.noteId, 10));
    });
  });
  elements.toolbarNotesList.querySelectorAll('.task-edit-btn[data-task-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      startTaskEdit(parseInt(node.dataset.taskId, 10), parseInt(node.dataset.noteId, 10));
    });
  });
  elements.toolbarNotesList.querySelectorAll('.note-project-btn[data-note-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectPicker(parseInt(node.dataset.noteId, 10), node);
    });
  });
  elements.toolbarNotesList.querySelectorAll('.note-project-badge[data-note-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = node.closest('.timeline-note').querySelector('.note-project-btn');
      openProjectPicker(parseInt(node.dataset.noteId, 10), btn || node);
    });
  });
}

function toggleAddForm() {
  notesState.addFormOpen = !notesState.addFormOpen;
  if (elements.addNoteForm) {
    elements.addNoteForm.classList.toggle('is-open', notesState.addFormOpen);
  }
  if (notesState.addFormOpen && elements.toolbarNoteInput) {
    setTimeout(() => elements.toolbarNoteInput.focus(), 50);
  }
}

function toggleNote(noteId) {
  if (!noteId) return;
  const el = elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
  if (!el) return;
  const isOpen = el.classList.toggle('is-open');
  if (isOpen) {
    notesState.openNoteIds.add(noteId);
  } else {
    notesState.openNoteIds.delete(noteId);
  }
}

function pushUndo(entry) {
  notesState.undoStack.push(entry);
  if (notesState.undoStack.length > 10) notesState.undoStack.shift();
}

function undoDelete() {
  if (!notesState.undoStack.length) return;
  const entry = notesState.undoStack.pop();

  if (entry.type === 'task') {
    const note = notesState.notes.find((n) => n.id === entry.noteId);
    if (!note) return;
    ipcRenderer.invoke('task-create', { noteId: entry.noteId, text: entry.text, taskType: entry.taskType }).then((res) => {
      if (!res || !res.ok || !res.task) return;
      note.tasks = [...(note.tasks || []), { id: res.task.id, text: entry.text, done: false, taskType: entry.taskType, timeMs: 0 }];
      addTaskToDom(res.task.id, entry.text, entry.taskType, entry.noteId);
      const noteEl = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${entry.noteId}"]`);
      if (noteEl && !noteEl.classList.contains('is-open')) toggleNote(entry.noteId);
    }).catch(() => {});

  } else if (entry.type === 'note') {
    ipcRenderer.invoke('note-create', { title: entry.title, bodyMd: entry.bodyMd || '' }).then(async (res) => {
      if (!res || !res.ok || !res.note) return;
      const noteId = res.note.id;
      for (const t of entry.tasks) {
        await ipcRenderer.invoke('task-create', { noteId, text: t.text, taskType: t.taskType }).catch(() => {});
      }
      loadNotes();
    }).catch(() => {});
  }
}

function startTaskEdit(taskId, noteId) {
  const row = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.task-row[data-task-id="${taskId}"]`);
  if (!row) return;
  const textSpan = row.querySelector('.task-text');
  if (!textSpan) return;
  startInlineEdit(row, textSpan.textContent, (newText) => {
    ipcRenderer.invoke('task-update', { taskId, text: newText }).catch(() => {});
    const note = notesState.notes.find((n) => n.id === noteId);
    const task = note && (note.tasks || []).find((t) => t.id === taskId);
    if (task) task.text = newText;
  });
}

function deleteNote(noteId) {
  if (!noteId) return;
  const note = notesState.notes.find((n) => n.id === noteId);
  if (note) pushUndo({ type: 'note', title: note.title, bodyMd: note.bodyMd || '', tasks: (note.tasks || []).map((t) => ({ text: t.text, taskType: t.taskType })) });
  ipcRenderer.invoke('note-delete', { noteId }).then((res) => {
    if (!res || !res.ok) return;
    notesState.notes = notesState.notes.filter((n) => n.id !== noteId);
    notesState.openNoteIds.delete(noteId);
    const noteEl = elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
    if (noteEl) {
      noteEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      noteEl.style.opacity = '0';
      noteEl.style.transform = 'translateX(-8px)';
      setTimeout(() => {
        noteEl.remove();
        if (!notesState.notes.length) {
          elements.toolbarNotesList.innerHTML = '<div class="timeline-empty">No notes yet</div>';
        }
      }, 200);
    }
  }).catch((err) => {
    console.warn('[Toolbar] note-delete failed:', err);
  });
}

function deleteTask(taskId, noteId) {
  if (!taskId || !noteId) return;
  const note = notesState.notes.find((n) => n.id === noteId);
  const task = note && (note.tasks || []).find((t) => t.id === taskId);
  if (task) pushUndo({ type: 'task', noteId, text: task.text, taskType: task.taskType });
  ipcRenderer.invoke('task-delete', { taskId }).then((res) => {
    if (!res || !res.ok) return;
    const note = notesState.notes.find((n) => n.id === noteId);
    if (note) note.tasks = (note.tasks || []).filter((t) => t.id !== taskId);
    const row = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.task-row[data-task-id="${taskId}"]`);
    if (row) {
      row.style.transition = 'opacity 0.15s ease';
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 150);
    }
  }).catch((err) => {
    console.warn('[Toolbar] task-delete failed:', err);
  });
}

function focusNewNote() {
  if (!notesState.isOpen) toggleNotesPanel(true);
  if (!notesState.addFormOpen) {
    notesState.addFormOpen = true;
    if (elements.addNoteForm) elements.addNoteForm.classList.add('is-open');
  }
  if (elements.toolbarNoteInput) setTimeout(() => elements.toolbarNoteInput.focus(), 50);
}

function createNoteFromInput({ focusTask = false } = {}) {
  const input = elements.toolbarNoteInput;
  if (!input) return;
  const title = input.value.trim();
  if (!title) return;

  ipcRenderer.invoke('note-create', { title, bodyMd: '' }).then((res) => {
    if (!res || !res.ok || !res.note) return;
    input.value = '';
    notesState.addFormOpen = false;
    if (elements.addNoteForm) elements.addNoteForm.classList.remove('is-open');
    notesState.notes = [{ ...res.note, tasks: [] }, ...notesState.notes];
    notesState.openNoteIds.add(res.note.id);
    renderNotes();
    if (focusTask) {
      const noteEl = elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${res.note.id}"]`);
      const taskInput = noteEl && noteEl.querySelector('.task-add-row input');
      if (taskInput) setTimeout(() => taskInput.focus(), 50);
    }
  }).catch((err) => {
    console.warn('[Toolbar] note-create failed:', err);
  });
}

function addTaskToDom(taskId, text, taskType, noteId) {
  const noteEl = elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
  if (!noteEl) return;
  const tasksContainer = noteEl.querySelector('.timeline-tasks');
  if (!tasksContainer) return;

  let el;
  const editBtnHtml = `<button class="task-edit-btn" data-task-id="${taskId}" data-note-id="${noteId}" title="Edit">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>`;
  if (taskType === 'text') {
    el = document.createElement('div');
    el.className = 'task-row text-type';
    el.dataset.taskId = taskId;
    el.dataset.noteId = noteId;
    el.innerHTML = `
      <span class="task-text">${escapeHtml(text)}</span>
      ${editBtnHtml}
      <button class="task-delete-btn" data-task-id="${taskId}" data-note-id="${noteId}">×</button>
    `;
  } else {
    el = document.createElement('label');
    el.className = 'task-row';
    el.dataset.taskId = taskId;
    el.dataset.noteId = noteId;
    el.innerHTML = `
      <input type="checkbox" data-task-id="${taskId}" />
      <span class="task-text">${escapeHtml(text)}</span>
      ${editBtnHtml}
      <button class="task-delete-btn" data-task-id="${taskId}" data-note-id="${noteId}">×</button>
    `;
    el.querySelector('input[type="checkbox"]').addEventListener('change', onTaskToggle);
  }
  el.querySelector('.task-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    startTaskEdit(taskId, noteId);
  });
  el.querySelector('.task-delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(taskId, noteId);
  });
  tasksContainer.appendChild(el);
}

function onTaskInputKeydown(event) {
  const input = event.target;
  const noteId = parseInt(input.dataset.noteInput, 10);
  if (!noteId) return;

  if (event.ctrlKey && event.key === 't') {
    event.preventDefault();
    const current = notesState.taskModes.get(noteId) || 'task';
    const next = current === 'task' ? 'text' : 'task';
    notesState.taskModes.set(noteId, next);
    input.dataset.mode = next;
    input.placeholder = next === 'text' ? '+ text  (Ctrl+T: task)' : '+ task  (Ctrl+T: text)';
    return;
  }

  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    const text = input.value.trim();
    const taskType = notesState.taskModes.get(noteId) || 'task';
    const finish = () => toggleNote(noteId);
    if (!text) { finish(); return; }
    ipcRenderer.invoke('task-create', { noteId, text, taskType }).then((res) => {
      if (res && res.ok && res.task) {
        const note = notesState.notes.find((n) => n.id === noteId);
        if (note) note.tasks = [...(note.tasks || []), { id: res.task.id, text, done: false, taskType }];
        input.value = '';
        addTaskToDom(res.task.id, text, taskType, noteId);
      }
      finish();
    }).catch(finish);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const taskType = notesState.taskModes.get(noteId) || 'task';
    ipcRenderer.invoke('task-create', { noteId, text, taskType }).then((res) => {
      if (!res || !res.ok || !res.task) return;
      const note = notesState.notes.find((n) => n.id === noteId);
      if (note) note.tasks = [...(note.tasks || []), { id: res.task.id, text, done: false, taskType }];
      input.value = '';
      addTaskToDom(res.task.id, text, taskType, noteId);
    }).catch((err) => {
      console.warn('[Toolbar] task-create failed:', err);
    });
  }
}

function onTaskToggle(event) {
  const taskId = parseInt(event.target.dataset.taskId, 10);
  const done = !!event.target.checked;
  if (!taskId) return;

  ipcRenderer.invoke('task-toggle', { taskId, done }).then((res) => {
    if (!res || !res.ok) return;
    for (const note of notesState.notes) {
      const task = (note.tasks || []).find((t) => t.id === taskId);
      if (task) task.done = done;
    }
    const row = event.target.closest('.task-row');
    if (row) row.classList.toggle('done', done);
  }).catch((err) => {
    console.warn('[Toolbar] task-toggle failed:', err);
  });
}

/* ============================================
   Navigation & Task Timer
   ============================================ */

function getNavigableItems() {
  const items = [];
  if (!elements.toolbarNotesList) return items;
  elements.toolbarNotesList.querySelectorAll('.timeline-note').forEach((noteEl) => {
    const noteId = parseInt(noteEl.dataset.noteId, 10);
    const headerEl = noteEl.querySelector('.timeline-note-header');
    if (headerEl) items.push({ el: headerEl, type: 'note', noteId });
    if (noteEl.classList.contains('is-open')) {
      noteEl.querySelectorAll('.task-row').forEach((taskEl) => {
        const taskId = parseInt(taskEl.dataset.taskId, 10);
        const isTextType = taskEl.classList.contains('text-type');
        if (taskId) items.push({ el: taskEl, type: 'task', noteId, taskId, isTextType });
      });
    }
  });
  return items;
}

function clearSelection() {
  elements.toolbarNotesList && elements.toolbarNotesList.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
  notesState.selected = null;
}

function selectItem(item) {
  clearSelection();
  if (!item) return;
  notesState.selected = item;
  item.el.classList.add('is-selected');
  item.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function selectNext() {
  const items = getNavigableItems();
  if (!items.length) return;
  if (!notesState.selected) { selectItem(items[0]); return; }
  const idx = items.findIndex((i) => i.type === notesState.selected.type && i.noteId === notesState.selected.noteId && i.taskId === notesState.selected.taskId);
  selectItem(items[Math.min(idx === -1 ? 0 : idx + 1, items.length - 1)]);
}

function selectPrev() {
  const items = getNavigableItems();
  if (!items.length) return;
  if (!notesState.selected) { selectItem(items[items.length - 1]); return; }
  const idx = items.findIndex((i) => i.type === notesState.selected.type && i.noteId === notesState.selected.noteId && i.taskId === notesState.selected.taskId);
  selectItem(items[Math.max(idx <= 0 ? 0 : idx - 1, 0)]);
}

function updateTaskTimeDisplay(row, timeMs) {
  const label = formatTaskTime(timeMs);
  const existing = row.querySelector('.task-time');
  if (label) {
    if (existing) { existing.textContent = label; return; }
    const span = document.createElement('span');
    span.className = 'task-time';
    span.textContent = label;
    const delBtn = row.querySelector('.task-delete-btn');
    if (delBtn) row.insertBefore(span, delBtn); else row.appendChild(span);
  } else if (existing) {
    existing.remove();
  }
}

function updateNoteTimeDisplay(noteId, note) {
  const noteEl = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
  if (!noteEl) return;
  const noteTotalMs = (note.timeMs || 0) + (note.tasks || []).reduce((s, t) => s + (t.timeMs || 0), 0);
  const dot = noteEl.querySelector('.timeline-dot');
  if (dot) dot.classList.toggle('has-time', noteTotalMs > 0);
  if (!noteEl.classList.contains('is-open')) return;
  const header = noteEl.querySelector('.timeline-note-header');
  if (!header) return;
  const label = formatTaskTime(noteTotalMs);
  const existing = header.querySelector('.note-time');
  if (label) {
    if (existing) { existing.textContent = label; return; }
    const span = document.createElement('span');
    span.className = 'note-time';
    span.textContent = label;
    const actions = header.querySelector('.timeline-note-actions');
    header.insertBefore(span, actions);
  } else if (existing) {
    existing.remove();
  }
}

function recordActiveTime() {
  if (!notesState.taskRunSince) return;
  const ms = Date.now() - notesState.taskRunSince;
  notesState.taskRunSince = null;
  if (ms < 1000) return;

  if (notesState.activeNoteId) {
    const noteId = notesState.activeNoteId;
    ipcRenderer.invoke('note-add-time', { noteId, ms }).then((res) => {
      if (!res || !res.ok) return;
      const note = notesState.notes.find((n) => n.id === noteId);
      if (note) { note.timeMs = (note.timeMs || 0) + ms; updateNoteTimeDisplay(noteId, note); }
    }).catch((err) => console.warn('[Toolbar] note-add-time failed:', err));
  } else if (notesState.activeTaskId) {
    const taskId = notesState.activeTaskId;
    ipcRenderer.invoke('task-add-time', { taskId, ms }).then((res) => {
      if (!res || !res.ok) return;
      for (const note of notesState.notes) {
        const task = (note.tasks || []).find((t) => t.id === taskId);
        if (task) {
          task.timeMs = (task.timeMs || 0) + ms;
          const row = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.task-row[data-task-id="${taskId}"]`);
          if (row) updateTaskTimeDisplay(row, task.timeMs);
          updateNoteTimeDisplay(note.id, note);
        }
      }
    }).catch((err) => console.warn('[Toolbar] task-add-time failed:', err));
  }
}

function clearActiveIndicators() {
  if (notesState.activeNoteId) {
    const dot = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${notesState.activeNoteId}"] .timeline-dot`);
    if (dot) dot.classList.remove('is-timer-active');
  }
  if (notesState.activeTaskId) {
    const row = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.task-row[data-task-id="${notesState.activeTaskId}"]`);
    if (row) row.classList.remove('is-active-task');
  }
}

function activateNote(noteId) {
  if (notesState.activeNoteId === noteId && notesState.timerRunState === 'running') return;
  recordActiveTime();
  clearActiveIndicators();
  notesState.activeNoteId = noteId;
  notesState.activeTaskId = null;
  const dot = elements.toolbarNotesList && elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${noteId}"] .timeline-dot`);
  if (dot) dot.classList.add('is-timer-active');
  if (notesState.timerRunState === 'running') {
    notesState.taskRunSince = Date.now();
    startLiveTicker();
  } else {
    notesState.taskRunSince = null;
    ipcRenderer.send('toolbar-action', 'play-if-idle');
  }
}

function activateTask(taskId, taskEl) {
  if (notesState.activeTaskId === taskId && notesState.timerRunState === 'running') return;
  recordActiveTime();
  clearActiveIndicators();
  notesState.activeTaskId = taskId;
  notesState.activeNoteId = null;
  if (taskEl) taskEl.classList.add('is-active-task');
  if (notesState.timerRunState === 'running') {
    notesState.taskRunSince = Date.now();
    startLiveTicker();
  } else {
    notesState.taskRunSince = null;
    ipcRenderer.send('toolbar-action', 'play-if-idle');
  }
}

function activateSelected() {
  const sel = notesState.selected;
  if (!sel) return;
  if (sel.type === 'note') {
    activateNote(sel.noteId);
  } else if (sel.type === 'task' && !sel.isTextType) {
    activateTask(sel.taskId, sel.el);
  }
}

function pauseTimer() {
  if (notesState.timerRunState === 'running') {
    ipcRenderer.send('toolbar-action', 'toggle-play');
  }
}

function startInlineEdit(el, currentText, onCommit) {
  const textEl = el.querySelector('.task-text, .note-title');
  if (!textEl) return;
  const input = document.createElement('input');
  input.className = 'inline-edit-input';
  input.type = 'text';
  input.value = currentText;
  textEl.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const newText = input.value.trim() || currentText;
    const span = document.createElement('span');
    span.className = textEl.className;
    span.textContent = newText;
    input.replaceWith(span);
    if (newText !== currentText) onCommit(newText, span);
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    else if (e.key === 'Escape') { input.value = currentText; input.blur(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      commit();
      const noteId = parseInt(el.closest('.timeline-note') && el.closest('.timeline-note').dataset.noteId, 10);
      if (noteId) {
        const noteEl = elements.toolbarNotesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
        if (noteEl && !noteEl.classList.contains('is-open')) toggleNote(noteId);
        const taskInput = noteEl && noteEl.querySelector('.task-add-row input');
        if (taskInput) setTimeout(() => taskInput.focus(), noteEl && !noteEl.classList.contains('is-open') ? 320 : 30);
      }
    }
  });
}

function editSelected() {
  const sel = notesState.selected;
  if (!sel) return;

  if (sel.type === 'note') {
    const noteId = sel.noteId;
    if (!sel.el.closest('.timeline-note').classList.contains('is-open')) toggleNote(noteId);
    const titleSpan = sel.el.querySelector('.note-title');
    if (!titleSpan) return;
    startInlineEdit(sel.el, titleSpan.textContent, (newTitle) => {
      ipcRenderer.invoke('note-update', { noteId, title: newTitle }).catch(() => {});
      const note = notesState.notes.find((n) => n.id === noteId);
      if (note) note.title = newTitle;
    });
  } else if (sel.type === 'task') {
    const { taskId, noteId } = sel;
    const textSpan = sel.el.querySelector('.task-text');
    if (!textSpan) return;
    startInlineEdit(sel.el, textSpan.textContent, (newText) => {
      ipcRenderer.invoke('task-update', { taskId, text: newText }).catch(() => {});
      const note = notesState.notes.find((n) => n.id === noteId);
      const task = (note && note.tasks || []).find((t) => t.id === taskId);
      if (task) task.text = newText;
    });
  }
}

/* ============================================
   Project Management
   ============================================ */

function renderProjectFilter() {
  const row = elements.projectFilterRow;
  if (!row) return;
  if (!notesState.projects.length) {
    row.style.display = 'none';
    return;
  }
  row.style.display = 'flex';
  const allActive = notesState.activeProjectId === null;
  row.innerHTML = [
    `<button class="proj-filter-pill${allActive ? ' is-active' : ''}" data-pid="all">All</button>`,
    ...notesState.projects.map((p) => {
      const active = notesState.activeProjectId === p.id;
      return `<button class="proj-filter-pill${active ? ' is-active' : ''}" data-pid="${p.id}" style="--proj-color:${p.color}">${escapeHtml(p.name)}</button>`;
    }),
  ].join('');
  row.querySelectorAll('.proj-filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pid;
      notesState.activeProjectId = pid === 'all' ? null : parseInt(pid, 10);
      renderProjectFilter();
      renderNotes();
    });
  });
}

function openProjectPicker(noteId, anchorEl) {
  notesState.pickerNoteId = noteId;
  const picker = elements.projectPicker;
  const list = elements.projPickList;
  const input = elements.projPickInput;
  if (!picker || !list) return;

  const note = notesState.notes.find((n) => n.id === noteId);
  const currentProjectId = note && note.projectId;

  list.innerHTML = [
    `<div class="proj-pick-item${!currentProjectId ? ' is-current' : ''}" data-project-id="">None</div>`,
    ...notesState.projects.map((p) => {
      const active = currentProjectId === p.id;
      return `<div class="proj-pick-item${active ? ' is-current' : ''}" data-project-id="${p.id}"><span style="color:${p.color}">●</span>${escapeHtml(p.name)}</div>`;
    }),
  ].join('');

  list.querySelectorAll('.proj-pick-item').forEach((item) => {
    item.addEventListener('click', () => {
      const pid = item.dataset.projectId ? parseInt(item.dataset.projectId, 10) : null;
      assignNoteProject(noteId, pid);
      closeProjectPicker();
    });
  });

  if (input) input.value = '';

  const rect = anchorEl.getBoundingClientRect();
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = Math.max(4, rect.right - 160) + 'px';
  picker.classList.add('is-open');
  if (input) setTimeout(() => input.focus(), 30);
}

function closeProjectPicker() {
  notesState.pickerNoteId = null;
  if (elements.projectPicker) elements.projectPicker.classList.remove('is-open');
}

function assignNoteProject(noteId, projectId) {
  ipcRenderer.invoke('note-set-project', { noteId, projectId: projectId || null }).then((res) => {
    if (!res || !res.ok) return;
    const note = notesState.notes.find((n) => n.id === noteId);
    if (!note) return;
    const proj = notesState.projects.find((p) => p.id === projectId);
    note.projectId = proj ? proj.id : null;
    note.projectName = proj ? proj.name : null;
    note.projectColor = proj ? proj.color : null;
    renderProjectFilter();
    renderNotes();
  }).catch(() => {});
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================
   Initialization
   ============================================ */

function init() {
  console.log('[Toolbar] Initializing...');
  
  // Set up event listeners
  elements.toolbarSettingsBtn.addEventListener('click', handleSettings);
  elements.toolbarNotesBtn.addEventListener('click', handleNotes);
  if (elements.addNoteDot) {
    elements.addNoteDot.addEventListener('click', toggleAddForm);
  }
  if (elements.toolbarNoteInput) {
    elements.toolbarNoteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNoteFromInput();
      } else if (e.key === 'Tab') {
        if (elements.toolbarNoteInput.value.trim()) {
          e.preventDefault();
          createNoteFromInput({ focusTask: true });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (notesState.addFormOpen) {
          elements.toolbarNoteInput.value = '';
          toggleAddForm();
        } else if (notesState.isOpen) {
          toggleNotesPanel(false);
        }
      }
    });
  }

  // Resize handle
  const resizeHandle = document.getElementById('notes-resize-handle');
  if (resizeHandle) {
    let rsX, rsY, rsW, rsH;
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      rsX = e.screenX;
      rsY = e.screenY;
      rsW = notesPreferredWidth;
      rsH = notesPreferredHeight;
      const onMove = (e) => {
        const newW = Math.max(260, Math.min(520, rsW + (e.screenX - rsX)));
        const newH = Math.max(200, Math.min(640, rsH + (e.screenY - rsY)));
        notesPreferredWidth  = newW;
        notesPreferredHeight = newH;
        localStorage.setItem('toolbar-notes-width',  newW);
        localStorage.setItem('toolbar-notes-height', newH);
        ipcRenderer.send('toolbar-resize', { width: newW, height: newH });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  if (elements.projPickInput) {
    elements.projPickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = elements.projPickInput.value.trim();
        if (!name || !notesState.pickerNoteId) return;
        const color = PROJECT_COLORS[notesState.projects.length % PROJECT_COLORS.length];
        ipcRenderer.invoke('project-create', { name, color }).then((res) => {
          if (!res || !res.ok || !res.project) return;
          notesState.projects.push(res.project);
          assignNoteProject(notesState.pickerNoteId, res.project.id);
          closeProjectPicker();
        }).catch(() => {});
      } else if (e.key === 'Escape') {
        closeProjectPicker();
      }
    });
  }

  document.addEventListener('mousedown', (e) => {
    if (!elements.projectPicker || !elements.projectPicker.classList.contains('is-open')) return;
    if (elements.projectPicker.contains(e.target)) return;
    if (e.target.closest('.note-project-btn, .note-project-badge')) return;
    closeProjectPicker();
  });

  ipcRenderer.on('toolbar-notes-toggle', () => {
    toggleNotesPanel();
  });

  ipcRenderer.on('toolbar-notes-focus-new', () => {
    focusNewNote();
  });

  document.addEventListener('keydown', (e) => {
    if (!notesState.isOpen) return;
    const active = document.activeElement;
    const isInInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (isInInput) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undoDelete();
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); selectNext(); break;
      case 'ArrowUp':   e.preventDefault(); selectPrev(); break;
      case 'ArrowRight': e.preventDefault(); activateSelected(); break;
      case 'ArrowLeft':  e.preventDefault(); pauseTimer(); break;
      case ' ':
        if (notesState.selected) { e.preventDefault(); editSelected(); }
        break;
    }
  });
  
  console.log('[Toolbar] Ready!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

