import {
  foldReasoningDelta,
  foldReasoningMessage,
  isAbortLikeError,
} from '../../src/engine/openai-normalize';
import { recommendForHardware } from '../../src/core/hardware';

describe('foldReasoning', () => {
  const prev = process.env.EVOCODE_FOLD_REASONING;
  afterEach(() => {
    if (prev === undefined) delete process.env.EVOCODE_FOLD_REASONING;
    else process.env.EVOCODE_FOLD_REASONING = prev;
  });

  it('promotes reasoning_content to content on delta', () => {
    process.env.EVOCODE_FOLD_REASONING = 'true';
    const d = foldReasoningDelta({ reasoning_content: 'think', content: null }) as any;
    expect(d.content).toBe('think');
  });

  it('does not overwrite real content', () => {
    process.env.EVOCODE_FOLD_REASONING = 'true';
    const d = foldReasoningDelta({ reasoning_content: 'think', content: 'OK' }) as any;
    expect(d.content).toBe('OK');
  });

  it('fills empty message content', () => {
    process.env.EVOCODE_FOLD_REASONING = 'true';
    const m = foldReasoningMessage({
      role: 'assistant',
      content: '',
      reasoning_content: 'full reasoning that was the only output',
    }) as any;
    expect(m.content).toContain('full reasoning');
  });

  it('detects abort-like errors', () => {
    expect(isAbortLikeError({ name: 'AbortError', message: 'The operation was aborted' })).toBe(
      true
    );
    expect(isAbortLikeError(new Error('boom'))).toBe(false);
  });
});

describe('hardware recommendations', () => {
  it('beast-class 24GB + 36 threads suggests dual CPU secondaries', () => {
    const r = recommendForHardware({
      logicalCores: 36,
      totalMb: 64000,
      gpus: [{ index: 0, name: 'RTX 3090', vramMb: 24576 }],
    });
    expect(r.secondaryOnCpu).toBe(true);
    expect(r.cpuThreads).toBeGreaterThanOrEqual(12);
    expect(r.cpuThreads).toBeLessThanOrEqual(16);
    expect(r.suggestedProfiles).toContain('fim-small');
    expect(r.chatClass).toMatch(/35B|30/);
  });
});
