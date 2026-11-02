---
doc_id: ai-project-context
version: 1.0.0
canonical_path: .ai/PROJECT_CONTEXT.md
updated: 2026-11-02
---

# 정수의 서재 (library) Context

The only file in `.ai/` allowed to know what the project is; every other
document survives being copied elsewhere because this one exists.

## repository_mode

```text
repository_mode: protected
```

A standing approval covers merging (see *Local rules*).

## Facts the checks read

```text
base_branch: stable
merge_deploys: yes
runtime_gate: npm start, then open http://127.0.0.1:4173 and check the shelf tabs, contents, search and a topic page at desktop and mobile widths
test_command: npm test
lint_command: none
build_command: npm run build:pages
generated: index.html, .nojekyll ← src/, content/ : npm run build:pages; dist/ ← src/, content/ : npm run build
external_scripts: none
public_ids: none
owner_ledger: .ai/reports/OWNER_ACTIONS.md
```

## Authoritative product constraints

- A Korean knowledge library: books on relationships, love, time and growth,
  condensed into knowledge a reader can apply. Shelf tabs (English, Electronic,
  Tech, Common) → one tab per book → contents → topic text, sentences to
  remember and questions to practise.
- It runs with no server and no external API, and builds with Node.js 20+ and
  no installed packages.
- Reader state (shelf, bookmarks, recently read topics, font size, column
  widths) lives in the browser's `localStorage` only.
- Adding a book is data-only: a new JSON under `content/` must appear without
  any change to UI or build code.

## Current architecture

- `content/*.json` holds one book each; `scripts/catalog.mjs` defines the
  shelves and their order; `src/` holds the UI.
- `scripts/build.mjs` combines data and UI. `--pages` writes the published
  `index.html` and `.nojekyll` at the root; without it, `dist/` gets a
  static site and a standalone `dist/library.html`.
- GitHub Pages publishes the root of `stable`. There is no Actions workflow:
  the generated files are committed with their sources.
- `tests/content.test.mjs` validates every book's structure, tables and
  sentence-study drills.

## Current development slice

- Sentence-study drills for situation-based English learning: base sentence,
  hints, alternative answers, per-drill validation.

## Permanently excluded scope

- Original PDFs and OCR full text are never stored in the repository, its
  history, or anything published or downloadable (copyright; the user revoked
  PDF storage on 2026-10-04).
- No PDF linking or upload feature.
- No cross-device sync and no account.

## Local rules

- Standing approval to merge and deploy (the user, 2026-10-17, recorded in
  `.ai/memory/PROJECT_LESSONS.md`): when a pull request is opened for a
  change, merge it into `stable` without waiting for a further go-ahead, then
  look up the Pages run once and report its conclusion. It does not cover
  pushing to any branch but the pull request's, or force-pushing. This is the
  standing approval `.ai/REPOSITORY.md` § *Merge and deploy* allows a project
  context to record.
