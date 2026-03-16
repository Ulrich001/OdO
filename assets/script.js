const HEIGHT_FULL = 840;
const HEIGHT_MAX_SETTINGS = 200;
const WIDTH_SMALL = 850;
const WIDTH_EXPAND = 1500;

const app = document.getElementById("app");
const rightArea = document.getElementById("right-area");
const sideSeparator = document.getElementById("side-separator");
const outputBox = document.getElementById('output-box');
const outputContent = document.getElementById("output-content");
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');
const folderSelect = document.getElementById('folder-select');
const settingsBtn = document.getElementById('settings-btn');
const expandBtn = document.getElementById("expand-btn");
const expandBtnIcon = document.getElementById("expand-btn-icon");
const resetSessionBtn = document.getElementById("reset-session-btn");
const fileList = document.getElementById("file-list");
const sidebar = document.getElementById("sidebar");
const folderPath = document.getElementById("folder-path");
const acceptBar = document.getElementById('accept-bar');
const acceptBtn = document.getElementById('accept-btn');
const settingsPanel = document.getElementById('settings-panel');

let outputOpen = false;
let settingsOpen = false;
let showExplorer = false;
let currDir = "/";
let testing = false;
let pathHistory = ["/"];
let pathHistoryIndex = 0;
let activeEntry = null;
let testPreview = "compare";
let testDirAfter = null;
let testDirBefore = null;

let api_key = "AIzaSyDACazxa3v8O38Fx8cL5NaMVo-qH6uTQ-w";

// ── resize helper ────────────────────────────────────────────────
function resize() {
  requestAnimationFrame(() => {
    let h;
    if (showExplorer) {
      h = HEIGHT_FULL;
    } else {
      const inputH = document.getElementById('input-container').scrollHeight;
      const settingsH = settingsOpen ? Math.min(settingsPanel.scrollHeight, HEIGHT_MAX_SETTINGS) : 0;
      const outputH = outputOpen ? document.getElementById('output-box').scrollHeight : 0;
      h = inputH + settingsH + outputH + 2;
    }
    const w = showExplorer ? WIDTH_EXPAND : WIDTH_SMALL;
    window.pywebview.api.resize(w, h);
  });
}

// ── start collapsed ──────────────────────────────────────────────
window.addEventListener('pywebviewready', () => {
  rightArea.classList.remove("open");
  resize();
});

// -- AI Action --------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
function handleInput(input){
  output("Processing...")
  window.pywebview.api.send_input(input, currDir, api_key);
}

// ── output ───────────────────────────────────────────────────────
function output(output) {
  outputContent.innerHTML = output;
}

function startTest(temp){
  testing = true;
  testDirAfter = temp;
  testDirBefore = currDir;

  outputBox.classList.add("visible");
  toggleExplorer(true);

  document.getElementById('toggle-test-view-buttons').style.display = 'flex';
  acceptBar.classList.add('visible');
  sendBtn.classList.add('reject-mode');
  chatInput.placeholder = "Give feedback to reject...";

  clearHistory(testDirAfter);
  loadDir(testDirAfter);
}

function endTest() {
  testing = false;
  acceptBar.classList.remove('visible');
  sendBtn.classList.remove('reject-mode');
  chatInput.placeholder = "Ask OdO...";
  document.getElementById('toggle-test-view-buttons').style.display = 'none';

  clearHistory();
  historyAddPath(currDir);
  resize();
}

// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Settings


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





acceptBtn.addEventListener('click', () => {
  // TODO: call python to apply changes
  window.pywebview.api.accept_changes();
  endTest();
});


document.querySelectorAll('.toggle-test-view').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-test-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.id === 'toggle-test-view-before') {
      testPreview = 'before';
      loadDir(testDirBefore);
    } else if (btn.id === 'toggle-test-view-after') {
      testPreview = 'after';
      loadDir(testDirAfter);
    } else {
      testPreview = 'compare';
      loadDir(testDirAfter);
    }
  });
});

// ── toggle output panel ──────────────────────────────────────────
function toggleOutput() {
  outputOpen = !outputOpen;

  if (!outputOpen) {
    outputBox.classList.remove('visible');
  } else {
    outputBox.classList.add('visible');
  }

  resize();
}

// ── auto-grow textarea ───────────────────────────────────────────
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, chatInput.lineHeight * 7) + 'px';
  resize();
});
chatInput.lineHeight = parseFloat(window.getComputedStyle(chatInput).lineHeight);

// ── expand window ─────────────────────────────────────────────────
expandBtn.addEventListener("click", () => {
  toggleExplorer();
});

function toggleExplorer(requestToggle) {
  if (requestToggle == undefined) {
    showExplorer = !showExplorer;
  } else if (requestToggle) {
    if (showExplorer) { return; }
    showExplorer = true;
  } else {
    if (!showExplorer) { return; }
    showExplorer = false;
  }

  if (showExplorer) {
    rightArea.classList.add('open');
    sideSeparator.classList.add('visible');
    outputBox.classList.add('visible');
    app.style.height = "100vh";

    loadDir(currDir)
  } else {
    if (!outputOpen) {outputBox.classList.remove("visible");}
    rightArea.classList.remove('open');
    sideSeparator.classList.remove('visible');
    fileList.innerHTML = "";
    sidebar.innerHTML = "";
    app.style.height = "auto";
  }

  expandBtnIcon.src = showExplorer ? "shrink.svg" : "expand.svg";

  resize();
}

