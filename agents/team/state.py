"""
Shared state for the Feature Agent team.
No logic here — only data structures.
"""

from typing import TypedDict


class PlannedFile(TypedDict):
    path: str
    action: str          # "create" | "update" | "delete"
    description: str
    needs_context: list  # file paths this agent needs to read


class BuiltFile(TypedDict):
    path: str
    action: str          # "create" | "update" | "delete"
    content: str         # empty string for deletes


class AgentState(TypedDict):
    task_description: str
    component_name: str
    target_page: str
    # Scanner output
    project_tree: str
    key_files: dict       # path -> content
    # Planner output
    plan: list            # list of PlannedFile
    pending_files: list   # files not yet built
    # Builder/Reviewer loop
    current_file: dict    # PlannedFile currently in progress
    built_files: list     # list of BuiltFile (completed)
    # Integrator output
    final_files: list     # list of BuiltFile after cross-file check
    # PR
    pr_url: str
    run_id: str
