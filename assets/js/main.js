// Fenstergrößen
const HEIGHT_FULL = 840;
const HEIGHT_MAX_SETTINGS = 200;
const WIDTH_SMALL = 850;
const WIDTH_EXPAND = 1500;

// Einstellungen für Fenster bei Windows
let platformOffset = null;
let scaleFactor = 1.0;

// UI-Elemente
const app             = document.getElementById("app");
const rightArea       = document.getElementById("right-area");
const sideSeparator   = document.getElementById("side-separator");
const outputBox       = document.getElementById('output-box');
const outputContent   = document.getElementById("output-content");
const sendBtn         = document.getElementById('send-btn');
const chatInput       = document.getElementById('chat-input');
const folderSelect    = document.getElementById('folder-select');
const settingsBtn     = document.getElementById('settings-btn');
const expandBtn       = document.getElementById("expand-btn");
const expandBtnIcon   = document.getElementById("expand-btn-icon");
const resetSessionBtn = document.getElementById("reset-session-btn");
const fileList        = document.getElementById("file-list");
const acceptBtn       = document.getElementById('accept-btn');
const settingsPanel   = document.getElementById('settings-panel');

// Klassen initialisieren
const chatHistory = new ChatHistory();
const settings = new Settings();
const explorer = new Explorer("/");
const history = new NavigationHistory("/");
const sidebar = new Sidebar();
const test = new Test();
const popup = new Popup();

let outputOpen = false;
let settingsOpen = false;

let baseDir = null;
let activeEntry = null;
let activeEntryData = null;

// Einstellungen
let api_key = "";



// Wird bei Start gecalled --> passt Fenstergröße und platfromOffset an
window.addEventListener('pywebviewready', async () => {
  const platform = await window.pywebview.api.get_platform();
  scaleFactor = await window.pywebview.api.get_scale_factor();
  platformOffset = platform === 'win32' ? 38 : 0;
  setTimeout(() => resize(), 300);
});

// Passt Fenstergröße an
function resize() {
  requestAnimationFrame(() => {
    let h;
    if (explorer.enabled) {
      h = Math.round(HEIGHT_FULL / scaleFactor);
    } else {
      const inputH = document.getElementById('input-container').scrollHeight;
      const outputH = outputOpen ? document.getElementById('output-box').scrollHeight : 0;
      const settingsH = settings.isOpen ? settingsPanel.scrollHeight : 0;
      h = Math.round((inputH + outputH + settingsH + platformOffset + 2) / scaleFactor);
    }
    const w = Math.round((explorer.enabled ? WIDTH_EXPAND : WIDTH_SMALL) / scaleFactor);
    window.pywebview.api.resize(w, h);
  });
}

// Textarea wächst mit Inhalt
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, chatInput.lineHeight * 5) + 'px';
  resize();
});
chatInput.lineHeight = parseFloat(window.getComputedStyle(chatInput).lineHeight);



// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

// Sendet Eingabe an Ai
function handleInput(input) {
    chatHistory.addInput(input);
    chatHistory.showSpinner();
    window.pywebview.api.send_input(input, explorer.currentDir);
    baseDir = explorer.currentDir;
}

// Neuer Chat (Reset Session)
resetSessionBtn.addEventListener("click", async () => {
    if (!settings.api_key) {return; }
    window.pywebview.api.new_session();
    toggleOutput();
    chatHistory.clear();
});

// ── send ─────────────────────────────────────────────────────────
// Sendet Nachricht
sendBtn.addEventListener('click', () => {
  settings.hide();

  const val = chatInput.value.trim();
  // Kein Input => return
  if (!val) {return;}
  // Kein Dir ausgewählt => return
  if (!explorer.currentDir) {
    popup.error("No Directory selected!")
    return;}
  // Kein API Key => return
  if (!settings.api_key) {
    popup.error("API Key missing!")
    return;
  }
  if (test.isTesting) {
    window.pywebview.api.revise_changes();
    test.end();
  }
  handleInput(val);
  toggleOutput(true);
  chatInput.value = '';
  chatInput.style.height = 'auto';
});

// Strg+Enter zum Senden
chatInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    sendBtn.click();
  }
});

// Öffnet Ordner-Auswahl
folderSelect.addEventListener('click', async () => {
  explorer.openSelector();
});



// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

// Zeigt die KI-Antwort an
function output(msg) {
  const html = msg.replace(/\n\n/g, '\n');
  outputContent.innerHTML = html;
  chatHistory.hideSpinner();
  chatHistory.addOutput(html);
}

// Zeigt/versteckt die Output-Box
function toggleOutput(bool) {
  outputOpen = bool === null ? !outputOpen : bool;

  if (!outputOpen || explorer.enabled) {
    outputBox.classList.remove('visible');
  } else {
    outputBox.classList.add('visible');
  }

  resize();
}


// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

// Wechselt zwischen Before/Compare/After Ansicht
document.querySelectorAll('.toggle-test-view').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-test-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.id === 'toggle-test-view-before') {
      test.viewBefore();
    } else if (btn.id === 'toggle-test-view-after') {
      test.viewAfter();
    } else {
      test.viewCompare();
    }
  });
});

// Änderungen akzeptieren
acceptBtn.addEventListener('click', () => {
  window.pywebview.api.accept_changes();
  test.end();
});

// Änderungen ablehnen
document.getElementById("reject-btn").addEventListener("click", () => {
  window.pywebview.api.reject_changes();
  test.end();
});


// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

// Einstellungen öffnen
settingsBtn.addEventListener('click', () => {
  settings.show();
});

// Einstellungen schließen
document.getElementById('settings-close-btn').addEventListener('click', () => {
  settings.hide();
});


// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Explorer
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

// Explorer ein-/ausblenden
expandBtn.addEventListener("click", () => {
  explorer.toggle();
});

// Sucht ein Element in der angezeigten Dateiliste anhand des Pfades
function entryFromFilepath(path) {
  for (const entry of fileList.querySelectorAll('div')) {
    if (entry.dataset.path == path) {
      return entry;
    }
  }
  return null;
}

// Markiert eine Datei als ausgewählt
function setActive(div, entry) {
  if (activeEntry) activeEntry.classList.remove("selected");
  activeEntry = div;
  activeEntry.classList.add("selected");
  activeEntryData = entry;
}

// Öffnet die Datei mit dem Standardprogramm
document.getElementById("file-open").addEventListener("click", () => {
  window.pywebview.api.open_default_app(activeEntryData.path);
})


// --- History
// Einen Schritt zurück
document.getElementById("history-back-btn").addEventListener("click", () => {
  const path = history.back();
  explorer.load(path, add_to_history = false);
});

// Einen Ordner nach oben
document.getElementById("history-up-btn").addEventListener("click", async () => {
  const blocked = test.isTesting ? explorer.currentDir == test.baseTemp : explorer.currentDir == "/";
  if (!blocked) {
    const parent = await window.pywebview.api.get_parent(history.current);
    explorer.load(parent);
  }
});

// Einen Schritt vorwärts
document.getElementById("history-forward-btn").addEventListener("click", () => {
  const path = history.forward();
  explorer.load(path, add_to_history = false);
});