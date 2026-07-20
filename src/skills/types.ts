/** Канонические типы Skill Router v2 (EVOCODE-RFC-SKILL-ROUTER-V2) */

export type SkillTier = 'core' | 'optional' | 'lab' | 'banned';
export type SkillSource = 'system' | 'user';
export type InjectMode = 'core_only' | 'core_plus_toc' | 'summary_only';
export type ProductMode = 'dev' | 'operator' | 'auto';

export interface SkillSubskillRef {
  path: string;
  title?: string;
  triggers?: string[];
}

export interface SkillRecord {
  name: string;
  path: string;
  source: SkillSource;
  version?: string;
  description: string;
  /** Full file content (for payload build) */
  content: string;
  /** Body without frontmatter */
  body: string;
  triggers: string[];
  tier: SkillTier;
  domain: string;
  pack: string;
  lang: string[];
  mutex: string[];
  priority: number;
  maxInjectChars: number;
  injectMode: InjectMode;
  persona: boolean;
  risk: 'low' | 'medium' | 'high' | 'offensive';
  subskills: SkillSubskillRef[];
  /** Content size in chars */
  chars: number;
}

export interface SkillIndexFile {
  version: 2;
  builtAt: string;
  count: number;
  skills: Array<Omit<SkillRecord, 'content' | 'body'> & { contentHash?: string }>;
}

export interface RouteRequest {
  query: string;
  mode?: ProductMode;
  explicitSkills?: string[];
  allowLab?: boolean;
  maxSkills?: number;
  maxInjectChars?: number;
  minScore?: number;
  /** Optional query embedding for hybrid rank (M4) */
  queryEmbedding?: number[];
  /** Force embed search even if useEmbeddings false (tests) */
  useEmbeddings?: boolean;
}

export interface ScoredSkill {
  skill: SkillRecord;
  score: number;
  reasons: string[];
}

export interface RouteResult {
  selected: ScoredSkill[];
  rejected: Array<{ name: string; score: number; reason: string }>;
  injectChars: number;
  text: string;
  routerVersion: 'v1' | 'v2';
}
