import * as fs from 'fs';
import * as path from 'path';
import { dlpGuard } from '../guard/dlp-guard';

export interface DatasetItem {
  timestamp: string;
  prompt: string;
  response: string;
  model?: string;
  purpose?: string;
  qualityScore?: number;
}

export class DatasetCollector {
  private baseDir: string;
  private datasetPath: string;

  constructor(customPath?: string) {
    this.baseDir = customPath || path.join(process.cwd(), '.evocode', 'learning', 'dataset');
    this.datasetPath = path.join(this.baseDir, 'train_pairs.jsonl');
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {
      /* ignore directory creation errors */
    }
  }

  public async recordInteraction(prompt: string, response: string, model?: string, purpose?: string): Promise<boolean> {
    if (!prompt || !response || prompt.length < 5 || response.length < 5) {
      return false;
    }

    try {
      // DLP Sanitization: ensure no secrets are included in dataset
      const cleanPrompt = (await dlpGuard.mask(prompt)).masked;
      const cleanResponse = (await dlpGuard.mask(response)).masked;

      const item: DatasetItem = {
        timestamp: new Date().toISOString(),
        prompt: cleanPrompt,
        response: cleanResponse,
        model: model || 'evocode-local',
        purpose: purpose || 'chat',
        qualityScore: 1.0,
      };

      const line = JSON.stringify(item) + '\n';
      this.ensureDir();
      fs.appendFileSync(this.datasetPath, line, 'utf-8');
      return true;
    } catch (e) {
      console.warn(`[DatasetCollector] Failed to record interaction: ${(e as Error).message}`);
      return false;
    }
  }

  public getStats(): { count: number; datasetPath: string; sizeBytes: number } {
    if (!fs.existsSync(this.datasetPath)) {
      return { count: 0, datasetPath: this.datasetPath, sizeBytes: 0 };
    }

    try {
      const stats = fs.statSync(this.datasetPath);
      const content = fs.readFileSync(this.datasetPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return {
        count: lines.length,
        datasetPath: this.datasetPath,
        sizeBytes: stats.size,
      };
    } catch {
      return { count: 0, datasetPath: this.datasetPath, sizeBytes: 0 };
    }
  }

  public getRecentItems(limit: number = 20): DatasetItem[] {
    if (!fs.existsSync(this.datasetPath)) return [];
    try {
      const content = fs.readFileSync(this.datasetPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const slice = lines.slice(-limit);
      return slice.map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

export const defaultDatasetCollector = new DatasetCollector();
