# Public release checklist

Before `git push --mirror` / first public GitHub release:

## 1. Secrets (history)

```bash
gitleaks detect --source=. --verbose
# must not contain live sk-or-v1-… / sk-… / tokens
```

If a real key was ever committed:

1. **Rotate** the key at the provider (OpenRouter etc.) immediately.
2. Rewrite history (`git filter-repo --path … --invert-paths` or `--replace-text`).
3. Force-push only if the remote was never public, or treat the key as burned.

Local only (gitignored): `.env`, `.evocode/config.json`.

## 2. Security

- [x] Skill Sync path traversal hardened (`path-safe.ts`, relative path allowlist, github-only HTTPS)
- [x] Skill Sync **off by default** (`SKILL_SYNC_ENABLED=false`)
- [x] DLP on `/v1/chat/completions` cloud path; refuse cloud if DLP disabled
- [x] Bare OpenRouter/OpenAI key patterns in DLP rules
- [ ] Manual review of any remaining gitleaks hits (placeholders vs real)

## 3. License

- [x] `LICENSE` (MIT Core)
- [x] `NOTICE` (VSCodium / OpenCode / Kilo / skills)
- [x] `docs/ARCHITECTURE_BORROW.md` attribution
- [ ] Confirm you are **not** shipping proprietary Kilo trees in the public remote

## 4. Portable config

- [x] `config/profiles.example.json` + `$HOME` expansion
- [x] Core defaults: empty `LLAMA_MODEL` / `LLAMA_BINARY` (profiles/env required)
- [x] `.env.example` without secrets

## 5. Size

Tracked tree ≈ tens of MB (skills). Do **not** commit `packages/ide/dist/`, GGUF, `node_modules`.

## 6. After first public push

- Enable GitHub secret scanning
- Add SECURITY.md contact
- Consider branch protection on `master`
