from pathlib import Path
from google import genai
import subprocess
import os
import json

from api.test_changes import TestingChanges


INSTR_FIRST_CALL = (Path(__file__).parent / "ai_instructions" / "first_call.txt").read_text()

GEMINI_API_KEY = "AIzaSyDACazxa3v8O38Fx8cL5NaMVo-qH6uTQ-w"
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
MODEL = "gemini-3-flash-preview"


def get_block_content(text, block_name):
    """Gibt den Inhalt eines Blockes in der KI-Ausgabe"""
    block_start = text.find(f"```{block_name}") + len(block_name) + 3

    # Abbrechen, wenn Block nicht gefunden
    if block_start == -1:
        return None
    
    block_end = text.find("```", block_start)

    block_content = text[block_start: block_end]

    return block_content

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
        self.client = genai.Client()
        self.chat = self.client.chats.create(model=MODEL)

        self.is_new_session = True
    
    def new_session(self):
        self.chat = self.client.chats.create(model=MODEL)
        self.is_new_session = True

    def send_input(self, user_input, path, api_key, debug_output = False):
        #TODO Add API Key functionality
        
        self.block_commands = ""
        self.block_output = ""
        self.block_python = ""
        
        self.path = path

        if self.is_new_session:
            input = INSTR_FIRST_CALL + user_input
            self.is_new_session = False

        input += "Directory: " + get_dir_content(path)


        print(input)
        print("--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------")

        if not debug_output:
            response = self.chat.send_message(input)
            self.output = response.text
            print(response.text)
        else:
            self.output = user_input

        self.process_output()

        self.win.evaluate_js(f"output({json.dumps(self.block_output)})")

        if self.block_python:
            temp_dir = self.test_script()
            self.win.evaluate_js(f"startTest({json.dumps(str(temp_dir))})")

        self.execute_error = []

    def process_output(self):
        self.block_python = get_block_content(self.output, "python")
        self.block_commands = get_block_content(self.output, "commands")
        self.block_output = get_block_content(self.output, "output")

        if self.block_python:
            self.test_script()
    
    def test_script(self):
        self.tester = TestingChanges(self.path)
        test_dir = self.tester.create_clone_dir()

        self.test_script_path = Path(__file__).parent.parent / "scripts" / "temp_script.py"
        self.test_script_path.parent.mkdir(parents=True, exist_ok=True)
        self.test_script_path.write_text(self.block_python)
        result = subprocess.run(["python3", str(self.test_script_path)], capture_output=True, text=True, cwd=test_dir)

        if len(result.stderr):
            self.execute_error = result.stderr
        
        self.tester.compare_dirs()

        return test_dir

    def reject_changes(self, input):
        self.send_input(f"The changes made by your script were rejected by the user: {input}", self.path)

    def accept_changes(self):
        subprocess.run(["python3", str(self.test_script_path)], capture_output=True, text=True, cwd=self.path)

    def get_overview_changes(self):
        return self.tester.compare_dirs()
    
    def get_dir_changes(self, dir):
        return self.tester.changes_in_dir(Path(dir))

    
    


    

