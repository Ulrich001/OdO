import webview
import json

from api.files import FilesApi
from api.settings import SettingsApi
from api.ai_handler import AIApi

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

debug = False

class Api(FilesApi, SettingsApi, AIApi):
    def __init__(self):
        self.path = None
        super().__init__()


    def send(self, input, path):
        for i in range(10000):
            i = i

        output = f"""Hello, user!
Your input: {input}
The selected directory: {path}"""
        
        win.evaluate_js(f"output({json.dumps(output)})")
        


# Window automatisch aktualisieren, wenn Dateien aktualisiert
class ReloadHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith((".html", ".css", ".js", ".svg")):
            win.evaluate_js("window.location.reload()")

if __name__ == '__main__':
    api = Api()
    win = webview.create_window(
        "OdO",
        'assets/index.html',
        js_api=api,
        min_size=(400, 60),
        frameless=False,
        transparent=True,
        background_color="#000000",
        easy_drag=False,
    )

    api.win = win
 
    observer = Observer()
    observer.schedule(ReloadHandler(), path="assets", recursive=False)
    observer.start()

    webview.start(debug=debug)