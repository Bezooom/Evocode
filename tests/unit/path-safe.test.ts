import {
  isPathInside,
  sanitizeSkillRelativePath,
  safeSkillFetchUrl,
} from '../../src/sync/path-safe';
import * as path from 'path';

describe('path-safe', () => {
  it('isPathInside rejects prefix sibling and ..', () => {
    const root = path.resolve('/tmp/skills/system');
    expect(isPathInside(root, path.join(root, 'a/SKILL.md'))).toBe(true);
    expect(isPathInside(root, path.resolve(root, '../evil'))).toBe(false);
    expect(isPathInside(root, root + '-evil/x')).toBe(false);
  });

  it('sanitizeSkillRelativePath rejects traversal', () => {
    expect(sanitizeSkillRelativePath('ok/SKILL.md')).toBe('ok/SKILL.md');
    expect(sanitizeSkillRelativePath('../etc/passwd')).toBeNull();
    expect(sanitizeSkillRelativePath('/etc/passwd')).toBeNull();
    expect(sanitizeSkillRelativePath('a/../../b')).toBeNull();
    expect(sanitizeSkillRelativePath('ok/with space.md')).toBeNull();
  });

  it('safeSkillFetchUrl only allows github https', () => {
    const u = safeSkillFetchUrl(
      'https://github.com/evocode/skills',
      'main',
      'skills/',
      'foo/SKILL.md'
    );
    expect(u).toContain('github.com/evocode/skills/raw/main/');
    expect(
      safeSkillFetchUrl('http://evil.example/x', 'main', '', 'a.md')
    ).toBeNull();
  });
});
