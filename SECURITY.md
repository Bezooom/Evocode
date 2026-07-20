# Security Policy

## Product stance

Evocode is **local-first / privacy-first**:

- Core binds to **localhost** by default.
- Cloud paths go through **DLP** when enabled.
- Local models attach by path; weights stay outside the repo.

## Reporting a vulnerability

Please report security issues **privately** (do not open a public GitHub issue with exploit details).

Include:

- Affected version / commit
- Reproduction steps
- Impact (local RCE, data exfiltration, auth bypass, etc.)

## Hardening checklist for operators

1. Keep Core on `127.0.0.1` unless you set `EVOCODE_AUTH_TOKEN` and understand network exposure.
2. Never commit `.env`, API keys, or `config` files with real cloud credentials.
3. Review `skills/system` before enabling lab packs (`EVOCODE_SKILLS_ALLOW_LAB`).
4. Treat skill-sync remote URLs carefully (SSRF guards exist; still pin trusted sources).
5. Prefer `EVOCODE_LLAMA_MODE=attach` so Core does not spawn arbitrary binaries without review of `profiles.json`.

## Known scope (honest)

This is an RC product, not a certified secure enclave. See `SECURITY_AUDIT.md` and
`CRITICAL_ANALYSIS.md` for historical findings and residual risk.
