"""
GitHub skills — all interactions with the portfolio repository.
No LLM calls. No business logic. Pure GitHub API operations.
"""

import os
from github import Github, Repository as Repo


PORTFOLIO_REPO = "federerkristijan/kf-portfolio"


def get_repo() -> Repo.Repository:
    from github import Auth
    return Github(auth=Auth.Token(os.environ["GITHUB_TOKEN"])).get_repo(PORTFOLIO_REPO)


def read_project_tree(repo: Repo.Repository) -> list[str]:
    """Return all blob file paths in the repo (recursive)."""
    tree = repo.get_git_tree(repo.get_branch("main").commit.sha, recursive=True)
    return [item.path for item in tree.tree if item.type == "blob"]


def read_file(repo: Repo.Repository, path: str, ref: str = "main") -> str:
    """Return decoded content of a single file. Raises on missing file."""
    f = repo.get_contents(path, ref=ref)
    return f.decoded_content.decode()


def read_files(repo: Repo.Repository, paths: list[str]) -> dict[str, str]:
    """Read multiple files. Silently skips files that don't exist."""
    result = {}
    for path in paths:
        try:
            result[path] = read_file(repo, path)
        except Exception as e:
            print(f"[github] could not read {path}: {e}")
    return result


def create_branch(repo: Repo.Repository, branch_name: str) -> None:
    main_sha = repo.get_branch("main").commit.sha
    repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=main_sha)


def commit_file(
    repo: Repo.Repository,
    branch: str,
    path: str,
    content: str,
    message: str,
) -> None:
    """Create or overwrite a file on the branch."""
    try:
        existing = repo.get_contents(path, ref=branch)
        repo.update_file(path=path, message=message, content=content, sha=existing.sha, branch=branch)
    except Exception:
        repo.create_file(path=path, message=message, content=content, branch=branch)


def delete_file(
    repo: Repo.Repository,
    branch: str,
    path: str,
    message: str,
) -> None:
    existing = repo.get_contents(path, ref=branch)
    repo.delete_file(path=path, message=message, sha=existing.sha, branch=branch)


def apply_changes(
    repo: Repo.Repository,
    branch: str,
    changes: list[dict],
    run_id: str = "",
) -> None:
    """Apply a list of {path, action, content} dicts to the branch."""
    suffix = f" [{run_id}]" if run_id else ""
    for change in changes:
        path = change["path"]
        action = change["action"]
        content = change.get("content", "")
        if action in ("create", "update"):
            commit_file(repo, branch, path, content, f"{action}: {path}{suffix}")
            print(f"[github] {action}  {path}")
        elif action == "delete":
            try:
                delete_file(repo, branch, path, f"delete: {path}{suffix}")
                print(f"[github] delete  {path}")
            except Exception as e:
                print(f"[github] could not delete {path}: {e}")


def open_pr(
    repo: Repo.Repository,
    branch: str,
    title: str,
    body: str,
) -> str:
    pr = repo.create_pull(title=title, body=body, head=branch, base="main")
    return pr.html_url
