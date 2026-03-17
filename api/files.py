import subprocess, os, platform
from pathlib import Path
import webview

from api.utils import calc_size

class FilesApi:
    def list_dir(self, path):
        #TODO: handle permission errors
        path = Path(path)

        entries = []
        
        for entry in path.iterdir():
            if entry.suffix == ".odotempdir":
                continue

            properties = entry.stat()

            entries.append({
                "name": entry.name,
                "path": str(entry),
                "is_dir": entry.is_dir(),
                "size": calc_size(entry),
                "modified": properties.st_mtime,
                "extension": Path(entry.name).suffix.lower()
            })

        # Sortieren aller Dateien, sodass Ordner zuerst gelistet werden
        entries.sort(key=lambda i: (not i["is_dir"], i["name"].lower()))

        return entries
    
    def select_directory(self):
        result = self.win.create_file_dialog(
            webview.FileDialog.FOLDER, directory=self.path if self.path != None else "", allow_multiple=True
        )
        if result and result[0] is not None:
            path = result[0]
            return path
        return None
    
    def get_parent(self, path):
        return str(Path(path).parent)

    def get_image_preview(self, path):
        import base64

        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        ext = Path(path).suffix.lower().strip(".")
        mime = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "jfif": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "webp": "image/webp",
            "svg": "image/svg+xml",
            "avif": "image/avif",
        }.get(ext, f"image/{ext}")
        return f"data:{mime};base64,{data}"
    
    def path_exists(path):
        path = Path(path)

        return path.exists


    def get_file_content(self, path):
        file = Path(path)

        return file.read_text(encoding='utf-8') if file.exists else "File could not be accessed"
    
    def open_default_app(self, filepath):
        if platform.system() == 'Darwin':       # macOS
            subprocess.call(('open', filepath))
        elif platform.system() == 'Windows':    # Windows
            os.startfile(filepath)
        else:                                   # linux variants
            subprocess.call(('xdg-open', filepath))