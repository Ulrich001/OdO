class ChatHistory {
    constructor() {
        this.container = document.getElementById("chat-history");
    }
    
    addInput(message) {
        this.container.querySelector(".chat-placeholder")?.remove();
        const div = document.createElement("div");
        div.className = "chat-entry chat-input";
        div.textContent = message;
        this.container.appendChild(div);
        this.container.scrollTop = this.container.scrollHeight;
    }

    addOutput(message) {
        this.container.querySelector(".chat-placeholder")?.remove();
        const div = document.createElement("div");
        div.className = "chat-entry chat-output";
        div.innerHTML = message;
        this.container.appendChild(div);
        this.container.scrollTop = this.container.scrollHeight;
    }

    showSpinner() {
        this.container.querySelector(".chat-placeholder")?.remove();
        const div = document.createElement("div");
        div.className = "chat-spinner";
        div.innerHTML = `<div class="spinner"></div>`;
        this.container.appendChild(div);
        this.container.scrollTop = this.container.scrollHeight;
    }

    hideSpinner() {
        this.container.querySelector(".chat-spinner")?.remove();
    }

    clear() {
        this.container.querySelectorAll(".chat-entry, .chat-spinner, .chat-placeholder").forEach(el => el.remove());
        this.container.insertAdjacentHTML("beforeend", `
            <div class="chat-placeholder">
                <span class="chat-placeholder-title">OdO</span>
                <span class="chat-placeholder-sub">Select a folder and start a conversation</span>
            </div>
        `);
        popup.info("New Conversation started.")
    }
}