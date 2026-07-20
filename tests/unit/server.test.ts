import { isAuthorized } from '../../src/index';

describe('Server Authentication (isAuthorized)', () => {
  it('должен разрешать локальные запросы без токена', () => {
    const ok = isAuthorized('127.0.0.1', {}, 'secret-token');
    expect(ok).toBe(true);
  });

  it('должен разрешать локальные запросы по IPv6 без токена', () => {
    const ok = isAuthorized('::1', {}, 'secret-token');
    expect(ok).toBe(true);
  });

  it('должен отклонять нелокальные запросы если токен не задан', () => {
    const ok = isAuthorized('192.168.1.100', {}, '');
    expect(ok).toBe(false);
  });

  it('должен отклонять нелокальные запросы без токена', () => {
    const ok = isAuthorized('192.168.1.100', {}, 'secret-token');
    expect(ok).toBe(false);
  });

  it('должен отклонять нелокальные запросы с неверным токеном', () => {
    const ok = isAuthorized('192.168.1.100', { authorization: 'Bearer wrong' }, 'secret-token');
    expect(ok).toBe(false);
  });

  it('должен разрешать нелокальные запросы с верным токеном', () => {
    const ok = isAuthorized('192.168.1.100', { authorization: 'Bearer secret-token' }, 'secret-token');
    expect(ok).toBe(true);
  });
});
