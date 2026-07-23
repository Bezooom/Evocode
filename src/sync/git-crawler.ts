import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export interface CrawledSkill {
  name: string;
  description: string;
  triggers: string[];
  sourceRepo: string;
  filePath: string;
  content: string;
  isCursorRule: boolean;
}

export interface CrawlRepoSource {
  owner: string;
  repo: string;
  branch?: string;
}

export const DEFAULT_CRAWLER_REPOS: CrawlRepoSource[] = [
  { owner: 'VoltAgent', repo: 'awesome-agent-skills', branch: 'main' },
  { owner: 'PatrickJS', repo: 'awesome-cursorrules', branch: 'main' },
  { owner: 'acedergren', repo: 'agentic-tools', branch: 'main' },
  { owner: 'addyosmani', repo: 'agent-skills', branch: 'main' },
];

export class GitSkillCrawler {
  private targetDir: string;

  constructor(customDir?: string) {
    this.targetDir = customDir || path.join(process.cwd(), '.evocode', 'skills', 'crawled');
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.targetDir)) {
        fs.mkdirSync(this.targetDir, { recursive: true });
      }
    } catch {
      /* ignore */
    }
  }

  public convertCursorRuleToSkill(filename: string, rawContent: string, repoName: string): CrawledSkill {
    const cleanName = path
      .basename(filename)
      .replace(/\.(cursorrules|mdc|md|txt)$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .toLowerCase();

    let description = `Imported Cursor rule from ${repoName}`;
    let triggers: string[] = [cleanName, cleanName.replace(/-/g, ' ')];

    // Extract frontmatter if present (YAML inside --- ... ---)
    const matchYaml = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let body = rawContent;

    if (matchYaml) {
      const frontmatter = matchYaml[1];
      body = rawContent.slice(matchYaml[0].length).trim();

      const descMatch = frontmatter.match(/description:\s*["']?([^"'\r\n]+)["']?/i);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      const globsMatch = frontmatter.match(/globs:\s*["']?([^"'\r\n]+)["']?/i);
      if (globsMatch) {
        triggers.push(...globsMatch[1].split(',').map((g) => g.trim()).filter(Boolean));
      }
    }

    const skillYaml = `---
name: ${cleanName}
description: ${description}
pack: crawled
triggers:
${triggers.map((t) => `  - ${t}`).join('\n')}
---

# ${cleanName}

${body}
`;

    return {
      name: cleanName,
      description,
      triggers,
      sourceRepo: repoName,
      filePath: filename,
      content: skillYaml,
      isCursorRule: true,
    };
  }

  public saveCrawledSkill(skill: CrawledSkill): string {
    this.ensureDir();
    const folderName = skill.sourceRepo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const skillDir = path.join(this.targetDir, folderName, skill.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }
    const skillPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillPath, skill.content, 'utf-8');
    return skillPath;
  }

  public async fetchRawFile(owner: string, repo: string, branch: string, filepath: string): Promise<string> {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;
    return new Promise((resolve, reject) => {
      https
        .get(rawUrl, (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode} fetching ${rawUrl}`));
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });
  }

  public getCrawledSkillsCount(): number {
    if (!fs.existsSync(this.targetDir)) return 0;
    try {
      let count = 0;
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.name === 'SKILL.md') {
            count++;
          }
        }
      };
      walk(this.targetDir);
      return count;
    } catch {
      return 0;
    }
  }
}

export const defaultGitSkillCrawler = new GitSkillCrawler();
