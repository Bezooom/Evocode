import { expandPath } from '../../src/core/profiles';
import * as os from 'os';
import * as path from 'path';

describe('expandPath', () => {
  const home = process.env.HOME || os.homedir();

  it('expands $HOME and ${HOME}', () => {
    expect(expandPath('$HOME/llama.cpp/models')).toBe(path.join(home, 'llama.cpp/models'));
    expect(expandPath('${HOME}/ik_llama.cpp')).toBe(path.join(home, 'ik_llama.cpp'));
  });

  it('expands ~/', () => {
    expect(expandPath('~/models/x.gguf')).toBe(path.join(home, 'models/x.gguf'));
  });

  it('leaves absolute paths without home tokens', () => {
    expect(expandPath('/usr/bin/llama-server')).toBe('/usr/bin/llama-server');
  });
});
