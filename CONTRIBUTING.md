# Contributing to Evocode (Эвокод)

## Setup

```bash
git clone <your-fork-or-remote> Evocode
cd Evocode
cp .env.example .env
cp config/profiles.example.json config/profiles.json   # if you need a clean template
# edit profiles.json — use $HOME/... paths; do not commit machine-specific usernames
npm ci
npm run build
npm test
```

Local LLM binaries and GGUF files are **not** in this repo. Point `config/profiles.json`
at your installs (see [docs/RUNTIME.md](docs/RUNTIME.md)).

Agent rebrand needs upstream kilo-vscode:

```bash
export KILO_SRC=/path/to/kilocode/packages/kilo-vscode
npm run bootstrap:agent
npm run agent:f1
```

## Code norms

- Prefer attach-first local inference; no silent stub “success”.
- No hard-coded absolute home directories (`/home/<user>/...`). Use `$HOME`, env vars, or paths relative to the repo.
- Do not commit secrets, `.env`, GGUF, large IDE trees, or personal userdata.
- Russian UI strings for product shell; Core APIs stay language-agnostic where practical.
- Skills: new product skills go under `skills/system/evocode-*` with frontmatter (see SKILL_AUTHORING).

## Tests

```bash
npm test
npm run type-check
```

## PRs

- Small, focused commits; clear message (what + why).
- Update CHANGELOG / STATUS when user-visible.
- Do not force-push shared branches; do not commit generated `packages/ide/dist/`.

## License

By contributing you agree contributions are under the project MIT license (see LICENSE and NOTICE).
