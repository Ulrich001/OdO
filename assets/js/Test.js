class Test {
    constructor() {
        this.baseTemp = null;
        this.baseOriginal = null;
        this.isTesting = false;
        this.mode = "compare";
        this.testButtons = document.getElementById("toggle-test-view-buttons");
        this.btnBefore = document.getElementById("toggle-test-view-before");
        this.btnCompare = document.getElementById("toggle-test-view-compare");
        this.btnAfter = document.getElementById("toggle-test-view-after");
        this.acceptBar = document.getElementById("accept-bar");
    }

    // Test-Modus starten und Explorer mit dem Temp-Ordner öffnen
    async start(temp) {
        this.isTesting = true;
        this.baseTemp = temp;
        this.baseOriginal = explorer.currentDir;
        
        fileList.innerHTML = "";
        this.acceptBar.classList.add("visible");
        this.acceptBar.classList.add("loading");
        document.getElementById("accept-question").textContent = "OdO is working...";
        this.testButtons.style.display = "flex";
        document.querySelectorAll(".toggle-test-view").forEach(b => b.classList.remove("acitve"));
        folderSelect.classList.add("disabled");
        settingsBtn.disabled = true;
        resetSessionBtn.disabled = true;
        sendBtn.classList.add("test");
        chatInput.placeholder = "Describe any changes to this result...";
        sidebar.hide();
        await this.viewCompare();

        this.acceptBar.classList.remove("loading");
        document.getElementById("accept-question").textContent = "Accept Changes?";
    }

    // Test-Modus beenden und Originalordner wiederherstellen
    end() {
        this.isTesting = false;

        this.acceptBar.classList.remove("visible");
        sendBtn.classList.remove("test");
        folderSelect.classList.remove("disabled");
        settingsBtn.disabled = false;
        resetSessionBtn.disabled = false;
        chatInput.placeholder = "Ask OdO...";
        this.testButtons.style.display = "none";
        sidebar.hide();
        explorer.load(this.baseOriginal);
        history.clear(explorer.currentDir);

        resize();
    }

    // Originalzustand anzeigen
    viewBefore() {
        this.mode = "before";
        this.btnBefore.classList.add("active");
        explorer.load();
    }

    // Vergleichsansicht anzeigen (Änderungen farblich markiert)
    async viewCompare() {
        this.mode = "compare";
        this.btnCompare.classList.add("active");
        await explorer.load(this.baseTemp);
    }

    // Ergebnis nach den Änderungen anzeigen
    viewAfter() {
        this.mode = "after";
        this.btnAfter.classList.add("active");
        explorer.load(this.baseTemp);
    }
}