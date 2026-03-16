
# OdO File Manager Script
# Lowercase all top-level directories and move .py files to a dedicated folder.

import os
import shutil

# All paths are relative to cwd
cwd = "."

moved = 0
created = 0
deleted = 0
skipped = 0
errors = 0

# 1. Identify and rename folders to lowercase
try:
    items = os.listdir(cwd)
    for item in items:
        if os.path.isdir(item):
            new_name = item.lower()
            if item != new_name:
                try:
                    # Check for conflict if a lowercase version already exists
                    if os.path.exists(new_name):
                        print(f"[SKIP]   Folder '{item}' -> '{new_name}' (destination already exists)")
                        skipped += 1
                    else:
                        os.rename(item, new_name)
                        print(f"[RENAME] {item} → {new_name}")
                        moved += 1
                except Exception as e:
                    print(f"[ERROR]  Failed to rename folder '{item}': {e}")
                    errors += 1
except Exception as e:
    print(f"[ERROR]  Could not list directory: {e}")
    errors += 1

# 2. Create the target folder for Python files
script_folder = "python_scripts"
if not os.path.exists(script_folder):
    try:
        os.makedirs(script_folder)
        print(f"[CREATE] folder: {script_folder}")
        created += 1
    except Exception as e:
        print(f"[ERROR]  Could not create folder '{script_folder}': {e}")
        errors += 1

# 3. Move .py files from the root to the new folder
try:
    # Refresh list after renames
    items = os.listdir(cwd)
    for item in items:
        if os.path.isfile(item) and item.endswith('.py'):
            # Don't move the manager script if it were named .py and running here
            # But based on the file_list, we have test.py and update_sheet.py
            dest_path = os.path.join(script_folder, item)
            try:
                if os.path.exists(dest_path):
                    print(f"[SKIP]   {item} already exists in {script_folder}")
                    skipped += 1
                else:
                    shutil.move(item, dest_path)
                    print(f"[MOVE]   {item} → {dest_path}")
                    moved += 1
            except Exception as e:
                print(f"[ERROR]  Could not move file '{item}': {e}")
                errors += 1
except Exception as e:
    print(f"[ERROR]  Process interrupted: {e}")
    errors += 1

print(f"\n[DONE] Moved: {moved} | Created: {created} | Deleted: {deleted} | Skipped: {skipped} | Errors: {errors}")
