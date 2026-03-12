import sys
import json
import time
import traceback
import io
import contextlib

MAX_OUTPUT_CHARS = 8000

def truncate(text):
    if text is None:
        return ""
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + "\n... [salida truncada]"


def execute(code):
    stdout = io.StringIO()
    stderr = io.StringIO()
    globals_dict = {}
    start = time.perf_counter()
    try:
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(code, globals_dict, globals_dict)
    except Exception:
        traceback.print_exc(file=stderr)
    runtime_ms = int((time.perf_counter() - start) * 1000)
    return truncate(stdout.getvalue()), truncate(stderr.getvalue()), runtime_ms


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception:
            continue
        req_id = payload.get("id")
        code = payload.get("code", "")
        stdout, stderr, runtime_ms = execute(code)
        response = {
            "id": req_id,
            "stdout": stdout,
            "stderr": stderr,
            "runtime_ms": runtime_ms,
        }
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
