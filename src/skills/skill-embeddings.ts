/**
 * Skill embeddings store (M4) — hybrid ranking support.
 * Default backend: deterministic hashEmbed (offline, no GPU).
 * Optional: inferenceEngine embeddings when available.
 */
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SkillRecord } from './types';

export const SKILL_EMBED_DIM = 384;

/** Document text used for embedding a skill. */
export function skillEmbedText(skill: Pick<SkillRecord, 'name' | 'description' | 'triggers' | 'domain' | 'pack'>): string {
  return [
    skill.name.replace(/-/g, ' '),
    skill.description || '',
    (skill.triggers || []).slice(0, 24).join(' '),
    skill.domain || '',
    skill.pack || '',
  ]
    .join('\n')
    .slice(0, 2000);
}

/**
 * Deterministic bag-of-tokens hash embedding → dim floats, L2-normalized.
 * Similar tokens → similar vectors (good enough hybrid without nomic).
 */
export function hashEmbed(text: string, dim: number = SKILL_EMBED_DIM): number[] {
  const vec = new Float64Array(dim);
  const tokens = text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);

  if (!tokens.length) {
    vec[0] = 1;
    return Array.from(vec);
  }

  for (const tok of tokens) {
    // multiple hashes per token for smoother space
    for (let salt = 0; salt < 3; salt++) {
      const h = crypto.createHash('sha256').update(`${salt}:${tok}`).digest();
      const idx = h.readUInt32BE(0) % dim;
      const sign = h[4] & 1 ? 1 : -1;
      const mag = 1 + (h[5] / 255) * 0.5;
      vec[idx] += sign * mag;
      // bigrams-ish: second bucket
      const idx2 = h.readUInt32BE(8) % dim;
      vec[idx2] += sign * 0.35;
    }
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(dim);
  for (let i = 0; i < dim; i++) out[i] = vec[i] / norm;
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  if (!d) return 0;
  return Math.max(-1, Math.min(1, dot / d));
}

export type EmbedFn = (text: string) => Promise<number[]> | number[];

export interface SkillEmbedHit {
  name: string;
  score: number; // cosine 0..1 (clamped)
  distance?: number;
}

export class SkillEmbeddingStore {
  private db: Database.Database;
  private dim: number;
  private ready = false;

  constructor(dbPath: string = '.evocode/skills-embeddings.db', dim: number = SKILL_EMBED_DIM) {
    const dir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.db = new Database(dbPath);
    sqliteVec.load(this.db);
    this.dim = dim;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skill_meta (
        name TEXT PRIMARY KEY,
        content_hash TEXT NOT NULL,
        text_preview TEXT,
        dim INTEGER NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_skills USING vec0(
        name TEXT PRIMARY KEY,
        embedding float[${this.dim}]
      );
    `);
    this.ready = true;
  }

  count(): number {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as c FROM skill_meta').get() as { c: number };
      return row?.c || 0;
    } catch {
      return 0;
    }
  }

  /** Sync embeddings for all skills; returns stats */
  async sync(
    skills: SkillRecord[],
    embedFn: EmbedFn = hashEmbed,
    opts?: { force?: boolean }
  ): Promise<{ upserted: number; skipped: number; errors: number }> {
    let upserted = 0;
    let skipped = 0;
    let errors = 0;

    const getHash = this.db.prepare('SELECT content_hash FROM skill_meta WHERE name = ?');
    const upsertMeta = this.db.prepare(
      `INSERT INTO skill_meta (name, content_hash, text_preview, dim) VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET content_hash=excluded.content_hash, text_preview=excluded.text_preview, dim=excluded.dim`
    );
    const delVec = this.db.prepare('DELETE FROM vec_skills WHERE name = ?');
    const insVec = this.db.prepare('INSERT INTO vec_skills (name, embedding) VALUES (?, ?)');

    for (const skill of skills) {
      try {
        const text = skillEmbedText(skill);
        const contentHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
        if (!opts?.force) {
          const prev = getHash.get(skill.name) as { content_hash: string } | undefined;
          if (prev?.content_hash === contentHash) {
            skipped++;
            continue;
          }
        }
        let emb = await Promise.resolve(embedFn(text));
        if (!Array.isArray(emb) || emb.length === 0) {
          emb = hashEmbed(text, this.dim);
        }
        // adapt dim mismatch
        if (emb.length !== this.dim) {
          emb = resizeEmbed(emb, this.dim);
        }
        const buffer = Buffer.from(new Float32Array(emb).buffer);
        const tx = this.db.transaction(() => {
          delVec.run(skill.name);
          insVec.run(skill.name, buffer);
          upsertMeta.run(skill.name, contentHash, text.slice(0, 200), this.dim);
        });
        tx();
        upserted++;
      } catch {
        errors++;
      }
    }

    // drop vectors for skills no longer present
    const names = new Set(skills.map((s) => s.name));
    const existing = this.db.prepare('SELECT name FROM skill_meta').all() as { name: string }[];
    const delMeta = this.db.prepare('DELETE FROM skill_meta WHERE name = ?');
    for (const row of existing) {
      if (!names.has(row.name)) {
        delVec.run(row.name);
        delMeta.run(row.name);
      }
    }

    return { upserted, skipped, errors };
  }

  /**
   * Top-k similar skills by cosine (via sqlite-vec distance).
   * vec0 distance is L2; we convert roughly to similarity for ranking.
   */
  search(queryEmbedding: number[], limit: number = 30): SkillEmbedHit[] {
    if (!queryEmbedding?.length || !this.ready) return [];
    let emb = queryEmbedding;
    if (emb.length !== this.dim) emb = resizeEmbed(emb, this.dim);
    if (emb.every((x) => x === 0)) return [];

    const buffer = Buffer.from(new Float32Array(emb).buffer);
    try {
      const rows = this.db
        .prepare(
          `SELECT name, distance FROM vec_skills
           WHERE embedding MATCH ? AND k = ?
           ORDER BY distance ASC`
        )
        .all(buffer, limit) as { name: string; distance: number }[];

      return rows.map((r) => {
        // L2 distance on unit vectors: d^2 ≈ 2(1-cos) → cos ≈ 1 - d^2/2
        const d = Number(r.distance) || 0;
        const cos = Math.max(0, Math.min(1, 1 - (d * d) / 2));
        return { name: r.name, score: cos, distance: d };
      });
    } catch {
      // fallback: brute force from meta (if vec fails)
      return this.bruteSearch(emb, limit);
    }
  }

  private bruteSearch(query: number[], limit: number): SkillEmbedHit[] {
    // Without stored raw vectors easily — return empty
    void query;
    void limit;
    return [];
  }

  close() {
    this.db.close();
  }
}

function resizeEmbed(emb: number[], dim: number): number[] {
  const out = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    out[i] = emb[i % emb.length] || 0;
  }
  let norm = 0;
  for (const v of out) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return out.map((v) => v / norm);
}

let defaultStore: SkillEmbeddingStore | null = null;

export function getSkillEmbeddingStore(dbPath?: string): SkillEmbeddingStore {
  if (!defaultStore) {
    defaultStore = new SkillEmbeddingStore(dbPath || '.evocode/skills-embeddings.db');
  }
  return defaultStore;
}

export function resetSkillEmbeddingStore(): void {
  if (defaultStore) {
    try {
      defaultStore.close();
    } catch {
      /* */
    }
    defaultStore = null;
  }
}
