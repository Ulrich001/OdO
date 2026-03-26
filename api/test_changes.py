import os
from pathlib import Path
import shutil
import tempfile

# Repräsentiert eine einzelne Datei oder einen Ordner mit allen Änderungsinformationen
class File:
    def __init__(self, org_path, is_dir, is_new=False):
        self.is_dir = is_dir

        self.deleted = False
        self.duplicated = False
        self.moved = False
        self.renamed = False
        self.new = is_new
        self.not_changed = True

        self.or_name = Path(org_path).name
        self.new_name = None
        self.original_path = Path(org_path)
        self.new_path = []

# Verwaltet die Liste aller Dateien und ihre Änderungen
class FileChanges:
    def __init__(self, root):
        self.filelist = []
        self.root_dir = Path(root)
    
    def add_file(self, path, is_new=False, is_dir=False):
        """Fügt eine neue Datei zur Dateiliste hinzu"""
        self.filelist.append(File(path, is_dir, is_new))
    
    def add_new_file_path(self, pos, new_path):
        """Fügt einen neuen Pfad zu einem bestehenden Dateieintrag hinzu"""
        new_path = Path(new_path)
        new_name = new_path.name
        new_file = self.filelist[pos]

        # Wenn bereits ein neuer Pfad existiert, wurde die Datei dupliziert
        if len(new_file.new_path) >= 1:
            new_file.duplicated = True
            new_file.moved = False

        new_file.new_path.append(Path(new_path))
        if new_name != new_file.or_name:
            new_file.renamed = True
            new_file.new_name = new_name
        if new_path != new_file.original_path:
            new_file.moved = True
        new_file.not_changed = (Path(new_path) == new_file.original_path)

    def file_in_filelist(self, path):
        """Gibt den Index einer Datei in der Liste zurück, oder -1 wenn nicht gefunden"""
        path = Path(path)
        for i, file in enumerate(self.filelist):
            if file.original_path == path:
                return i
        return -1

    # Zählt alle Änderungen und gibt eine Zusammenfassung zurück
    def track_final_changes(self):
        total_files = 0
        files_deleted = 0
        files_duplicated = 0
        files_moved = 0
        files_created = 0
        files_untouched = 0

        for file in self.filelist:
            len_new_path = len(file.new_path)

            if file.new:
                files_created += 1
            else:
                if len_new_path == 0:
                    files_deleted += 1
                elif len_new_path == 1:
                    if file.original_path == file.new_path[0]:
                        files_untouched += 1
                    else:
                        files_moved += 1
                else:
                    files_duplicated += 1

            total_files += 1

        return(f"""CHANGES:
Total files: {total_files}
----
Deleted: {files_deleted}
Duplicated: {files_duplicated}
Moved: {files_moved}
Created: {files_created}
Untouched: {files_untouched}
""")


