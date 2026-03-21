class Explorer {
    constructor(dir) {
        this.currentDir = dir ?? null;
        this.enabled = false;

        this.fileList = document.getElementById("file-list");

        this.folderPathInput = document.getElementById("folder-path");
        this.folderPathExplorer = document.getElementById("current-path");
    }

    toggle() {
        if (this.enabled) {
            this.close()
        } else {
            this.open()
        }
    }

    async openSelector() {
        if (test.isTesting) {return; }
        // Wenn currentDir == null => currentDir auf "/" setzen
        this.currentDir ??= "/";

        const result = await window.pywebview.api.select_directory(this.currentDir);
        if (!result) return;
        this.currentDir = result;
        this.load();
    }

    open() {
        this.enabled = true;

        outputBox.classList.remove('visible');
        document.getElementById("chat-history").classList.add("visible");
        rightArea.classList.add('open');
        sideSeparator.classList.add('visible');
        app.style.height = "100vh";

        expandBtnIcon.src = "icons/shrink.svg";

        if (test.isTesting) {
            explorer.load(test.baseTemp);
        } else {
            this.load();
        }
        history.clear(this.currentDir);
        resize();
    }

    close() {
        // Skip, wenn bereits geschlossen
        if (!this.enabled) {return;}

        this.enabled = false;

        outputBox.classList.add('visible');
        document.getElementById("chat-history").classList.remove("visible");
        if (!outputOpen) {outputBox.classList.remove("visible");}
        rightArea.classList.remove('open');
        sideSeparator.classList.remove('visible');
        fileList.innerHTML = "";
        sidebar.innerHTML = "";
        app.style.height = "auto";

        expandBtnIcon.src = "icons/expand.svg";

        resize();
    }

    async load(dir, add_to_history = true) {
        dir ??= this.currentDir;
        
        if (add_to_history) {history.add(dir)};
        this.folderPathInput.innerHTML = dir;
        this.folderPathExplorer.innerHTML = dir;

        if (!this.enabled) {return;}

        // file-list leeren, bevor neue Elemente hinzugefügt werden
        fileList.innerHTML = '';

        // Liste mit allen Dateien erhalten
        let entries;
        if (test.isTesting && test.mode === "compare") {
            entries = await window.pywebview.api.get_dir_changes(dir);
        } else {
            entries = await window.pywebview.api.list_dir(dir);
        }

        // Iteriert über jedes entry
        entries.forEach(entry => this.addEntry(entry));
    }

    addEntry(entry) {
        // div erstellen
        const div = document.createElement("div");

        if (test.isTesting && test.mode === "compare") {
            div.className = `file-entry status-${entry.status}`;            
            const displayName = entry.renamed ? `[Umbenannt] ${entry.name}` : entry.name;
            div.innerHTML = `
                <span class="icon">${entry.is_dir ? "📁" : "📄"}</span>
                <span class="name">${displayName}</span>
                <span class="status-badge">${entry.status}</span>
            `;
        } else {
            // id, Dateisymbol und Dateiname hinzufügen
            div.className = "file-entry";
            div.innerHTML = `
            <span class="icon">${entry.is_dir ? "📁" : "📄"}</span>
            <span class="name">${entry.name}</span>
            `;            
        }

        div.entryData = entry;

        // Informationen in Sidebar anzeigen
        div.addEventListener("click", () => {
            setActive(div, entry);
            sidebar.show();
        });
        // Wenn Entry Ordner ist, bei Doppelklick öffnen
        if (entry.is_dir) {
            div.addEventListener("dblclick", () => {
                this.load(entry.path);
            });
        }

        this.fileList.appendChild(div);
    }
}