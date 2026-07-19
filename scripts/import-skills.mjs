#!/usr/bin/env node
/**
 * Скрипт автоматического импорта 247+ готовых навыков в Evocode Core.
 * Сканирует исходные каталоги Skills и копирует папки навыков в skills/system/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DST_DIR = path.join(ROOT, 'skills/system');

const SRC_DIRS = [
  '/home/bezoom/storage/Projects/Skills/Agent-skills-setup-for-AntiGravity-main/tests/manual-repair-test/.agent/skills',
  '/home/bezoom/storage/Projects/Skills/backup-kilo-20260704-173843/skills'
];

function copyFolderSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

function importSkills() {
  console.log('=== Эвокод: Импорт готовых профессиональных навыков ===');
  console.log(`Целевой каталог: ${DST_DIR}`);

  if (!fs.existsSync(DST_DIR)) {
    fs.mkdirSync(DST_DIR, { recursive: true });
  }

  let importedCount = 0;
  let skippedCount = 0;
  const processedNames = new Set();

  for (const src of SRC_DIRS) {
    if (!fs.existsSync(src)) {
      console.warn(`⚠️ Исходный каталог не найден: ${src}`);
      continue;
    }

    console.log(`Сканирование: ${src}...`);
    const items = fs.readdirSync(src);

    for (const item of items) {
      const itemPath = path.join(src, item);
      const stat = fs.lstatSync(itemPath);

      if (!stat.isDirectory()) continue;
      if (item === '.' || item === '..' || item === '.git' || item === 'uncategorized-skills') continue;

      // Проверяем наличие SKILL.md (в любом регистре)
      const files = fs.readdirSync(itemPath);
      const hasSkillDoc = files.some(f => f.toLowerCase() === 'skill.md');
      if (!hasSkillDoc) {
        // Проверяем sub-skills или рекурсивные папки в backup-kilo
        if (item === 'designer-skills-navigator' || item === 'aztp-skills' || item === 'incident-commander') {
          // Это мета-папки, сканируем их глубже
          const subItems = fs.readdirSync(itemPath);
          for (const sub of subItems) {
            const subPath = path.join(itemPath, sub);
            if (fs.existsSync(subPath) && fs.lstatSync(subPath).isDirectory()) {
              const subFiles = fs.readdirSync(subPath);
              if (subFiles.some(f => f.toLowerCase() === 'skill.md')) {
                copySkill(sub, subPath);
              }
            }
          }
        }
        continue;
      }

      copySkill(item, itemPath);
    }
  }

  function copySkill(name, srcPath) {
    if (processedNames.has(name)) return;
    processedNames.add(name);

    const targetPath = path.join(DST_DIR, name);
    if (fs.existsSync(targetPath)) {
      // Исключаем перезапись уже существующих кастомных системных навыков
      skippedCount++;
      return;
    }

    try {
      copyFolderSync(srcPath, targetPath);
      importedCount++;
      if (importedCount % 50 === 0 || importedCount < 10) {
        console.log(`  [+] Импортирован навык: ${name}`);
      }
    } catch (err) {
      console.error(`  [-] Ошибка копирования ${name}:`, err.message);
    }
  }

  console.log('');
  console.log(`🎉 Импорт успешно завершен!`);
  console.log(`   Успешно скопировано: ${importedCount} навыков`);
  console.log(`   Пропущено (уже есть):  ${skippedCount} навыков`);
  console.log(`   Всего в системе:       ${fs.readdirSync(DST_DIR).length} навыков`);
}

importSkills();
