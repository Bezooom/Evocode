import { ensureRoleAlternation } from '../../src/index';

describe('ensureRoleAlternation', () => {
  it('должен оставлять корректную историю сообщений без изменений', () => {
    const input = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'user', content: 'how are you' },
    ];
    const output = ensureRoleAlternation(input);
    expect(output).toEqual(input);
  });

  it('должен гарантировать, что первое сообщение после system имеет роль user', () => {
    const input = [
      { role: 'system', content: 'sys' },
      { role: 'assistant', content: 'first assistant' },
      { role: 'user', content: 'second user' },
      { role: 'assistant', content: 'third assistant' },
      { role: 'user', content: 'fourth user' },
    ];
    const output = ensureRoleAlternation(input);
    expect(output[0].role).toBe('system');
    expect(output[1].role).toBe('user');
    expect(output[1].content).toBe('second user');
  });

  it('должен устранять повторяющиеся последовательные роли, сохраняя последнее сообщение', () => {
    const input = [
      { role: 'user', content: 'first user' },
      { role: 'user', content: 'second user (duplicate)' },
      { role: 'assistant', content: 'assistant answer' },
      { role: 'user', content: 'third user' },
    ];
    const output = ensureRoleAlternation(input);
    expect(output).toEqual([
      { role: 'user', content: 'second user (duplicate)' },
      { role: 'assistant', content: 'assistant answer' },
      { role: 'user', content: 'third user' },
    ]);
  });

  it('должен сохранять системные сообщения и возвращать пустой список (или только system) если не-system сообщений нет', () => {
    const input = [{ role: 'system', content: 'sys' }];
    const output = ensureRoleAlternation(input);
    expect(output).toEqual(input);
  });
});
