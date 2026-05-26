/* ============================================
   Toolbar Renderer Process
   Handles toolbar button clicks and syncs with main window
   ============================================ */

const { ipcRenderer } = require('electron');

console.log('[Toolbar] Script loaded');

// DOM Elements
const elements = {
  toolbarPlayBtn: document.getElementById('toolbar-play-btn'),
  toolbarStopBtn: document.getElementById('toolbar-stop-btn'),
  toolbarExtendBtn: document.getElementById('toolbar-extend-btn'),
  toolbarPreset25Btn: document.getElementById('toolbar-preset-25'),
  toolbarPreset50Btn: document.getElementById('toolbar-preset-50'),
  toolbarSettingsBtn: document.getElementById('toolbar-settings-btn'),
  toolbarNotesBtn: document.getElementById('toolbar-notes-btn'),
  toolbarNotesPanel: document.getElementById('toolbar-notes-panel'),
  toolbarNoteInput: document.getElementById('toolbar-note-input'),
  toolbarNoteAddBtn: document.getElementById('toolbar-note-add-btn'),
  toolbarNotesList: document.getElementById('toolbar-notes-list'),
};

const notesState = {
  isOpen: false,
  notes: [],
};

/* ============================================
   Button Handlers
   ============================================ */

function handlePlayPause() {
  console.log('[Toolbar] Play/Pause clicked');
  // Send message to main window via IPC
  ipcRenderer.send('toolbar-action', 'toggle-play');
}

function handleStop() {
  console.log('[Toolbar] Stop clicked');
  ipcRenderer.send('toolbar-action', 'reset');
}

function handleExtend() {
  console.log('[Toolbar] Extend +5 clicked');
  ipcRenderer.send('toolbar-action', 'extend');
}

function handlePreset25() {
  console.log('[Toolbar] Preset 25/5 clicked');
  ipcRenderer.send('toolbar-action', 'preset-25');
}

function handlePreset50() {
  console.log('[Toolbar] Preset 50/10 clicked');
  ipcRenderer.send('toolbar-action', 'preset-50');
}

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
  console.log('[Toolbar] State update:', state);
  updatePlayButtonIcon(state.runState);
});

function updatePlayButtonIcon(runState) {
  const playBtn = elements.toolbarPlayBtn;
  
  if (runState === 'running') {
    // Show pause icon
    playBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    `;
  } else {
    // Show play icon
    playBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    `;
  }
}

function toggleNotesPanel(forceOpen = null) {
  notesState.isOpen = forceOpen === null ? !notesState.isOpen : !!forceOpen;
  document.body.classList.toggle('notes-open', notesState.isOpen);
  ipcRenderer.send('toolbar-notes-visibility', { open: notesState.isOpen });
  if (notesState.isOpen) {
    loadNotes();
    if (elements.toolbarNoteInput) elements.toolbarNoteInput.focus();
  }
}

function loadNotes() {
  ipcRenderer.invoke('notes-list').then((res) => {
    if (!res || !res.ok) return;
    notesState.notes = Array.isArray(res.notes) ? res.notes : [];
    renderNotes();
  }).catch((err) => {
    console.warn('[Toolbar] notes-list failed:', err);
  });
}

function renderNotes() {
  if (!elements.toolbarNotesList) return;
  if (!notesState.notes.length) {
    elements.toolbarNotesList.innerHTML = '<div class="toolbar-empty">No notes yet</div>';
    return;
  }

  elements.toolbarNotesList.innerHTML = notesState.notes.map((note) => {
    const tasks = (note.tasks || []).map((task) => `
      <label class="toolbar-task-row ${task.done ? 'done' : ''}">
        <input type="checkbox" data-task-id="${task.id}" ${task.done ? 'checked' : ''} />
        <span class="toolbar-task-text">${escapeHtml(task.text)}</span>
      </label>
    `).join('');

    return `
      <div class="toolbar-note-item" data-note-id="${note.id}">
        <div class="toolbar-note-title">${escapeHtml(note.title)}</div>
        ${tasks || '<div class="toolbar-empty">No tasks</div>'}
        <div class="toolbar-task-add">
          <input type="text" data-note-input="${note.id}" placeholder="+ Add task" />
        </div>
      </div>
    `;
  }).join('');

  elements.toolbarNotesList.querySelectorAll('input[type="checkbox"][data-task-id]').forEach((node) => {
    node.addEventListener('change', onTaskToggle);
  });
  elements.toolbarNotesList.querySelectorAll('input[data-note-input]').forEach((node) => {
    node.addEventListener('keydown', onTaskInputKeydown);
  });
}

function createNoteFromInput() {
  const input = elements.toolbarNoteInput;
  if (!input) return;
  const title = input.value.trim();
  if (!title) return;

  ipcRenderer.invoke('note-create', { title, bodyMd: '' }).then((res) => {
    if (!res || !res.ok || !res.note) return;
    input.value = '';
    notesState.notes = [res.note, ...notesState.notes];
    renderNotes();
  }).catch((err) => {
    console.warn('[Toolbar] note-create failed:', err);
  });
}

function onTaskInputKeydown(event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  const input = event.target;
  const noteId = parseInt(input.dataset.noteInput, 10);
  const text = input.value.trim();
  if (!noteId || !text) return;

  ipcRenderer.invoke('task-create', { noteId, text }).then((res) => {
    if (!res || !res.ok || !res.task) return;
    const note = notesState.notes.find((n) => n.id === noteId);
    if (note) {
      note.tasks = note.tasks || [];
      note.tasks.push({
        id: res.task.id,
        text: res.task.text,
        done: false,
        sortOrder: res.task.sortOrder,
      });
    }
    input.value = '';
    renderNotes();
  }).catch((err) => {
    console.warn('[Toolbar] task-create failed:', err);
  });
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
    renderNotes();
  }).catch((err) => {
    console.warn('[Toolbar] task-toggle failed:', err);
  });
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
  elements.toolbarPlayBtn.addEventListener('click', handlePlayPause);
  elements.toolbarStopBtn.addEventListener('click', handleStop);
  elements.toolbarExtendBtn.addEventListener('click', handleExtend);
  elements.toolbarPreset25Btn.addEventListener('click', handlePreset25);
  elements.toolbarPreset50Btn.addEventListener('click', handlePreset50);
  elements.toolbarSettingsBtn.addEventListener('click', handleSettings);
  elements.toolbarNotesBtn.addEventListener('click', handleNotes);
  if (elements.toolbarNoteAddBtn) {
    elements.toolbarNoteAddBtn.addEventListener('click', createNoteFromInput);
  }
  if (elements.toolbarNoteInput) {
    elements.toolbarNoteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNoteFromInput();
      } else if (e.key === 'Escape' && notesState.isOpen) {
        toggleNotesPanel(false);
      }
    });
  }

  ipcRenderer.on('toolbar-notes-toggle', () => {
    toggleNotesPanel();
  });
  
  console.log('[Toolbar] Ready!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

