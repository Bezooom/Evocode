# Skills corpus — provenance and licenses

## Policy

- **First-party** skills are named `evocode-*` (pack `evocode-core`). MIT, same as the root LICENSE.
- **Imported / community** skills under `skills/system/` come from multiple open sources
  (agent skill libraries, Kilo backups, public SKILL.md collections). Where a skill
  ships its own `LICENSE` or `LICENSE.txt`, that file governs that skill.
- **Lab / offensive** skills may exist for defensive research. They are **disabled**
  in auto-route by default (`EVOCODE_SKILLS_ALLOW_LAB=false`). Quarantine dups live in
  `skills/.archive/` (gitignored).

## Operator notes

- User overrides: `skills/user/` (gitignored except `.gitkeep`).
- Authoring guide: [docs/SKILL_AUTHORING.md](../docs/SKILL_AUTHORING.md).
- Router: Skill Router v2 (frontmatter packs/tiers, hybrid embeddings).

## Import

```bash
EVOCODE_SKILLS_IMPORT_DIRS="/path/to/skills-a:/path/to/skills-b" npm run skills:import
```

Do not commit private company playbooks or secrets into `skills/system/`.

## Disclaimer

Skills are instructions for an LLM, not audited security tools. Review content
before enabling lab packs or syncing remote skill sources.
