# Security

## 1. SBOM Pipeline (`.github/workflows/sbom.yml`)

Runs on every push and pull request to `main`. Covers both the mobile app (npm) and the Python agents separately.

| Step | Tool | What it does |
|---|---|---|
| Generate SBOM | [syft](https://github.com/anchore/syft) via `anchore/sbom-action` | Produces a CycloneDX JSON bill of materials |
| Vulnerability scan | [grype](https://github.com/anchore/grype) | Scans SBOM, fails on HIGH+ |
| npm audit | npm built-in | Audits production deps only (`--omit=dev --audit-level=high`) |
| pip-audit | [pip-audit](https://github.com/pypa/pip-audit) | Audits Python agent dependencies |
| Secret scan | [trufflehog](https://github.com/trufflesecurity/trufflehog) | Detects verified secrets committed to the repo |
| Upload artifacts | `actions/upload-artifact` | Saves `sbom-npm.cdx.json` and `sbom-python.cdx.json` |

**Key decisions:**
- Grype installed directly via install script — gives human-readable table output in CI logs.
- `npm audit --omit=dev` — dev tooling vulnerabilities are not runtime risk.
- pip-audit runs against a frozen `uv export` snapshot to match what actually ships.
- All reports uploaded as artifacts even on failure (`if: always()`).

---

## 2. CodeQL (`.github/workflows/codeql.yml`)

- Runs on push/PR to `main` and weekly (Monday 09:00 UTC).
- Languages: `javascript-typescript` (mobile) and `python` (agents).
- Catches injection, insecure patterns, and common OWASP issues via static analysis.

---

## 3. Dependency Review (`.github/workflows/dependency-review.yml`)

- Runs only on pull requests.
- Blocks merge if any new dependency introduces a HIGH or CRITICAL CVE.

---

## 4. OpenSSF Scorecard (`.github/workflows/scorecard.yml`)

- Runs weekly and on push to `main`.
- Scores the repo against OpenSSF security best practices.
- Results uploaded to GitHub Security tab as SARIF.

---

## 5. Dependabot (`.github/dependabot.yml`)

Keeps all three package ecosystems up to date via weekly PRs:
- `npm` — `/mobile`
- `pip` — `/agents`
- `github-actions` — `/`

---

## 6. Prompt Injection Guard (`agents/tasks/blog_agent.py`)

`user_message` is received from a GitHub Actions `workflow_dispatch` input and passed directly to an LLM. Before invoking the graph, `_validate_user_message()` rejects:

- Messages exceeding 4 000 characters
- Common injection phrases (`ignore previous instructions`, `you are now`, `forget your`, etc.)
- Null bytes and ANSI escape sequences

If validation fails, the workflow exits with a `ValueError` before any LLM call is made.

---

## 7. Workflow Hardening

Every workflow follows these rules:

**SHA-pinned actions** — tags are mutable and can be hijacked. All `uses:` references are pinned to a full 40-character commit SHA with the tag noted in a comment:
```yaml
uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
```

**Least-privilege permissions** — `permissions: read-all` at the top level; each job declares only what it needs:
```yaml
permissions: read-all

jobs:
  my-job:
    permissions:
      contents: read
      security-events: write
```

---

## 8. GitHub Settings (manual, per repo)

- **Secret scanning** — Settings → Security → Secret scanning → Enable
- **Push protection** — Settings → Security → Secret scanning → Push protection → Enable
- **Branch protection on `main`** — require SBOM and dependency-review checks to pass before merge

---

## Checklist for onboarding a new contributor

- [ ] Copy `.github/workflows/sbom.yml`, `codeql.yml`, `dependency-review.yml`, `scorecard.yml`
- [ ] Copy `.github/dependabot.yml`
- [ ] Enable secret scanning + push protection in GitHub repo settings
- [ ] Set branch protection requiring SBOM and dependency-review checks
- [ ] Ensure all `workflow_dispatch` inputs that reach an LLM are validated with `_validate_user_message()`
