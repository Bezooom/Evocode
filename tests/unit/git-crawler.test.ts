import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GitSkillCrawler } from '../../src/sync/git-crawler';

describe('GitSkillCrawler & Cursor Rules Converter', () => {
  let tmpDir: string;
  let crawler: GitSkillCrawler;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evocode-crawler-test-'));
    crawler = new GitSkillCrawler(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup error */
    }
  });

  it('converts .cursorrules / .mdc to Evocode SKILL.md format', () => {
    const rawMdc = `---
description: React Next.js performance rules
globs: *.tsx, *.jsx
---

# Next.js Guidelines
- Always use Server Components when possible.
- Optimize images using next/image.
`;

    const skill = crawler.convertCursorRuleToSkill('nextjs.mdc', rawMdc, 'awesome-cursorrules');
    expect(skill.isCursorRule).toBe(true);
    expect(skill.description).toBe('React Next.js performance rules');
    expect(skill.triggers).toContain('*.tsx');
    expect(skill.content).toContain('name: nextjs');
    expect(skill.content).toContain('Optimize images using next/image.');
  });

  it('saves crawled skill to disk', () => {
    const skill = crawler.convertCursorRuleToSkill(
      'security-audit.mdc',
      'Always sanitize sql queries',
      'security-repo'
    );
    const savedPath = crawler.saveCrawledSkill(skill);
    expect(fs.existsSync(savedPath)).toBe(true);
    expect(crawler.getCrawledSkillsCount()).toBe(1);
  });
});
