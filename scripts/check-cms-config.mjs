// ─────────────────────────────────────────────────────────────
//  ПРОВЕРКА НАСТРОЕК РЕДАКТОРА
//
//  Запускается автоматически перед каждой сборкой.
//
//  Зачем: файл public/admin/config.yml — обычная статическая
//  страница, сборка его не читает. Опечатка в нём не ломает сайт,
//  но ломает редактор, и узнаётся об этом только когда кто-то
//  попытается открыть панель. Эта проверка ловит такое заранее.
//
//  Что проверяем:
//    1) файл вообще разбирается;
//    2) все указанные в нём файлы с текстами существуют;
//    3) папки разделов на месте и не пустые.
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const CONFIG = 'public/admin/config.yml';
const problems = [];

let config;
try {
  config = parse(readFileSync(CONFIG, 'utf8'));
} catch (error) {
  console.error(`\n✗ Настройки редактора не читаются: ${CONFIG}\n`);
  console.error(`  ${error.message}\n`);
  console.error('  Частая причина — двоеточие внутри подсказки или подписи.');
  console.error("  Такую строку нужно взять в кавычки: hint: 'текст: ещё текст'\n");
  process.exit(1);
}

const locales = config.i18n?.locales ?? ['ru'];
let checked = 0;

for (const collection of config.collections ?? []) {
  const collectionLocales = collection.i18n === false ? [locales[0]] : locales;

  // Одиночные страницы
  for (const file of collection.files ?? []) {
    for (const locale of collectionLocales) {
      const path = file.file.replace('{{locale}}', locale);
      checked += 1;
      if (!existsSync(path)) {
        problems.push(`нет файла ${path} (раздел «${collection.label}» → «${file.label}»)`);
      }
    }
  }

  // Разделы-папки
  if (collection.folder) {
    for (const locale of collectionLocales) {
      const dir = `${collection.folder}/${locale}`;
      checked += 1;
      if (!existsSync(dir)) {
        problems.push(`нет папки ${dir} (раздел «${collection.label}»)`);
      } else if (readdirSync(dir).length === 0) {
        problems.push(`папка ${dir} пуста (раздел «${collection.label}»)`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`\n✗ Настройки редактора ссылаются на то, чего нет:\n`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ Настройки редактора в порядке: проверено путей — ${checked}`);
