import os
from pathlib import Path

# Gibt die Größe einer Datei oder Anzahl der Elemente in einem Ordner zurück
def calc_size(entry):
    if entry.is_dir():
        try:
            items_in_dir = len(list(Path(entry).iterdir()))
            return f"{items_in_dir} Items"
        except Exception as e:
            print(e)
            return "Access denied"
    bytes = entry.stat().st_size
    # Größe von Dateien (zur Basis 10) (Meist in Explorern benutzt)
    for unit in ("B", "KB", "MB", "GB"):
        if bytes < 1000:
            return f"{bytes:.1f} {unit}"
        bytes /= 1000
    return f"{bytes:.1f} TB"