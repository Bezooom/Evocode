// Типы для Эвокод — standalone сервер
// Скопировано из evocode-core/src/types.ts (без зависимости от vscode)

export interface SyncSource {
  name: string;
  url: string;
  path: string;
  branch: string;
}

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  repository: string;
  keywords: string[];
  triggers: string[];
  dependencies: string[];
  lastUpdated: string;
  skills: SkillInfo[];
}

export interface SkillInfo {
  name: string;
  version: string;
  path: string;
  description: string;
  author: string;
  repository: string;
  keywords: string[];
  triggers: string[];
  dependencies: string[];
}

export interface SkillFile {
  path: string;
  content: string;
  lastModified: Date;
}

export interface DLPConfig {
  enabled: boolean;
  rules: DLPRule[];
}

export interface DLPRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface RouterConfig {
  enabled: boolean;
  localThreshold: number;
  cloudThreshold: number;
}

export interface LocalInferenceConfig {
  enabled: boolean;
  model: string;
  nPredict: number;
  timeout: number;
  port: number;
  host: string;
}
