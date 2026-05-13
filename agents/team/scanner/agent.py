"""Scanner Agent — reads the full project. Makes no decisions."""

from team.state import AgentState
from team.skills.github import get_repo, read_project_tree, read_files

CONFIG_FILES = [
    ".eslintrc.json", "eslint.config.js", "eslint.config.mjs",
    "tailwind.config.ts", "tailwind.config.js",
    "next.config.ts", "next.config.js",
]
TYPE_FILES = ["src/types/global.ts", "src/types/index.ts", "src/types.ts"]
DATA_FILES = ["src/utils/variables.ts", "src/utils/variables.tsx", "src/data/index.ts"]


def scan_project(state: AgentState) -> AgentState:
    repo = get_repo()
    all_paths = read_project_tree(repo)

    relevant = [
        p for p in all_paths
        if p.startswith("src/") or p in CONFIG_FILES + ["package.json", "tsconfig.json"]
    ]
    project_tree = "\n".join(relevant)

    to_read = ["package.json", "tsconfig.json", state["target_page"]]

    # Data / types / config
    for candidate in DATA_FILES:
        if candidate in all_paths:
            to_read.append(candidate)
            break

    for candidate in TYPE_FILES:
        if candidate in all_paths:
            to_read.append(candidate)
            break

    for candidate in CONFIG_FILES:
        if candidate in all_paths:
            to_read.append(candidate)
            break

    # ALL page files — so the integrator knows what every page imports
    all_pages = [p for p in all_paths if p.endswith("page.tsx") or p.endswith("page.ts")]
    to_read.extend(all_pages)

    # ALL layout files — shared structure
    all_layouts = [p for p in all_paths if p.endswith("layout.tsx") or p.endswith("layout.ts")]
    to_read.extend(all_layouts)

    # All components (UI + page-level) — full picture of what exists
    all_components = [p for p in all_paths if p.startswith("src/components/") and p.endswith(".tsx")]
    to_read.extend(all_components)

    key_files = read_files(repo, list(dict.fromkeys(to_read)))
    print(f"[scanner] {len(all_paths)} files in tree, {len(key_files)} loaded")
    return {**state, "project_tree": project_tree, "key_files": key_files}
