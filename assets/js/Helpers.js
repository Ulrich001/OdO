class Settings {
    constructor() {
        this.api_key = null;
        this.model = "gemini-3.1-flash-lite-preview";
        this.isOpen = false;

        this.inputApi = document.getElementById("settings-api-key");

        document.querySelectorAll(".model-option").forEach(opt => {
            opt.addEventListener("click", () => {
                document.querySelectorAll(".model-option").forEach(o => o.classList.remove("selected"));
                opt.classList.add("selected");
                this.model = opt.dataset.value ?? this.model;
            });
        });
    }

    show() {
        settingsPanel.classList.add('visible');
        this.isOpen = true;
        resize();
    }

    hide() {
        if (!this.isOpen) {return; }
        settingsPanel.classList.remove('visible');
        this.isOpen = false;
        const temp_api = this.inputApi.value.trim();
        if (temp_api) {
            this.api_key = temp_api;
        }
        if (!this.api_key) {
            popup.error("Please enter an API key.");
            resize();
            return;
        }
        window.pywebview.api.set_settings(this.api_key, this.model);
        resize();
}
}


class Popup {
    constructor() {
        this.popupDiv = document.createElement("div");
        this.popupDiv.id = "popup";
        this.popupDiv.innerHTML = `
            <span id="popup-message"></span>
            <button id="popup-close-btn">✕</button>
        `;
        document.body.appendChild(this.popupDiv);
        document.getElementById("popup-close-btn").addEventListener("click", () => this.hide());
    }
    error(message) {
        this.popupDiv.classList.remove("error");
        void this.popupDiv.offsetWidth;
        this.popupDiv.classList.add("error");
        document.getElementById("popup-message").textContent = message;
        this.popupDiv.classList.add("visible");
    }
    info(message) {
        this.popupDiv.classList.remove("error");
        document.getElementById("popup-message").textContent = message;
        this.popupDiv.classList.add("visible");
    }
    hide() {
        this.popupDiv.classList.remove("visible");
    }
}