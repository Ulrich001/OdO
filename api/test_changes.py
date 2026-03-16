import os
from pathlib import Path
import shutil
import tempfile

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

class FileChanges:
    def __init__(self, root):
        self.filelist = []
        self.root_dir = Path(root)
    
    def add_file(self, path, is_new=False, is_dir=False):
        """Adds a new file to filelist"""
        self.filelist.append(File(path, is_dir, is_new))
    
    def add_new_file_path(self, pos, new_path):
        """Adds a new path to an existing file entry"""
        new_path = Path(new_path)
        new_name = new_path.name
        new_file = self.filelist[pos]

        new_file.new_path.append(Path(new_path))
        if new_name != new_file.or_name:
            new_file.renamed = True
            new_file.new_name = new_name
        if new_path != new_file.original_path:
            new_file.moved = True
        new_file.not_changed = (Path(new_path) == new_file.original_path)

    def file_in_filelist(self, path):
        """Returns index of file in filelist, or -1 if not found"""
        path = Path(path)
        for i, file in enumerate(self.filelist):
            if file.original_path == path:
                return i
        return -1

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

        self.track_files_count = 0

        self.TEMP_DIR = Path(tempfile.gettempdir()) / "odo_temp"
        self.TEMP_DIR.mkdir(exist_ok=True)

        if len(os.listdir(self.TEMP_DIR)) != 0:
            self.clean_dir()

    def create_clone_dir(self) -> Path:
        """Creates a clone of ORIGINAL_DIR in TEMP_DIR.
        Each file contains its own absolute original path.
        Each directory contains a .odotempdir file with its absolute original path."""

        for path, dirs, files in os.walk(self.ORIGINAL_DIR):
            path = Path(path)

            # calculate the equivalent directory in TEMP_DIR
            rel = path.relative_to(self.ORIGINAL_DIR)
            target_dir = self.TEMP_DIR / rel

            for dir_name in dirs:
                original_dir_path = path / dir_name
                temp_dir_path = target_dir / dir_name
                temp_dir_path.mkdir(exist_ok=True)

                # write absolute original path into .odotempdir file
                (temp_dir_path / f"{dir_name}.odotempdir").write_text(f"{original_dir_path}\n{self.track_files_count}")
                self.track_files_count += 1

                self.track_files.add_file(original_dir_path, is_dir=True)

            for file in files:
                original_file_path = path / file
                temp_file_path = target_dir / file

                # write absolute original path into the file
                temp_file_path.write_text(f"{original_file_path}\n{self.track_files_count}")
                self.track_files_count += 1

                self.track_files.add_file(original_file_path)

        return self.TEMP_DIR

    def compare_dirs(self):
        """Walks TEMP_DIR and matches each file/dir back to its original.
        Returns a summary string of all changes."""
        print(f"compare_dirs called, TEMP_DIR: {self.TEMP_DIR}")
        print(f"contents: {list(self.TEMP_DIR.iterdir())}")

        for path, dirs, files in os.walk(self.TEMP_DIR):
            path = Path(path)

            for dir_name in dirs:
                temp_dir_path = path / dir_name

                # find .odotempdir to get original path
                odotempdir_files = list(temp_dir_path.glob("*.odotempdir"))

                if not odotempdir_files:
                    # no .odotempdir means this dir was newly created
                    self.track_files.add_file(temp_dir_path, is_new=True, is_dir=True)
                    (temp_dir_path / f"{dir_name}.odotempdir").write_text(f"\n{self.track_files_count}")
                    self.track_files_count += 1
                else:
                    with open(odotempdir_files[0]) as dir:
                        original_dir_path = Path(dir.readline().strip())
                        dir_trackfile_count = int(dir.readline().strip())
                    self.track_files.add_new_file_path(dir_trackfile_count, temp_dir_path)

            for file in files:
                temp_file_path = path / file

                if temp_file_path.suffix == ".odotempdir":
                    continue

                # read absolute original path from file content
                with open(temp_file_path) as f:
                    original_file_path = Path(f.readline().strip())
                    file_trackfile_count = int(f.readline().strip())

                if not original_file_path.parts:
                    # empty content means newly created file
                    self.track_files.add_file(temp_file_path, is_new=True)
                else:
                    self.track_files.add_new_file_path(file_trackfile_count, temp_file_path)

        return self.track_files.track_final_changes()
    
    def changes_in_dir(self, dir_after):
        dir_after = Path(dir_after)
        print(dir_after)

        if dir_after != self.TEMP_DIR:
            # get original path of this dir from .odotempdir
            odotempdir_files = list(dir_after.glob("*.odotempdir"))

            with open(odotempdir_files[0]) as odo_temp:
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

                with open(sub_odotempdir[0]) as odo_temp:
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
                    elif directory.moved:
                        status = "moved_in"
                    else:
                        status = "copied_in"

                    renamed = directory.renamed

            else:
                with open(entry) as f:
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
                    elif file.moved:
                        status = "moved_in"
                    else:
                        status = "copied_in"
                
                    renamed = file.renamed

            result.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "path": str(entry),
                "original_path": str(original_path) if original_path else None,
                "status": status,
                "renamed": renamed
            })

        # walk original dir to find deleted/moved away files
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
                        "renamed": file_obj.renamed
                    })

        return result

    def clean_dir(self):
        """Deletes and recreates TEMP_DIR"""
        if self.TEMP_DIR.exists():
            shutil.rmtree(self.TEMP_DIR)
            self.TEMP_DIR.mkdir(exist_ok=True)