class TestingChanges:
    def __init__(self, or_dir):
        self.ORIGINAL_DIR = Path(or_dir)
        self.track_files = FileChanges(self.ORIGINAL_DIR)

        self.TEMP_DIR = Path(tempfile.gettempdir()) / "odo_temp"
        self.TEMP_DIR.mkdir(exist_ok=True)

        # Temp-Ordner leeren, falls noch alte Dateien drin sind
        if len(os.listdir(self.TEMP_DIR)) != 0:
            self.clean_dir()

    def create_clone_dir(self) -> Path:
        """Erstellt eine Kopie des Originalordners im Temp-Verzeichnis.
        Jede Datei enthält ihren absoluten Originalpfad.
        Jeder Ordner enthält eine .odotempdir Datei mit seinem absoluten Originalpfad."""

        for path, dirs, files in os.walk(self.ORIGINAL_DIR):
            path = Path(path)

            # Äquivalenten Pfad im Temp-Verzeichnis berechnen
            rel = path.relative_to(self.ORIGINAL_DIR)
            target_dir = self.TEMP_DIR / rel

            for dir_name in dirs:
                original_dir_path = path / dir_name
                temp_dir_path = target_dir / dir_name
                temp_dir_path.mkdir(exist_ok=True)

                self.track_files.add_file(original_dir_path, is_dir=True)
                
                # Originalpfad und Index in .odotempdir Datei speichern
                (temp_dir_path / f"{dir_name}.odotempdir").write_text(f"{original_dir_path}\n{len(self.track_files.filelist) - 1}", encoding="utf-8")

            for file in files:
                original_file_path = path / file
                temp_file_path = target_dir / file

                self.track_files.add_file(original_file_path)

                # Originalpfad und Index in die Datei schreiben
                temp_file_path.write_text(f"{original_file_path}\n{len(self.track_files.filelist) - 1}", encoding="utf-8")

        return self.TEMP_DIR

    def compare_dirs(self):
        """Durchsucht den Temp-Ordner und gleicht jede Datei mit dem Original ab.
        Gibt eine Zusammenfassung aller Änderungen zurück."""
        print(f"compare_dirs called, TEMP_DIR: {self.TEMP_DIR}")
        print(f"contents: {list(self.TEMP_DIR.iterdir())}")

        for path, dirs, files in os.walk(self.TEMP_DIR):
            path = Path(path)

            for dir_name in dirs:
                temp_dir_path = path / dir_name

                # .odotempdir suchen, um den Originalpfad zu finden
                odotempdir_files = list(temp_dir_path.glob("*.odotempdir"))

                if not odotempdir_files:
                    # Kein .odotempdir bedeutet: Ordner wurde neu erstellt
                    self.track_files.add_file(temp_dir_path, is_new=True, is_dir=True)
                    (temp_dir_path / f"{dir_name}.odotempdir").write_text(f"\n{len(self.track_files.filelist) - 1}", encoding="utf-8")
                else:
                    with open(odotempdir_files[0], encoding="utf-8") as dir:
                        original_dir_path = Path(dir.readline().strip())
                        dir_trackfile_count = int(dir.readline().strip())
                    self.track_files.add_new_file_path(dir_trackfile_count, temp_dir_path)

            for file in files:
                temp_file_path = path / file

                if temp_file_path.suffix == ".odotempdir":
                    continue

                # Originalpfad aus dem Dateiinhalt lesen
                with open(temp_file_path, encoding="utf-8") as f:
                    original_file_path = Path(f.readline().strip())
                    file_trackfile_count = int(f.readline().strip())

                if not original_file_path.parts:
                    # Leerer Inhalt bedeutet: Datei wurde neu erstellt
                    self.track_files.add_file(temp_file_path, is_new=True)
                else:
                    self.track_files.add_new_file_path(file_trackfile_count, temp_file_path)

        return self.track_files.track_final_changes()
    
    # Gibt alle Änderungen in einem bestimmten Ordner zurück
    def changes_in_dir(self, dir_after):
        dir_after = Path(dir_after)

        if dir_after != self.TEMP_DIR:
            # Originalpfad dieses Ordners aus .odotempdir lesen
            odotempdir_files = list(dir_after.glob("*.odotempdir"))

            with open(odotempdir_files[0], encoding="utf-8") as odo_temp:
                dir_original = odo_temp.readline().strip()

            if dir_original == "":
                dir_original = None
            else:
                dir_original = Path(dir_original)
        else:
            dir_original = self.ORIGINAL_DIR

        result = []
        seen = set()

        # Iterieren über alle Dateien in dir_after
        for entry in dir_after.iterdir():
            if entry.suffix == ".odotempdir":
                continue

            if entry.is_dir():
                sub_odotempdir = list(entry.glob("*.odotempdir"))

                with open(sub_odotempdir[0], encoding="utf-8") as odo_temp:
                    original_path = odo_temp.readline().strip()
                    filelist_count = int(odo_temp.readline().strip())

                directory = self.track_files.filelist[filelist_count]

                if directory.new:
                    status = "new"
                    renamed = False
                    original_path = None
                else:
                    original_path = Path(original_path)
                    seen.add(original_path)

                    if original_path.parent == dir_original:
                        status = "duplicated" if directory.duplicated else "not_changed"
                    elif directory.duplicated:
                        status = "copied_in"
                    else:
                        status = "moved_in"

                    renamed = directory.renamed

            else:
                with open(entry, encoding="utf-8") as f:
                    original_path = f.readline().strip()
                    filelist_count = int(f.readline().strip())

                file = self.track_files.filelist[filelist_count]

                if file.new:
                    status = "new"
                    renamed = False
                    original_path = None
                else:
                    original_path = Path(original_path)
                    seen.add(original_path)

                    if original_path.parent == dir_original:
                        status = "duplicated" if file.duplicated else "not_changed"
                    elif file.duplicated:
                        status = "copied_in"
                    else:
                        status = "moved_in"
                
                    renamed = file.renamed

            result.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "path": str(entry),
                "original_path": str(original_path) if original_path else None,
                "status": status,
                "new_name": entry.name if (original_path and entry.name != Path(original_path).name) else None,
                "renamed": original_path is not None and entry.name != Path(original_path).name
            })

        # Originalpfad nach gelöschten oder verschobenen Dateien durchsuchen
        if dir_original and dir_original.exists():
            for entry in dir_original.iterdir():
                if entry not in seen:
                    idx = self.track_files.file_in_filelist(entry)
                    if idx == -1:
                        continue
                    file_obj = self.track_files.filelist[idx]

                    result.append({
                        "name": file_obj.or_name,
                        "is_dir": file_obj.is_dir,
                        "original_path": str(file_obj.original_path),
                        "status": "deleted" if not file_obj.new_path else "moved_away",
                        "new_name": entry.name if (original_path and entry.name != Path(original_path).name) else None,
                        "renamed": original_path is not None and entry.name != Path(original_path).name
                    })
                    
        result.sort(key=lambda i: (not i["is_dir"], i["name"].lower()))

        return result

    def clean_dir(self):
        """Löscht und erstellt den Temp-Ordner neu"""
        if self.TEMP_DIR.exists():
            shutil.rmtree(self.TEMP_DIR)
            self.TEMP_DIR.mkdir(exist_ok=True)