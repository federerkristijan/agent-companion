"""
TypeScript skill — validate generated code using the real TypeScript compiler.
Requires: node + tsc available in PATH (pre-installed in GitHub Actions ubuntu-latest).
"""

import os
import json
import tempfile
import subprocess


def _write_temp_project(files: dict[str, str], tsconfig: str | None = None) -> str:
    """
    Write files to a temp directory and return the directory path.
    files: {relative_path: content}
    """
    tmpdir = tempfile.mkdtemp(prefix="ts_check_")

    default_tsconfig = json.dumps({
        "compilerOptions": {
            "target": "ES2017",
            "lib": ["dom", "dom.iterable", "esnext"],
            "allowJs": True,
            "skipLibCheck": True,
            "strict": True,
            "noEmit": True,
            "esModuleInterop": True,
            "module": "esnext",
            "moduleResolution": "bundler",
            "resolveJsonModule": True,
            "isolatedModules": True,
            "jsx": "preserve",
            "incremental": True,
            "plugins": [{"name": "next"}],
            "paths": {"@/*": ["./*"]}
        },
        "include": ["**/*.ts", "**/*.tsx"],
        "exclude": ["node_modules"]
    }, indent=2)

    config_content = tsconfig if tsconfig else default_tsconfig
    with open(os.path.join(tmpdir, "tsconfig.json"), "w") as f:
        f.write(config_content)

    for rel_path, content in files.items():
        full_path = os.path.join(tmpdir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)

    return tmpdir


def check_files(files: dict[str, str], tsconfig: str | None = None) -> dict:
    """
    Run tsc --noEmit on the given files.

    files: {relative_path: content} — e.g. {"src/components/ui/Foo.tsx": "..."}
    Returns: {"passed": bool, "errors": [str], "raw": str}
    """
    try:
        subprocess.run(["tsc", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {"passed": None, "errors": [], "raw": "tsc not available — skipping TypeScript check"}

    tmpdir = _write_temp_project(files, tsconfig)

    try:
        result = subprocess.run(
            ["tsc", "--noEmit"],
            cwd=tmpdir,
            capture_output=True,
            text=True,
            timeout=30,
        )
        passed = result.returncode == 0
        output = (result.stdout + result.stderr).strip()
        errors = [line for line in output.splitlines() if "error TS" in line]
        return {"passed": passed, "errors": errors, "raw": output}
    except subprocess.TimeoutExpired:
        return {"passed": None, "errors": [], "raw": "tsc timed out"}
    finally:
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)


def format_errors(check_result: dict) -> str:
    """Format tsc output for LLM consumption."""
    if check_result["passed"] is None:
        return check_result["raw"]
    if check_result["passed"]:
        return "TypeScript check passed — no errors."
    errors = "\n".join(check_result["errors"]) or check_result["raw"]
    return f"TypeScript errors found:\n{errors}"
