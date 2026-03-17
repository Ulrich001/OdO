// Fenstergrößen
const HEIGHT_FULL = 840;
const HEIGHT_MAX_SETTINGS = 200;
const WIDTH_SMALL = 850;
const WIDTH_EXPAND = 1500;

// Einstellungen für Fenster bei Windows
let platformOffset = null;
let scaleFactor = 1.0;


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
const sidebar         = document.getElementById("sidebar");
const folderPath      = document.getElementById("folder-path");
const acceptBar       = document.getElementById('accept-bar');
const acceptBtn       = document.getElementById('accept-btn');
const settingsPanel   = document.getElementById('settings-panel');

let outputOpen = false;
let settingsOpen = false;
let explorerOpen = false;

let currDir = "/";
let pathHistory = ["/"];
let pathHistoryIndex = 0;
let activeEntry = null;
let activeEntryData = null;

let testDirAfter = null;
let testDirBefore = null;
let testing = false;
let testPreview = "compare";

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
    if (explorerOpen) {
      h = Math.round(HEIGHT_FULL / scaleFactor);
    } else {
      const inputH = document.getElementById('input-container').scrollHeight;
      const outputH = outputOpen ? document.getElementById('output-box').scrollHeight : 0;
      h = Math.round((inputH + outputH + platformOffset + 2) / scaleFactor);
    }
    const w = Math.round((explorerOpen ? WIDTH_EXPAND : WIDTH_SMALL) / scaleFactor);
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
  window.pywebview.api.send_input(input, currDir);
}

// -- Reset Session
resetSessionBtn.addEventListener("click", () => {
  toggleOutput();
});

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

// ── folder select ─────────────────────────────────────────────────
folderSelect.addEventListener('click', async () => {
  currDir = await window.pywebview.api.select_directory();
  if (currDir != null) {
    historyAddPath(currDir);
  }
});



// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

function output(output) {
  outputContent.innerHTML = output;
}


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



// Output styling
document.addEventListener('click', async e => {
  if (e.target.classList.contains('file-ref')) {
    const fullPath = e.target.title;
    dir = await window.pywebview.api.get_parent(fullPath);
    historyAddPath(dir);
  }
});







// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------

function startTest(temp){
  testing = true;
  testDirAfter = temp;
  testDirBefore = currDir;

  outputBox.classList.add("visible");
  toggleExplorer(true);

  document.getElementById('toggle-test-view-buttons').style.display = 'flex';
  // Richtiges highlight der Compare Buttons 
  document.querySelectorAll('.toggle-test-view').forEach(b => b.classList.remove('active'));
  document.getElementById("toggle-test-view-compare").classList.add("acitve");

  acceptBar.classList.add('visible');
  sendBtn.classList.add('reject-mode');
  chatInput.placeholder = "Give feedback to reject...";

  clearHistory(testDirAfter);
  loadDir(testDirAfter);
}

document.querySelectorAll('.toggle-test-view').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-test-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.id === 'toggle-test-view-before') {
      if (testPreview == "after") {
        testPreview = "before";
        new_path = window.pywebview.api.original_dir(currDir);

        if (new_path == "") {
          new_path = testDirBefore;
        }

        loadDir(new_path);
      } else if (testPreview == "compare") {
        //TODO Nach ursprünglichem Dir suchen
        testPreview = "before";
        loadDir(testDirBefore)
      }
      testPreview = 'before';
      loadDir(testDirBefore);
    } else if (btn.id === 'toggle-test-view-after') {
      if (testPreview == "compare") {
        testPreview = "after";
        loadDir(currDir);
      } else if (testPreview == "before") {
        testPreview = "after";
        loadDir(testDirAfter);
      }
    } else {
      if (testPreview == "after") {
        testPreview = "compare";
        loadDir(currDir);
      } else if (testPreview == "before") {
        //TODO Nach neuem Dir suchen
        testPreview = "compare";
        loadDir(testDirAfter);
      }
    }
  });
});

function endTest() {
  testing = false;
  acceptBar.classList.remove('visible');
  sendBtn.classList.remove('reject-mode');
  chatInput.placeholder = "Ask OdO...";
  document.getElementById('toggle-test-view-buttons').style.display = 'none';

  clearHistory();
  updatedPath(currDir);
  historyAddPath(currDir);
  resize();
}


// Accept/Reject
acceptBtn.addEventListener('click', () => {
  window.pywebview.api.accept_changes();
  endTest();
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
  toggleExplorer();
});

function toggleExplorer(requestToggle) {
  if (requestToggle == undefined) {
    explorerOpen = !explorerOpen;
  } else if (requestToggle) {
    if (explorerOpen) { return; }
    app.style.height = (HEIGHT_FULL + platformOffset) + "px";
    explorerOpen = true;
  } else {
    if (!explorerOpen) { return; }
    app.style.height = "auto";
    explorerOpen = false;
  }

  if (explorerOpen) {
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

  expandBtnIcon.src = explorerOpen ? "shrink.svg" : "expand.svg";

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
    setActive(div, entry);
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
    setActive(div, entry);
    showSidebar(entry);
  });

  div.addEventListener("dblclick", () => {
    if (entry.is_dir) historyAddPath(entry.path);
  });

  fileList.appendChild(div);
}

// Highlight für ausgewählte Datei
function setActive(div, entry) {
  if (activeEntry) activeEntry.classList.remove("active");
  activeEntry = div;
  activeEntry.classList.add("active");
  activeEntryData = entry;  // ← store entry data
}

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

  if (imgExtensions.includes(entry.extension)) {
    const img = document.createElement("img");

    img.id="file-preview";
    img.className = "file-preview-img"

    // img.src = entry.path funktioniert nicht, daher Umweg über Python:
    img.src = await window.pywebview.api.get_image_preview(entry.path);

    filePreview.appendChild(img);
    filePreview.style.display = "block";
  } else if (textExtensions.includes(entry.extension)) {
    const file = document.createElement("file_content");

    file.id="file-preview";
    file.className = "file-preview-text";
    
    file.textContent = await window.pywebview.api.get_file_content(entry.path);


    filePreview.appendChild(file);
    filePreview.style.display = "block";
  }
}

document.getElementById("file-open").addEventListener("click", () => {
  window.pywebview.api.open_default_app(activeEntryData.path);
})




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
  if (explorerOpen) {loadDir(currDir);}
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