import webview
import json

from api.files import FilesApi
from api.settings import SettingsApi
from api.ai_handler import AIApi

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
        


if __name__ == '__main__':
    api = Api()
    win = webview.create_window(
        "OdO",
        'assets/index.html',
        js_api=api,
        min_size=(400, 60),
        frameless= False,
        transparent=True,
        background_color="#000000",
        easy_drag=False,
        resizable=False,
    )

    api.win = win

    webview.start(debug=debug)