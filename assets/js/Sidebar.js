class Sidebar {
    constructor() {
        this.sidebar = document.getElementById("sidebar");

        // Kontrolliiert, welche Dateien Preview haben
        this.imgExtensions = [".jpg", ".jpeg", ".jfif", ".pjpeg", ".pjp", ".png", ".gif", ".webp", ".apng", ".svg", ".avif"]
        this.textExtensions = [".txt", ".md", ".py", ".js", ".ts", ".html", ".css", ".json", ".yaml", ".yml", ".toml", ".rs", ".go", ".cpp", ".c", ".h", ".sh", ".xml", ".csv", ".log"]

    }

    async show() {
        document.getElementById('sb-name').textContent = activeEntryData.name;
        this.sidebar.style.display = 'flex';
        document.getElementById("sb-table").innerHTML = "";

        this.addRow("Path", activeEntryData.path);
        if (test.isTesting) { this.addRow("OG Path", activeEntryData.original_path); }
        this.addRow("Type", activeEntryData.is_dir ? "Folder" : (activeEntryData.extension ?? activeEntryData.original_path?.split('.').pop()));

        if (test.isTesting) {
            this.addRow("Status", activeEntryData.status ?? "—");
        } else {
            this.addRow("Modified", new Date(activeEntryData.modified * 1000).toLocaleDateString());
            this.addRow("Size", activeEntryData.size ?? "—");

            const filePreview = document.getElementById("file-preview");
            filePreview.innerHTML = "";
            filePreview.style.display = "none";

            if (this.imgExtensions.includes(activeEntryData.extension)) {
                const img = document.createElement("img");
                img.id = "file-preview";
                img.className = "file-preview-img";
                img.src = await window.pywebview.api.get_image_preview(activeEntryData.path);
                filePreview.appendChild(img);
                filePreview.style.display = "block";
            } else if (this.textExtensions.includes(activeEntryData.extension)) {
                const file = document.createElement("file_content");
                file.id = "file-preview";
                file.className = "file-preview-text";
                file.textContent = await window.pywebview.api.get_file_content(activeEntryData.path);
                filePreview.appendChild(file);
                filePreview.style.display = "block";
            }
        }
    }

    hide() {
        this.sidebar.style.display = "none";
    }
    
    addRow(label, id) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="sb-key">${label}</td>
            <td class="sb-val">${id ?? "—"}</td>
        `;
        document.getElementById("sb-table").appendChild(tr);
    }
}