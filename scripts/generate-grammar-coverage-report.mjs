import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coverage = JSON.parse(await fs.readFile(path.join(root, 'grammar-library/data/source-coverage.json'), 'utf8'));
const topics = JSON.parse(await fs.readFile(path.join(root, 'grammar-library/data/topics.json'), 'utf8'));
const titles = new Map(topics.map(item => [item.topicKey, item.titleZh]));
const counts = Object.fromEntries(['D1', 'D2', 'D3'].map(key => [key, coverage.filter(item => item.sourceCatalog === key).length]));
const lines = [
  '# 英语语法知识点来源覆盖矩阵',
  '',
  '本报告由 `scripts/generate-grammar-coverage-report.mjs` 从结构化数据生成。运行时权威数据为 `grammar-library/data/source-coverage.json`。',
  '',
  `- D1：${counts.D1} / 59`,
  `- D2：${counts.D2} / 65`,
  `- D3：${counts.D3} / 29`,
  `- 合计：${coverage.length}`,
  '',
  '| 来源编号 | 原知识点 | 目标 topic_key | 站内标题 | 处理方式 | 说明 |',
  '|---|---|---|---|---|---|',
  ...coverage.map(item => `| ${cell(item.sourceItemKey)} | ${cell(item.sourceTitle)} | \`${cell(item.topicKey)}\` | ${cell(titles.get(item.topicKey))} | ${cell(item.coverageMode)} | ${cell(item.notes)} |`),
  ''
];
await fs.mkdir(path.join(root, 'docs'), { recursive: true });
await fs.writeFile(path.join(root, 'docs/grammar-source-coverage.md'), lines.join('\n'), 'utf8');

function cell(value) {
  return String(value == null ? '' : value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}
