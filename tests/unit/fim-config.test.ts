import { defaultConfig } from '../../src/core/config';
import { resolveFimProfile } from '../../src/core/profiles';
import { InferenceEngine } from '../../src/engine/inference';

describe('FIM dual-model config', () => {
  it('FIM enabled by default; model path from env/profiles only (no hard-coded home)', () => {
    expect(defaultConfig.inference.fim.enabled).toBe(true);
    expect(defaultConfig.inference.fim.port).toBe(8082);
    expect(defaultConfig.inference.fim.modelId).toBe('evocode-fim');
    // empty default — set LLAMA_FIM_MODEL or profiles.json
    expect(defaultConfig.inference.fim.model).not.toContain('/home/bezoom');
    expect(defaultConfig.inference.fim.profileId).toBe('fim-small');
  });

  it('resolveFimProfile points to fim-small with CPU ngl 0', () => {
    const p = resolveFimProfile();
    expect(p).not.toBeNull();
    expect(p!.port).toBe(8082);
    expect(p!.model).toContain('fim-small');
    expect(p!.model.endsWith('.gguf')).toBe(true);
    expect(p!.role).toBe('fim');
    expect(p!.args?.some((a) => a === '-ngl' || a === '0' || String(a).includes('ngl'))).toBe(true);
    // ensure -ngl 0 pair
    const args = p!.args || [];
    const i = args.indexOf('-ngl');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(String(args[i + 1])).toBe('0');
  });

  it('InferenceEngine exposes fim info', () => {
    const eng = new InferenceEngine();
    expect(eng.isFimEnabled()).toBe(true);
    const info = eng.getFimInfo();
    expect(info.modelId).toBe('evocode-fim');
    expect(info.port).toBe(8082);
  });
});
