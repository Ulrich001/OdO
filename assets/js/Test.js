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

    start(temp) {
        this.isTesting = true;
        this.baseTemp = temp;
        this.baseOriginal = explorer.currentDir;

        this.testButtons.style.display = "flex";
        document.querySelectorAll(".toggle-test-view").forEach(b => b.classList.remove("acitve"));

        this.acceptBar.classList.add("visible");
        sendBtn.classList.add("reject-mode");
        chatInput.placeholder = "Schlage Änderungen vor..."

        this.viewCompare();
        explorer.open()
    }

    end() {
        this.isTesting = false;

        this.acceptBar.classList.remove("visible");
        sendBtn.classList.remove("reject-mode");
        chatInput.placeholder = "Ask OdO...";
        this.testButtons.style.display = "none";

        explorer.load();
        history.clear(explorer.currentDir);
        resize();
    }

    viewBefore() {
        this.mode = "before";
        this.btnBefore.classList.add("active");
        explorer.load();
    }

    viewCompare() {
        this.mode = "compare";
        this.btnCompare.classList.add("active");
        explorer.load(this.baseTemp);
    }

    viewAfter() {
        this.mode = "after";
        this.btnAfter.classList.add("active");
        explorer.load(this.baseTemp);
    }
}