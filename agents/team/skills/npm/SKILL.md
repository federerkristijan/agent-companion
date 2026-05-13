---
name: npm
description: Query the npm registry to check if packages exist, get their latest version, verify TypeScript types are available, and check which packages are installed in package.json.
---

# npm Skill

## When to use
Before generating code that imports a package — verify it exists and is installed.
Prevents the builder from importing packages that aren't in package.json.

## Key functions
- `package_exists(name)` — True if on npm
- `get_latest_version(name)` — latest semver string
- `has_types(name)` — True if ships types or has @types/*
- `missing_packages(package_json, packages)` — returns list of uninstalled packages
