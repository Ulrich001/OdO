import os
from pathlib import Path

def calc_size(entry):
    if entry.is_dir():
        try:
            items_in_dir = len(list(Path(entry.path).iterdir()))
            return f"{items_in_dir} Items"
        except:
            return "Access denied"
    
    bytes = entry.stat().st_size
    # Größe von Dateien (zur Basis 10)
    for unit in ("B", "KB", "MB", "GB"):
        if bytes < 1000:
            return f"{bytes:.1f} {unit}"
        bytes /= 1000
    
    return f"{bytes:.1f} TB"
