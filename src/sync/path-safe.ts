/**
 * Path safety helpers for Skill Sync (path traversal / zip-slip style writes).
 */
import * as path from 'path';

/**
 * True if `candidate` is exactly `root` or a path strictly inside `root`.
 * Rejects prefix tricks (`/skills` vs `/skills-evil`) and `..` escapes.
 */
export function isPathInside(root: string, candidate: string): boolean {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  if (c === r) return true;
  const prefix = r.endsWith(path.sep) ? r : r + path.sep;
  return c.startsWith(prefix);
}

/**
 * Normalize a relative skill path from a remote MANIFEST.
 * Rejects absolute paths, Windows drive letters, NUL, and any `..` segment.
 */
export function sanitizeSkillRelativePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let p = raw.replace(/\\/g, '/').trim();
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return null;
  if (p.includes('\0')) return null;
  // strip leading ./
  p = p.replace(/^\.\//, '');
  const parts = p.split('/').filter((s) => s.length > 0 && s !== '.');
  if (parts.length === 0) return null;
  if (parts.some((seg) => seg === '..')) return null;
  // only allow safe skill file names
  if (parts.some((seg) => !/^[a-zA-Z0-9._@+-]+$/.test(seg))) return null;
  return parts.join('/');
}

/** Build skill URL under source and reject escapes / external hosts. */
export function safeSkillFetchUrl(
  sourceUrl: string,
  branch: string,
  sourcePath: string,
  relativeSkillPath: string
): string | null {
  try {
    const base = sourceUrl.replace(/\/+$/, '');
    // expected: https://github.com/org/repo/raw/branch/...
    const sp = (sourcePath || '').replace(/^\/+/, '').replace(/\/+$/, '');
    const rel = relativeSkillPath.replace(/^\/+/, '');
    const full = `${base}/raw/${branch}/${sp ? sp + '/' : ''}${rel}`.replace(/([^:]\/)\/+/g, '$1');
    const u = new URL(full);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    const allowed =
      host === 'github.com' ||
      host === 'raw.githubusercontent.com' ||
      host.endsWith('.githubusercontent.com');
    if (!allowed) return null;
    // no path escape via encoded dots etc. after URL parse
    if (u.pathname.includes('..')) return null;
    return u.toString();
  } catch {
    return null;
  }
}
