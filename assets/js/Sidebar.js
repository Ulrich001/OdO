class Sidebar {
    constructor() {
        this.sidebar = document.getElementById("sidebar");
        // Kontrolliert, welche Dateien eine Vorschau haben
        this.imgExtensions = [".jpg", ".jpeg", ".jfif", ".pjpeg", ".pjp", ".png", ".gif", ".webp", ".apng", ".svg", ".avif"]
        this.textExtensions = [".txt", ".md", ".py", ".js", ".ts", ".html", ".css", ".json", ".yaml", ".yml", ".toml", ".rs", ".go", ".cpp", ".c", ".h", ".sh", ".xml", ".csv", ".log"]
    }

    async show() {
        // Name der aktiven Datei / des aktiven Ordners anzeigen
        document.getElementById('sb-name').textContent = activeEntryData.name;
        this.sidebar.style.display = 'flex';

        // Tabelle leeren, bevor neue Einträge hinzugefügt werden
        document.getElementById("sb-table").innerHTML = "";

        // Allgemeine Dateiinformationen
        this.addRow("Path", activeEntryData.path);
        if (test.isTesting) { this.addRow("OG Path", activeEntryData.original_path); }
        this.addRow("Type", activeEntryData.is_dir ? "Folder" : (activeEntryData.extension ?? activeEntryData.original_path?.split('.').pop()));

        // Vorschauh zurücksetzen
        const filePreview = document.getElementById("file-preview");
        filePreview.innerHTML = "";
        filePreview.style.display = "none";

        if (test.isTesting) {
            // Im Testmodus: Status der Datei anzeigen
            this.addRow("Status", activeEntryData.status ?? "—");
        } else {
            // Im normalen Modus: Änderungsdatum und Größe anzeigen
            this.addRow("Modified", new Date(activeEntryData.modified * 1000).toLocaleDateString());
            this.addRow("Size", activeEntryData.size ?? "—");

            if (this.imgExtensions.includes(activeEntryData.extension)) {
                // Bildvorschau laden und anzeigen
                const img = document.createElement("img");
                img.id = "file-preview";
                img.className = "file-preview-img";
                img.src = await window.pywebview.api.get_image_preview(activeEntryData.path);
                filePreview.appendChild(img);
                filePreview.style.display = "block";
            } else if (this.textExtensions.includes(activeEntryData.extension)) {
                // Textinhalt laden und anzeigen
                const file = document.createElement("file_content");
                file.id = "file-preview";
                file.className = "file-preview-text";
                file.textContent = await window.pywebview.api.get_file_content(activeEntryData.path);
                filePreview.appendChild(file);
                filePreview.style.display = "block";
            }
        }
    }

    // Sidebar ausblenden
    hide() {
        this.sidebar.style.display = "none";
    }

    // Fügt eine Zeile mit Label und Wert in die Infotabelle ein
    addRow(label, id) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="sb-key">${label}</td>
            <td class="sb-val">${id ?? "—"}</td>
        `;
        document.getElementById("sb-table").appendChild(tr);
    }
}