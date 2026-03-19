// Fenstergrößen
const HEIGHT_FULL = 840;
const HEIGHT_MAX_SETTINGS = 200;
const WIDTH_SMALL = 850;
const WIDTH_EXPAND = 1500;

// Einstellungen für Fenster bei Windows
let platformOffset = null;
let scaleFactor = 1.0;

const explorer = new Explorer("/");
const history = new NavigationHistory("/");
const sidebar = new Sidebar();
const test = new Test()

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
const folderPath      = document.getElementById("folder-path");
const acceptBar       = document.getElementById('accept-bar');
const acceptBtn       = document.getElementById('accept-btn');
const settingsPanel   = document.getElementById('settings-panel');

let outputOpen = false;
let settingsOpen = false;

let baseDir = null;
let activeEntry = null;
let activeEntryData = null;

// Einstellungen
let api_key = "";


// Kontrolliiert, welche Dateien Preview haben
const imgExtensions = [".jpg", ".jpeg", ".jfif", ".pjpeg", ".pjp", ".png", ".gif", ".webp", ".apng", ".svg", ".avif"]
const textExtensions = [".txt", ".md", ".py", ".js", ".ts", ".html", ".css", ".json", ".yaml", ".yml", ".toml", ".rs", ".go", ".cpp", ".c", ".h", ".sh", ".xml", ".csv", ".log"]




// Helpers

// Wird be Start gecalled --> passt Fenstergröße und platfromOffset an
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
      h = Math.round((inputH + outputH + platformOffset + 2) / scaleFactor);
    }
    const w = Math.round((explorer.enabled ? WIDTH_EXPAND : WIDTH_SMALL) / scaleFactor);
    window.pywebview.api.resize(w, h);
  });
}

//
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

function handleInput(input){
  output("Wird verarbeitet...")
  window.pywebview.api.send_input(input, explorer.currentDir);
  baseDir = explorer.currentDir;
}

// -- Reset Session
resetSessionBtn.addEventListener("click", () => {
  toggleOutput();
});

// ── send ─────────────────────────────────────────────────────────
sendBtn.addEventListener('click', () => {
  const val = chatInput.value.trim();
  if (!val || !explorer.currentDir) return;
  if (test.isTesting) {
    window.pywebview.api.reject_changes(val);
    test.end();
    return;
  }
  handleInput(val);
  toggleOutput(true);
  chatInput.value = '';
  chatInput.style.height = 'auto';
});

chatInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    sendBtn.click();
  }
});

// ── folder select ─────────────────────────────────────────────────
folderSelect.addEventListener('click', async () => {
  explorer.openSelector();
});



// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

function output(output) {
  outputContent.innerHTML = output.replace(/\n\n/g, '\n');
}


// ── toggle output panel ──────────────────────────────────────────
function toggleOutput(bool) {
  outputOpen = bool === null ? !outputOpen : bool;

  if (!outputOpen) {
    outputBox.classList.remove('visible');
  } else {
    outputBox.classList.add('visible');
  }

  resize();
}


// Output styling
document.addEventListener('click', async e => {
  if (e.target.classList.contains('file-ref')) {
    const fullPath = baseDir + "/" + e.target.title;
    const dir = await window.pywebview.api.get_parent(fullPath);

    history.add(dir);
    await explorer.load(dir);

    const entry = entryFromFilepath(fullPath);
    if (entry) {
      setActive(entry, entry.entryData);
      sidebar.show();
    }
  }
});


// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

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


// Accept/Reject
acceptBtn.addEventListener('click', () => {
  window.pywebview.api.accept_changes();
  test.end();
});


// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------


settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('visible');
  settingsOpen = true;
  resize();
});

// Close Settings
document.getElementById('settings-close-btn').addEventListener('click', () => {
  settingsPanel.classList.remove('visible');
  settingsOpen = false;
  
  temp_api = getElementById("settings-api-key").textContent;
  if (temp_api != "") {
    api_key = temp_api;
  }
  resize();
});


// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Explorer
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

// ── expand window ─────────────────────────────────────────────────
expandBtn.addEventListener("click", () => {
  explorer.toggle();
});

// Get entry from filepath
function entryFromFilepath(path) {
  for (const entry of fileList.querySelectorAll('div')) {
    if (entry.dataset.path == path) {
      return entry;
    }
  }
  return null;
}

// Highlight für ausgewählte Datei
function setActive(div, entry) {
  if (activeEntry) activeEntry.classList.remove("selected");
  activeEntry = div;
  activeEntry.classList.add("selected");
  activeEntryData = entry;
}

document.getElementById("file-open").addEventListener("click", () => {
  window.pywebview.api.open_default_app(activeEntryData.path);
})


// --- History
document.getElementById("history-back-btn").addEventListener("click", () => {
  const path = history.back();
  explorer.load(path);
});

document.getElementById("history-up-btn").addEventListener("click", async () => {
  const blocked = test.isTesting ? explorer.currentDir == test.baseOriginal : explorer.currentDir == "/";
  if (!blocked) {
    const parent = await window.pywebview.api.get_parent(explorer.currentDir);
    history.add(parent);
    explorer.load(parent);
  }
});

document.getElementById("history-forward-btn").addEventListener("click", () => {
  const path = history.forward();
  explorer.load(path);
});