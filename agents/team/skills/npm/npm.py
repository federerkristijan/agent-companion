"""
npm skill — query the npm registry and inspect package.json.
No API key required. Uses the public npm registry REST API.
"""

import json
import requests

NPM_REGISTRY = "https://registry.npmjs.org"


def get_package_info(package_name: str) -> dict | None:
    """
    Fetch package metadata from the npm registry.
    Returns the abbreviated metadata dict, or None if not found.
    """
    try:
        resp = requests.get(f"{NPM_REGISTRY}/{package_name}", timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"[npm] registry error for {package_name}: {e}")
        return None


def package_exists(package_name: str) -> bool:
    """Check if a package exists on npm."""
    return get_package_info(package_name) is not None


def get_latest_version(package_name: str) -> str | None:
    """Return the latest version string of a package, or None."""
    info = get_package_info(package_name)
    if info:
        return info.get("dist-tags", {}).get("latest")
    return None


def has_types(package_name: str) -> bool:
    """
    Return True if the package ships its own types or has a @types/* package.
    """
    info = get_package_info(package_name)
    if info:
        latest = info.get("dist-tags", {}).get("latest")
        if latest and info.get("versions", {}).get(latest, {}).get("types"):
            return True
    return package_exists(f"@types/{package_name.lstrip('@').replace('/', '__')}")


def check_dependencies(package_json_content: str, required_packages: list[str]) -> dict:
    """
    Given the content of package.json and a list of required package names,
    return a dict: {package_name: "installed" | "missing"}.
    """
    try:
        pkg = json.loads(package_json_content)
    except json.JSONDecodeError:
        return {p: "unknown" for p in required_packages}

    all_deps = {
        **pkg.get("dependencies", {}),
        **pkg.get("devDependencies", {}),
    }
    return {
        p: "installed" if p in all_deps else "missing"
        for p in required_packages
    }


def missing_packages(package_json_content: str, required_packages: list[str]) -> list[str]:
    """Return only the packages from required_packages that are not in package.json."""
    status = check_dependencies(package_json_content, required_packages)
    return [p for p, s in status.items() if s == "missing"]
