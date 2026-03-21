class NavigationHistory {
    constructor(dir) {
        this.history = [dir];
        this.index = 0;
    }

    get current() {
        return this.history[this.index];
    }

    add(path) {
        // Updates this.history, falls User in Historie zurück gegegangen
        // und anschließend neuen Ordner öffnet
        this.history.splice(this.index + 1);

        // Skip, wenn neuer Pfad und der vorherige gleich
        if (this.current == path) {return;}

        this.history.push(path);
        this.index ++;
    }

    forward() {
        if (this.index < this.history.length - 1) {this.index ++;}
        return this.current;
    }

    back() {
        if (this.index > 0) {this.index --;}
        return this.current;
    }

    async clear (path) {
        // Setzt alles zurück
        this.history = [path];
        this.index = 0;
    }
}