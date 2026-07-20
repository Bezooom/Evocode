// Тесты для SkillSyncEngine
import { SkillSyncEngine } from '../../src/sync/skill-sync';
import * as https from 'https';
import { EventEmitter } from 'events';

jest.mock('https', () => ({
  get: jest.fn(),
}));

describe('SkillSyncEngine', () => {
  let engine: SkillSyncEngine;

  beforeEach(() => {
    engine = new SkillSyncEngine();
    jest.clearAllMocks();
  });

  it('должен запускать синхронизацию', async () => {
    const getMock = https.get as jest.Mock;

    getMock.mockImplementation((url, callback) => {
      const response = new EventEmitter() as any;
      response.statusCode = 200;
      response.resume = jest.fn();

      setTimeout(() => {
        if (String(url).includes('MANIFEST.json')) {
          response.emit(
            'data',
            JSON.stringify({
              lastUpdated: new Date().toISOString(),
              skills: [
                {
                  name: 'test-skill',
                  path: 'test-skill/SKILL.md',
                  version: '1.0.0',
                  sha: '59f9f3bafd28fbbe7efc24a3d76d02cdeb5a3b70d050d751e8aad49bf3449f18',
                },
              ],
            })
          );
        } else {
          response.emit('data', '# Test Skill Content');
        }
        response.emit('end');
      }, 10);

      callback(response);
      return { on: jest.fn() };
    });

    const result = await engine.sync();
    expect(result).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('должен возвращать лог', () => {
    expect(Array.isArray(engine.getLog())).toBe(true);
  });

  it('должен очищать лог', () => {
    engine.clearLog();
    expect(engine.getLog().length).toBe(0);
  });
});
