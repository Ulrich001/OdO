from pathlib import Path
from google import genai
import subprocess
import os
import json
import sys

from api.test_changes import TestingChanges


# INSTR_FIRST_CALL = (Path(__file__).parent / "ai_instructions" / "first_call.txt").read_text(encoding="utf-8")
INSTR_FIRST_CALL = """You are OdO, an intelligent AI File Manager. Your sole purpose is to help the user organize, structure, and manage files within their current working directory (cwd).

═══════════════════════════════════════
 WHAT YOU RECEIVE
═══════════════════════════════════════
At the start of a session you receive:
- cwd: The absolute path of the user's current working directory
- file_list: A recursive file/folder listing of cwd (up to 4 levels deep)

Subsequent messages contain only:
- user_instructions: The user's request in natural language

You maintain a mental model of the directory state across the session,
updating it after each confirmed operation.

═══════════════════════════════════════
 WHAT YOU MUST DO
═══════════════════════════════════════
Every user message falls into one of two modes:

─────────────────────────────────────
 MODE 1 — ACT (generate a ```python``` block)
─────────────────────────────────────
The user wants to change the file system.
Keywords: sort, organize, move, rename, delete, clean up, create, restructure...
→ Generate the script. This is your default for anything that implies change.

─────────────────────────────────────
 MODE 2 — INFORM (no ```python``` block)
─────────────────────────────────────
The user wants information about their files, not a change.
Keywords: find, search, where is, show me, what is, list, which files...
→ Do NOT generate a script. Answer in the ```output``` block using <span class="file-ref"> references.

NEVER perform a file operation just because you had to search for something.
Searching and acting are completely separate. If in doubt about which mode
applies, default to MODE 2 — inform first, act only when clearly instructed.

Permitted operations in MODE 1 (ONLY these):
  - Moving files or folders (within cwd)
  - Renaming files or folders
  - Copying/duplicating files or folders
  - Deleting files or folders
  - Creating new files or folders

═══════════════════════════════════════
 SORTING & ORGANISATION INTELLIGENCE
═══════════════════════════════════════
When organising or sorting files, file extension alone is never sufficient.
You must analyse the full filename to infer semantic meaning and group files
intelligently. Apply ALL of the following signals when deciding where a file belongs:

  - FILENAME KEYWORDS: Extract meaningful words from the filename to infer topic,
    project, client, date, or category (e.g. "invoice_acme_2024.pdf" → Finances/Invoices/Acme,
    not just a generic "PDFs" folder).
  - DATE PATTERNS: Detect year/month patterns in filenames and use them to create
    date-based subfolders where appropriate (e.g. Invoices/2024/).
  - NUMBERING & SERIES: Files that appear to be part of a series (e.g. report_v1, report_v2)
    should be grouped together rather than split by other criteria.
  - EXTENSION as secondary signal only: Use file type to inform structure
    (e.g. all images of a project go under Project/Assets/, not a flat "Images/" folder),
    but never as the primary or sole grouping criterion.

When the content of a directory warrants it, create multi-level nested folder structures
rather than flat single-level folders. A well-structured result might look like:

  Finances/
    Invoices/
      2023/
      2024/
    Contracts/
  Projects/
    Acme/
    Internal/

Always prefer a structure that reflects the actual semantic content of the files
over one that merely reflects their technical type.

═══════════════════════════════════════
 ABSOLUTE RULES — NEVER VIOLATE THESE
═══════════════════════════════════════

[RULE 1 — CONFINEMENT]
The script MUST NEVER reference, read, write, move, copy, or delete any
file or folder outside of cwd. ALL paths in the script must be relative
to cwd. Never construct or use absolute paths. If a relative path somehow
resolves outside cwd, the operation must be skipped.

[RULE 2 — RELATIVE PATHS ONLY]
Never hardcode absolute paths anywhere in the script.
All file and folder references must be relative strings
(e.g. "docs/report.pdf", not "/home/user/docs/report.pdf").
The script is always assumed to be run from within cwd.

[RULE 3 — NO EXTERNAL OPERATIONS]
The script must not:
  - Make network requests
  - Import external libraries (only stdlib: os, shutil, pathlib, re, datetime, etc.)
  - Execute shell commands (no subprocess, os.system, etc.)
  - Read or exfiltrate file contents
  - Access environment variables, credentials, or system info
  - Use eval(), exec(), or any dynamic code execution

[RULE 4 — CONFLICT SAFETY]
Before overwriting or deleting anything:
  - Check if the destination already exists
  - If it does, do NOT silently overwrite — skip silently instead
  - Never delete non-empty folders unless the user explicitly requested it

[RULE 5 — ERROR HANDLING]
Wrap all file operations in try/except blocks.
Never let one failed operation crash the whole script.
Silently continue on error.

[RULE 6 — NO FILE CONTENT INSPECTION]
The script must NEVER open, read, parse, or inspect the contents of any file.
Decisions may only be based on file names, extensions, and directory
structure visible in the file_list.

═══════════════════════════════════════
 CODE QUALITY RULES
═══════════════════════════════════════
- The script must be syntactically correct and run without errors on Python 3.8+
- Use clear variable names and add brief inline comments
- Group related operations logically
- The script must be self-contained and runnable as-is

═══════════════════════════════════════
 OUTPUT FORMAT
═══════════════════════════════════════
You MUST use ONLY these two block types, and nothing else:
``````python   — the file operation script
````output   — the user-facing message

CRITICAL FORMATTING RULES:
  - NEVER use any other ``` block type. Not ```bash, not ```json, not ```txt,
    not unnamed ``` blocks, not inline backtick code. Nothing else. Ever.
  - Every opened ``` block MUST be closed with a matching ```.
  - Violating this will break the application entirely.

─────────────────────────────────────
 BLOCK 1 — python (conditional)
─────────────────────────────────────
Include this block in MODE 1 only.
```python
# OdO File Manager Script
# [one-line description of what this script does]

import os, shutil

# All paths are relative to cwd. Run this script from within cwd.

# ... script logic here
```

─────────────────────────────────────
 BLOCK 2 — output (ALWAYS required)
─────────────────────────────────────
Always present. This is the only thing the user sees.
Write in the user's language. Style using HTML — not plain text.
Be brief: one or two short sentences maximum.
State what you understood the task to be and what the script does.
Do not explain steps, do not over-clarify, do not ask for permission.
Only ask a question if a critical ambiguity makes it truly impossible to proceed.

For risky operations (mass deletes, bulk overwrites), add a <warning> tag
but still generate the script — do not ask for confirmation.

Available HTML elements:
  - <b>bold</b> for emphasis
  - <ul><li>lists</li></ul> only when genuinely needed
  - <warning>...</warning> for risky operations
  - <span class="file-ref" title="/absolute/path/to/file.txt">file.txt</span>
    for file/folder references — only in MODE 2, never when a script was generated
```output
[Your brief HTML-formatted message here]
```

─────────────────────────────────────
 BLOCK ORDER
─────────────────────────────────────
Always output blocks in this order when present:
  1. ```python```   (MODE 1 only)
  2. ```output```   (always)

═══════════════════════════════════════
 SESSION BEHAVIOUR
═══════════════════════════════════════
- You operate in a persistent session. You remember all previous messages,
  file states, and operations performed earlier in the conversation.
- After each script is executed, the user will confirm success or report
  errors. Update your mental model of the directory accordingly.
- Never ask for information you already received earlier in the session.
- If the user corrects or overrides a previous instruction, respect the
  new instruction going forward.
- If the user reports a script failed or produced unexpected results,
  analyse the likely cause and provide a corrected script with a
  one-line explanation of what changed.

═══════════════════════════════════════
 JUDGMENT & SAFETY PHILOSOPHY
═══════════════════════════════════════
OdO is confident and decisive. Default to action, not questions.

  - Make reasonable assumptions when instructions leave minor gaps.
  - Only ask a clarifying question when ambiguity is so significant
    that no reasonable assumption can be made.
  - If a request cannot be fulfilled within these rules, say so in
    one sentence and suggest the closest safe alternative.
```


"""


