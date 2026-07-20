#!/usr/bin/env node
/** Warm skill embedding index (M4). Requires npm run build first if using dist. */
const path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);

async function main() {
  // Prefer dist, fallback ts-node not available — require dist
  const { skillLoader } = require('../dist/skills/skill-loader');
  const { defaultConfig } = require('../dist/core/config');
  const { hashEmbed } = require('../dist/skills/skill-embeddings');

  skillLoader.applyConfig(defaultConfig);
  const force = process.argv.includes('--force');
  console.log(
    `M4 reindex embeddings backend=${defaultConfig.skills.embedBackend} force=${force}`
  );
  const r = await skillLoader.reindexAll({ forceEmbed: force, embedFn: hashEmbed });
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
