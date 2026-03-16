
# OdO File Manager Script
# Organizes the directory by grouping files into logical categories: 
# Documents, Software, Media, and Archives based on extensions and keywords.

import os
import shutil

def organize_files():
    # Define folder structure
    structure = {
        "Documents/Math": ["Integral", "integrale"],
        "Documents/Real_Estate": ["Wohnungsbau", "Mietspiegel"],
        "Documents/Education": ["Thesis", "Bio12", "MANOS", "Evaluation"],
        "Documents/Games": ["Rollenspiel", "Regeln"],
        "Software": [".exe", ".msi"],
        "Media/Photos": [".jpeg", ".jpg", ".png"],
        "Media/Icons": [".svg"],
        "Archives": [".zip", ".iso"]
    }

    # Tracking stats
    stats = {"moved": 0, "created": 0, "skipped": 0, "errors": 0}

    # Get all files in root (non-recursive for the initial move)
    files = [f for f in os.listdir('.') if os.path.isfile(f)]

    for filename in files:
        target_folder = None
        
        # 1. Match by extension or keyword
        if filename.endswith(('.exe', '.msi')):
            target_folder = "Software"
        elif filename.endswith(('.zip', '.iso')):
            target_folder = "Archives"
        elif filename.endswith('.svg'):
            target_folder = "Media/Icons"
        elif filename.endswith(('.jpeg', '.jpg', '.png')):
            target_folder = "Media/Photos"
        elif filename.endswith('.pdf'):
            # Sub-categorize PDFs
            target_folder = "Documents/Misc" # Default
            for folder, keywords in structure.items():
                if "Documents/" in folder:
                    if any(key.lower() in filename.lower() for key in keywords):
                        target_folder = folder
                        break

        if target_folder:
            try:
                # Create directory if it doesn't exist
                if not os.path.exists(target_folder):
                    os.makedirs(target_folder, exist_ok=True)
                    print(f"[CREATE] folder: {target_folder}")
                    stats["created"] += 1
                
                dest_path = os.path.join(target_folder, filename)
                
                # Conflict safety
                if os.path.exists(dest_path):
                    print(f"[SKIP]   {filename} already exists in {target_folder}")
                    stats["skipped"] += 1
                else:
                    shutil.move(filename, dest_path)
                    print(f"[MOVE]   {filename} → {target_folder}/")
                    stats["moved"] += 1
            except Exception as e:
                print(f"[ERROR]  Could not move {filename}: {str(e)}")
                stats["errors"] += 1

    print(f"\n[DONE] Moved: {stats['moved']} | Created: {stats['created']} | Deleted: 0 | Skipped: {stats['skipped']} | Errors: {stats['errors']}")

if __name__ == "__main__":
    organize_files()
