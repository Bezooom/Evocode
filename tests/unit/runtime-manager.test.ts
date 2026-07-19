import * as path from 'path';
import { RuntimeManager } from '../../src/engine/runtime-manager';

describe('RuntimeManager', () => {
  const mgr = new RuntimeManager();

  it('listProfileIds возвращает профили из config/profiles.json', () => {
    const ids = mgr.listProfileIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain('coder');
    expect(ids).toContain('embed-nomic');
  });

  it('getProfile(coder) — ik binary и порт 8080', () => {
    const p = mgr.getProfile('coder');
    expect(p).not.toBeNull();
    expect(p!.port).toBe(8080);
    expect(p!.role).toBe('chat');
    expect(p!.binary).toContain('ik_llama');
    expect(p!.model).toMatch(/\.gguf$/);
  });

  it('getStatus — структура на русском message', async () => {
    const st = await mgr.getStatus(false);
    expect(st.core).toBe('ok');
    expect(Array.isArray(st.profiles)).toBe(true);
    expect(st.profiles.some((p) => p.id === 'coder')).toBe(true);
    const coder = st.profiles.find((p) => p.id === 'coder')!;
    expect(coder.label).toMatch(/Чат|Coder|ik/i);
    expect(coder.fork).toBe('ik_llama');
    expect(typeof coder.online).toBe('boolean');
    expect(coder.ready).toHaveProperty('binary');
    expect(coder.ready).toHaveProperty('model');
    expect(st.message).toMatch(/Локальная|модель/i);
  });

  it('start неизвестного профиля — ошибка', async () => {
    await expect(mgr.start('no-such-profile-xyz')).rejects.toThrow(/Неизвестный/);
  });

  it('embed-nomic fork buun', () => {
    const p = mgr.getProfile('embed-nomic');
    expect(p!.binary).toContain('buun');
  });
});