// -- Explorer anzeigen
async function loadDir(path) {
  // file-list leeren, bevor neue Elemente hinzugefügt werden
  fileList.innerHTML = '';

  // Liste mit allen Dateien erhalten
  if (!testing || testPreview != "compare") {
    const entries = await window.pywebview.api.list_dir(path);

    // Iteriert über jedes entry
    entries.forEach(entry => addEntry(entry));

  } else {
    const entries = await window.pywebview.api.get_dir_changes(path);

    // Iteriert über jedes entry
    entries.forEach(entry => addEntryCompare(entry));
  }

}

function addEntry(entry) {
  // div erstellen
  const div = document.createElement("div");

  // id, Dateisymbol und Dateiname hinzufügen
  div.className = "file-entry";
  div.innerHTML = `
  <span class="icon">${entry.is_dir ? "📁" : "📄"}</span>
  <span class="name">${entry.name}</span>
  `;


  // Informationen in Sidebar anzeigen
  div.addEventListener("click", () => {
    setActive(div);
    showSidebar(entry);
  });

  // wenn entry Ordner ist, bei Doppelklick öffnen 
  div.addEventListener("dblclick", () => {
    if (entry.is_dir) {
      historyAddPath(entry.path);
    }
  
  });

  fileList.appendChild(div);
}

function addEntryCompare(entry) {
  const div = document.createElement("div");
  div.className = `file-entry status-${entry.status}`;
  
  const displayName = entry.renamed ? `${entry.name} → ${entry.new_name}` : entry.name;
  
  div.innerHTML = `
    <span class="icon">${entry.is_dir ? "📁" : "📄"}</span>
    <span class="name">${displayName}</span>
    <span class="status-badge">${entry.status}</span>
  `;
  
  div.addEventListener("click", () => {
    setActive(div);
    showSidebar(entry);
  });

  div.addEventListener("dblclick", () => {
    if (entry.is_dir) historyAddPath(entry.path);
  });

  fileList.appendChild(div);
}

function setActive(path) {
  if (activeEntry) activeEntry.classList.remove("active");
  activeEntry = path;
  activeEntry.classList.add("active");
}

// --- History
function historyAddPath(path) {
  if (pathHistoryIndex == pathHistory.length - 1) {
    pathHistory.push(path);
  } else {
    pathHistory.splice(pathHistory.length - pathHistoryIndex, pathHistoryIndex);
    pathHistory.push(path);
    pathHistoryIndex = 0;
  }
  pathHistoryIndex = pathHistory.length - 1;

  updatedPath();
}

function clearHistory(path) {
  pathHistory = [path];
  pathHistoryIndex = 0;
}

async function updatedPath(){
  currDir = pathHistory[pathHistoryIndex]; 
  if (showExplorer) {loadDir(currDir);}
  folderPath.textContent = currDir;
  document.getElementById("current-path").innerHTML = currDir;
}

// -- Add History Buttons
document.getElementById("history-back-btn").addEventListener("click", () => {
  if (pathHistoryIndex > 0) {
    pathHistoryIndex--;
    updatedPath();
  }
});

document.getElementById("history-up-btn").addEventListener("click", async () => {
  if ((!testing && currDir != "/") || (testing && currDir != testDirBefore)) {
    historyAddPath(await window.pywebview.api.get_parent(currDir));
  }
});

document.getElementById("history-forward-btn").addEventListener("click", async () => {
  if (pathHistoryIndex < pathHistory.length - 1) {
    pathHistoryIndex++;
    updatedPath();
  }
});

async function showSidebar(entry) {
  document.getElementById('sb-name').textContent = entry.name;
  document.getElementById('sb-size').textContent = entry.size ?? '—';
  document.getElementById('sb-modified').textContent = entry.modified ? new Date(entry.modified * 1000).toLocaleDateString() : '—';
  document.getElementById('sb-type').textContent = entry.extension ?? entry.original_path?.split('.').pop() ?? '—';
  document.getElementById('sb-path').textContent = entry.path;
  document.getElementById('sidebar').style.display = 'block';

  const filePreview = document.getElementById("file-preview");
  filePreview.innerHTML = "";
  filePreview.style.display = "none";

  const imgExtensions = [".jpg", ".jpeg", ".jfif", ".pjpeg", ".pjp", ".png", ".gif", ".webp", ".apng", ".svg", ".avif"]

  if (imgExtensions.includes(entry.extension)) {
    const img = document.createElement("img");

    img.id="file-preview";

    // img.src = entry.path funktioniert nicht, daher Umweg über Python:
    img.src = await window.pywebview.api.get_image_preview(entry.path);

    filePreview.appendChild(img);
    filePreview.style.display = "block";
  }
}

// ── send ─────────────────────────────────────────────────────────
sendBtn.addEventListener('click', () => {
  const val = chatInput.value.trim();
  if (!val || !currDir) return;
  if (testing) {
    window.pywebview.api.reject_changes(val);
    endTest();
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

// -- Reset Session
resetSessionBtn.addEventListener("click", () => {
  toggleOutput();
});

// ── folder select ─────────────────────────────────────────────────
folderSelect.addEventListener('click', async () => {
  currDir = await window.pywebview.api.select_directory();
  if (currDir != null) {
    historyAddPath(currDir);
  }
});

// ── settings ─────────────────────────────────────────────────────
settingsBtn.addEventListener('click', () => {
  // TODO: show settings panel
  resize();
});






// -- Text styling
document.addEventListener('click', async e => {
  if (e.target.classList.contains('file-ref')) {
    const fullPath = e.target.title;
    dir = await window.pywebview.api.get_parent(fullPath);
    historyAddPath(dir);
  }
});