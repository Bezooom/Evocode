---
name: agents-md-site
description: |
  Разработка и поддержка сайта AGENTS.md (Next.js приложение с документацией формата AGENTS.md). 
  Используется при работе с проектом агентских инструкций в стиле Next.js 13+ Pages Router.
---

# Skill: AGENTS.md Site Development

This skill provides guidance for developing and maintaining the AGENTS.md website.

## When to Use This Skill

Use this skill when:
- Working with a Next.js project using Pages Router (not App Router)
- The project has AGENTS.md format for agent instructions
- Need to update documentation, components, or styles for the site

## Project Structure

```
agents.md-main/
├── components/          # React components (.tsx)
├── pages/               # Next.js pages (_app.tsx, _document.tsx, index.tsx)
├── public/              # Static assets (images, icons)
├── styles/             # CSS modules
├── AGENTS.md           # Agent guidelines (this format!)
├── README.md            # Project documentation
├── package.json         # Dependencies (pnpm)
└── next.config.ts      # Next.js configuration
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server with HMR (REQUIRED for agent work) |
| `pnpm lint` | Run ESLint checks |
| `pnpm build` | Production build (DO NOT run during agent sessions) |

## Development Rules

### Critical: Use Dev Server, NOT Build

- **ALWAYS use `pnpm dev`** while iterating on the application
- **DO NOT run `pnpm build` inside agent sessions** - disables hot reload
- If production build needed, do it outside the agent workflow

### Dependency Management

When adding/updating dependencies:
1. Update pnpm-lock.yaml
2. Restart dev server so Next.js picks up changes

### Code Conventions

- Prefer TypeScript (.tsx/.ts) for new components
- Co-locate component-specific styles in same folder

## Useful File Locations

- Main page: `pages/index.tsx`
- App config: `pages/_app.tsx`
- Document template: `pages/_document.tsx`
- Components: `components/*.tsx`
- Styles: `styles/*.module.css`