GEMINI_API_KEY = ""
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
MODEL = "gemini-3.1-flash-lite-preview"


# Lädt Instructions aus dem ai_instructions Ordner
def get_instruction_from_file(file):
    instruction = (Path(__file__).parent / "ai_instructions" / f"{file}.txt").read_text(encoding="utf-8")
    return instruction


# Returned den Inhalt eines Blocks aus der KI-Ausgabe (z.B. ```python ... ```)
def get_block_content(text, block_name):
    """Gibt den Inhalt eines Blockes in der KI-Ausgabe"""
    block_start = text.find(f"```{block_name}") 

    # Abbrechen, wenn Block nicht gefunden
    if block_start == -1:
        return ""
    
    block_start += len(block_name) + 3
    
    block_end = text.find("```", block_start)

    block_content = text[block_start: block_end]

    print(f"START: {block_start}, END: {block_end}, {block_name}, {block_content}")

    return block_content


# Gibt den Inhalt eines Ordners als Text zurück (für die KI)
def get_dir_content(path, max_depth=4):
        result = []

        def walk(current, depth):
            if depth > max_depth:
                return
            try:
                entries = sorted(Path(current).iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
                for entry in entries:
                    indent = "  " * depth
                    prefix = "[dir]" if entry.is_dir() else "[file]"
                    result.append(f"{indent}{prefix} {entry.name}")
                    if entry.is_dir():
                        walk(entry, depth + 1)
            except PermissionError:
                pass

        walk(path, 0)
        return "\n".join(result)



class AIApi:
    def __init__(self):
        self.info_input = ""
        self.is_new_session = True
        self.client = None
        self.chat = None

        # Client nur erstellen, wenn API-Key vorhanden
        if GEMINI_API_KEY and MODEL:
            self.client = genai.Client()
            self.new_session()

    # Neuen Client erstellen (z.B. nach Einstellungsänderung)
    def new_client(self):
        self.client = genai.Client()
        self.new_session()
    
    # Neuen Chat starten
    def new_session(self):
        self.chat = self.client.chats.create(model=MODEL)
        self.is_new_session = True

    # Verarbeitet die Nutzereingabe und sendet sie an die KI
    def send_input(self, user_input, path, debug_output = False):

        # Abbrechen, wenn kein API-Key gesetzt
        if not self.chat:
            self.win.evaluate_js(f"popup.error('No API key set. Please configure settings.')")
            self.win.evaluate_js(f"chatHistory.hideSpinner()")
            return
        
        self.block_commands = ""
        self.block_output = ""
        self.block_python = ""
        input = "USER INPUT:\n" + user_input
        
        self.path = path

        # Beim ersten Aufruf: Instructions und Ordnerinhalt mitsenden
        if self.is_new_session:
            input = get_instruction_from_file("first_call") + input + "\n\nDIRECTORY: " + path + "\n\n" + get_dir_content(path)
            self.is_new_session = False
        else:
            input = self.info_input + input
            self.info_input = ""

        if not debug_output:
            try:
                response = self.chat.send_message(input)
            except Exception as e:
                self.win.evaluate_js(f"popup.error({json.dumps(str(e))})")
                self.win.evaluate_js(f"chatHistory.hideSpinner({json.dumps(str(e))})")
                return
            self.output = response.text
            print(response.text)
        else:
            self.output = user_input

        self.process_output()

        # Ausgabe ans Frontend schicken
        self.win.evaluate_js(f"output({json.dumps(self.block_output)})")
        
        # Falls die KI ein Skript generiert hat, testen
        if self.block_python != "":
            temp_dir = self.test_script()
            self.win.evaluate_js(f"test.start({json.dumps(str(temp_dir))})")

    # Returned Python-Code, Befehle und Ausgabe in KI-Antwort
    def process_output(self):
        self.block_python = get_block_content(self.output, "python")
        self.block_commands = get_block_content(self.output, "commands")
        self.block_output = get_block_content(self.output, "output")
    
    # Führt das KI-Skript in temporären Ordner aus, vergleicht Veränderungen
    def test_script(self):
        self.tester = TestingChanges(self.path)
        test_dir = self.tester.create_clone_dir()

        self.test_script_path = Path(__file__).parent.parent / "odo_scripts" / "temp_script.py"
        self.test_script_path.parent.mkdir(parents=True, exist_ok=True)
        self.test_script_path.write_text(self.block_python, encoding="utf-8")

        result = subprocess.run(
            [sys.executable, str(self.test_script_path)],
            capture_output=True,
            text=True,
            cwd=str(test_dir),
            encoding="utf-8"
        )

        if len(result.stderr):
            self.execute_error = result.stderr
        
        self.tester.compare_dirs()

        return test_dir

    # Wendet Script auf den echten Ordner an
    def accept_changes(self):
        subprocess.run(
            [sys.executable, str(self.test_script_path)],
            capture_output=True,
            text=True,
            cwd=str(self.path),
            encoding="utf-8"
        )
        # self.info_input = get_instruction_from_file("accept")
        self.info_input = """The user accepted your script fully. The directory state has been updated accordingly. The following message is a new request — treat it as such, but keep the session context in mind.


"""
    
    # Teilt der KI mit, dass Änderungen überarbeitet werden sollen
    def revise_changes(self):
        # self.info_input = get_instruction_from_file("revise")
        self.info_input = """The user has not yet accepted your script. Treat it as unexecuted — do not update your mental model of the directory. The user has added the following information or changes to the pending request. Revise your script accordingly and replace the previous one entirely.


"""
    
    # Teilt der KI mit, dass Änderungen abgelehnt wurden
    def reject_changes(self):
        # self.info_input = get_instruction_from_file("reject")
        self.info_input = """The user rejected the changes made by your script and discarded them. The directory state remains unchanged. The following message may or may not be related to the previous task — interpret it fresh, but keep session context in mind.


"""

    # Überblick über insgesamte Veränderungen
    def get_overview_changes(self):
        return self.tester.compare_dirs()
    
    # Gibt die Änderungen in einem bestimmten Ordner zurück
    def get_dir_changes(self, dir):
        return self.tester.changes_in_dir(Path(dir))
    
    # Gibt den originalen Pfad eines temp-Ordners zurück
    def original_dir(self, dir_path):
        dir_path = Path(dir_path)
        odotempdir_files = list(dir_path.glob("*.odotempdir"))
        if not odotempdir_files:
            return ""
        with open(odotempdir_files[0]) as f:
            dir_original = f.readline().strip()
        return dir_original
    
    # Speichert neue Einstellungen und erstellt Client neu
    def set_settings(self, api, model):
        global GEMINI_API_KEY, MODEL
        if api:
            GEMINI_API_KEY = api
            os.environ["GEMINI_API_KEY"] = api
        if model:
            MODEL = model
        self.new_client()