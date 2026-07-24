import {
  buildModelStack,
  recommendForHardware,
  type GpuInfo,
} from '../../src/core/hardware';
import { pickForTier, getCatalogModel, listCatalog } from '../../src/core/model-catalog';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// classifyTier is not directly exported with name for deep check — use recommend + stack

describe('hardware recommendations', () => {
  it('beast-class GPU suggests large chat + dual CPU secondaries', () => {
    const gpus: GpuInfo[] = [{ index: 0, name: 'RTX 3090', vramMb: 24576 }];
    const rec = recommendForHardware({
      logicalCores: 36,
      totalMb: 64 * 1024,
      gpus,
    });
    expect(rec.secondaryOnCpu).toBe(true);
    expect(rec.cpuThreads).toBeGreaterThanOrEqual(8);
    expect(rec.cpuThreads).toBeLessThanOrEqual(16);
    expect(rec.chatCtxHint).toBeGreaterThanOrEqual(32768);
    expect(rec.suggestedProfiles.length).toBeGreaterThan(0);
  });

  it('minimal with no GPU stays small / cloud-oriented', () => {
    const rec = recommendForHardware({
      logicalCores: 4,
      totalMb: 8 * 1024,
      gpus: [],
    });
    expect(rec.chatClass.toLowerCase()).toMatch(/cpu|cloud|small|1–3/);
    expect(rec.secondaryOnCpu).toBe(true);
  });

  it('buildModelStack picks catalog models and missing list', () => {
    const modelsDir = path.join(os.tmpdir(), 'evocode-hw-test-models');
    fs.mkdirSync(modelsDir, { recursive: true });
    const stack = buildModelStack({
      tier: 'beast',
      logicalCores: 32,
      totalMb: 64 * 1024,
      gpus: [{ index: 0, name: 'RTX 3090', vramMb: 24576 }],
      modelsDir,
    });
    expect(stack.tier).toBe('beast');
    expect(stack.chat.catalogId).toBeTruthy();
    expect(stack.fim.catalogId).toBeTruthy();
    expect(stack.embed.catalogId).toBeTruthy();
    // nothing on disk in tmp → all missing
    expect(stack.missing.length).toBeGreaterThanOrEqual(1);
    expect(stack.totalDownloadGb).toBeGreaterThan(0);
  });
});

describe('model catalog', () => {
  it('has chat/fim/embed entries with URLs', () => {
    const all = listCatalog();
    expect(all.some((m) => m.role === 'chat')).toBe(true);
    expect(all.some((m) => m.role === 'fim')).toBe(true);
    expect(all.some((m) => m.role === 'embed')).toBe(true);
    for (const m of all) {
      expect(m.url.startsWith('https://')).toBe(true);
      expect(m.filename.endsWith('.gguf')).toBe(true);
    }
  });

  it('pickForTier respects VRAM for chat', () => {
    const small = pickForTier('chat', 'minimal', 0, 8 * 1024);
    expect(small?.minVramMb).toBe(0);
    const beast = pickForTier('chat', 'beast', 24576, 64 * 1024);
    expect(beast).toBeTruthy();
    expect((beast?.minVramMb || 0)).toBeGreaterThanOrEqual(0);
    if (beast) {
      expect(getCatalogModel(beast.id)?.id).toBe(beast.id);
    }
  });
});
