/**
 * Streaming GGUF downloader with in-memory progress (user-consented only).
 */
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { URL } from 'url';
import { getCatalogModel, type CatalogModel } from '../core/model-catalog';
import { expandPath, loadProfiles, resolveModelsDir } from '../core/profiles';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadJob {
  id: string;
  catalogId: string;
  filename: string;
  url: string;
  destPath: string;
  status: DownloadStatus;
  bytesReceived: number;
  bytesTotal: number | null;
  percent: number | null;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

const jobs = new Map<string, DownloadJob>();
const controllers = new Map<string, { cancelled: boolean; req?: http.ClientRequest }>();

function jobId(catalogId: string): string {
  return `dl-${catalogId}`;
}

export function listDownloads(): DownloadJob[] {
  return Array.from(jobs.values()).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export function getDownload(catalogId: string): DownloadJob | undefined {
  return jobs.get(jobId(catalogId));
}

function followGet(
  urlStr: string,
  onRes: (res: http.IncomingMessage) => void,
  onErr: (e: Error) => void,
  redirects = 0,
): http.ClientRequest {
  if (redirects > 8) {
    onErr(new Error('too many redirects'));
    return https.get(urlStr); // dummy, already failed
  }
  const u = new URL(urlStr);
  const lib = u.protocol === 'http:' ? http : https;
  const req = lib.get(
    {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'http:' ? 80 : 443),
      path: u.pathname + u.search,
      headers: {
        'User-Agent': 'Evocode-Core/1.0 (model-downloader)',
        Accept: '*/*',
      },
      timeout: 120_000,
    },
    (res) => {
      const code = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(code) && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, urlStr).toString();
        followGet(next, onRes, onErr, redirects + 1);
        return;
      }
      onRes(res);
    },
  );
  req.on('error', onErr);
  req.on('timeout', () => {
    req.destroy();
    onErr(new Error('download timeout'));
  });
  return req;
}

export function startDownload(
  catalogId: string,
  opts?: { modelsDir?: string; force?: boolean },
): DownloadJob {
  const model = getCatalogModel(catalogId);
  if (!model) {
    throw Object.assign(new Error(`Unknown catalog model: ${catalogId}`), {
      statusCode: 404,
    });
  }
  const id = jobId(catalogId);
  const existing = jobs.get(id);
  if (existing && (existing.status === 'downloading' || existing.status === 'queued')) {
    return existing;
  }

  const modelsDir = expandPath(
    opts?.modelsDir || resolveModelsDir() || path.join(process.env.HOME || '', 'llama.cpp/models'),
  );
  fs.mkdirSync(modelsDir, { recursive: true });
  const destPath = path.join(modelsDir, model.filename);
  const partialPath = `${destPath}.partial`;

  if (fs.existsSync(destPath) && !opts?.force) {
    const job: DownloadJob = {
      id,
      catalogId,
      filename: model.filename,
      url: model.url,
      destPath,
      status: 'completed',
      bytesReceived: fs.statSync(destPath).size,
      bytesTotal: fs.statSync(destPath).size,
      percent: 100,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
    jobs.set(id, job);
    return job;
  }

  const job: DownloadJob = {
    id,
    catalogId,
    filename: model.filename,
    url: model.url,
    destPath,
    status: 'queued',
    bytesReceived: 0,
    bytesTotal: null,
    percent: null,
    startedAt: new Date().toISOString(),
  };
  jobs.set(id, job);
  const ctrl = { cancelled: false, req: undefined as http.ClientRequest | undefined };
  controllers.set(id, ctrl);

  // async start
  setImmediate(() => runDownload(model, job, partialPath, ctrl, opts?.force));
  return job;
}

function runDownload(
  model: CatalogModel,
  job: DownloadJob,
  partialPath: string,
  ctrl: { cancelled: boolean; req?: http.ClientRequest },
  force?: boolean,
): void {
  job.status = 'downloading';
  try {
    if (force && fs.existsSync(job.destPath)) fs.unlinkSync(job.destPath);
    if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);
  } catch {
    /* */
  }

  const out = fs.createWriteStream(partialPath);
  ctrl.req = followGet(
    model.url,
    (res) => {
      const code = res.statusCode || 0;
      if (code < 200 || code >= 300) {
        out.close();
        try {
          fs.unlinkSync(partialPath);
        } catch {
          /* */
        }
        job.status = 'failed';
        job.error = `HTTP ${code}`;
        job.finishedAt = new Date().toISOString();
        return;
      }
      const total = Number(res.headers['content-length'] || 0) || null;
      job.bytesTotal = total;
      res.on('data', (chunk: Buffer) => {
        if (ctrl.cancelled) {
          res.destroy();
          return;
        }
        job.bytesReceived += chunk.length;
        if (job.bytesTotal) {
          job.percent = Math.min(100, Math.round((job.bytesReceived / job.bytesTotal) * 1000) / 10);
        }
      });
      res.pipe(out);
      out.on('finish', () => {
        if (ctrl.cancelled) {
          try {
            fs.unlinkSync(partialPath);
          } catch {
            /* */
          }
          job.status = 'cancelled';
          job.finishedAt = new Date().toISOString();
          return;
        }
        try {
          fs.renameSync(partialPath, job.destPath);
          job.status = 'completed';
          job.percent = 100;
          job.finishedAt = new Date().toISOString();
        } catch (e) {
          job.status = 'failed';
          job.error = e instanceof Error ? e.message : String(e);
          job.finishedAt = new Date().toISOString();
        }
      });
      out.on('error', (e) => {
        job.status = 'failed';
        job.error = e.message;
        job.finishedAt = new Date().toISOString();
      });
    },
    (e) => {
      out.close();
      try {
        fs.unlinkSync(partialPath);
      } catch {
        /* */
      }
      if (ctrl.cancelled) {
        job.status = 'cancelled';
      } else {
        job.status = 'failed';
        job.error = e.message;
      }
      job.finishedAt = new Date().toISOString();
    },
  );
}

export function cancelDownload(catalogId: string): DownloadJob | null {
  const id = jobId(catalogId);
  const job = jobs.get(id);
  const ctrl = controllers.get(id);
  if (!job) return null;
  if (job.status !== 'downloading' && job.status !== 'queued') return job;
  if (ctrl) {
    ctrl.cancelled = true;
    try {
      ctrl.req?.destroy();
    } catch {
      /* */
    }
  }
  job.status = 'cancelled';
  job.finishedAt = new Date().toISOString();
  return job;
}

/** Reset in-memory jobs (tests). */
export function _resetDownloadsForTests(): void {
  jobs.clear();
  controllers.clear();
}
