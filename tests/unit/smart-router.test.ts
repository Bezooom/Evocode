// Тесты для SmartRouter
import { SmartRouter, RouterContext } from '../../src/router/smart-router';
import { InferenceEngine } from '../../src/engine/inference';

describe('SmartRouter', () => {
  let router: SmartRouter;

  beforeEach(() => {
    router = new SmartRouter(new InferenceEngine());
  });

  it('маршрутизирует simple + малый контекст → local', async () => {
    const context: RouterContext = {
      request: { prompt: 'исправь ошибку' },
      contextSize: 50,
      taskComplexity: 'simple',
      isCodeGeneration: false,
      hasAttachments: false,
    };
    const { decision } = await router.route(context);
    expect(decision).toBe('local');
  });

  it('маршрутизирует complex → cloud', async () => {
    const context: RouterContext = {
      request: { prompt: 'спроектируй архитектуру' },
      contextSize: 1000,
      taskComplexity: 'complex',
      isCodeGeneration: false,
      hasAttachments: false,
    };
    const { decision } = await router.route(context);
    expect(decision).toBe('cloud');
  });

  it('маршрутизирует вложения → cloud', async () => {
    const context: RouterContext = {
      request: { prompt: 'проанализируй файл' },
      contextSize: 200,
      taskComplexity: 'medium',
      isCodeGeneration: false,
      hasAttachments: true,
    };
    const { decision } = await router.route(context);
    expect(decision).toBe('cloud');
  });

  it('анализирует simple-задачу', () => {
    const context = router.analyzeTask({ prompt: 'напиши функцию' });
    expect(context.taskComplexity).toBe('simple');
    expect(context.contextSize).toBeGreaterThan(0);
  });

  it('оценивает contextSize в токенах, не ms', () => {
    const long = 'x'.repeat(4000); // ~1000 tokens
    const context = router.analyzeTask({ prompt: long });
    expect(context.contextSize).toBeGreaterThanOrEqual(900);
    expect(context.contextSize).toBeLessThan(1200);
  });
});
