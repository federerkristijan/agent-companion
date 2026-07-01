# Contributing

Thanks for your interest in improving **Agent Companion**! This guide covers how to propose changes.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) first — it applies to all project spaces.

## Getting started

1. Fork the repo and clone your fork.
2. Create a feature branch off `main`: `git checkout -b feat/short-description`.
3. Install dependencies for the area you're working on:
   - **Mobile app** (`mobile/`) — [Expo](https://expo.dev) / React Native: `npm install`
   - **Supabase edge functions** (`supabase/functions/`) — [Deno](https://deno.com)
4. See [README.md](README.md) and [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for the architecture, Supabase setup, and required environment variables.

## Making changes

- Keep each pull request focused on one logical change.
- Match the style and conventions of the surrounding code.
- Never commit secrets. `.env` files and credentials must stay out of the repo (see [SECURITY.md](SECURITY.md)).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org): a `type:` prefix followed by a concise, imperative subject.

```
feat: add sources list to blog article schema
fix: handle empty cover image caption
docs: document session workflow
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

## Pull requests

- Keep PR descriptions minimal and precise — two sections: **`## Context`** (why) and **`## Scope`** (what changed).
- Link any related issue.
- Make sure the automated checks pass: the SBOM, CodeQL, and dependency-review workflows run on every PR (see [SECURITY.md](SECURITY.md)).

## Reporting bugs & asking questions

- **Bugs / feature requests** → open a GitHub Issue with steps to reproduce and expected vs. actual behavior.
- **Questions / help** → see [SUPPORT.md](SUPPORT.md).
- **Security issues** → do not open a public issue; see [SECURITY.md](SECURITY.md).
