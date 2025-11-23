import sys
import builtins
import json
import socket

ALLOWED_MODULES = {}

def is_import_allowed(module_name):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(("127.0.0.1", 13096))
        s.sendall("module:", module_name.encode() + b"\n")
        response = s.recv(1024).decode().strip()
        s.close()
        return response == "ALLOW"
    except Exception:
        return False

original_import = builtins.__import__

def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name in ALLOWED_MODULES or is_import_allowed(name):
        return original_import(name, globals, locals, fromlist, level)
    raise ImportError(f"Module '{name}' is not allowed")

if __name__ == "__main__":
    scope = {
        "print": print,
        "len": len,
        "range": range,
        "__import__": restricted_import
    }
    lines = []
    for line in sys.stdin:
        line = line.strip()
        if line == "EOS":
            break
        lines.append(line)
    code = "\n".join(lines)
    print("script initialized");
    exec(code, {"__builtins__": scope})
