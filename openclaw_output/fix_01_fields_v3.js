#!/usr/bin/env node
/**
 * 补充 01_产品立项池 缺失的基础字段（使用相对路径的 @file.json）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_TOKEN = 'YLu7bUHjLa4rF3sOZR8cLbUGnlf';
const TABLE_ID = 'tbl2zGUOnrFoCHwE';
const WORK_DIR = '/root/.openclaw/workspace/projects/tmt-product-initiative-specialist/openclaw_output';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000, cwd: WORK_DIR });
    console.log(result);
    return JSON.parse(result);
  } catch (e) {
    console.error('Error:', e.stderr || e.message);
    return null;
  }
}

const fieldsToAdd = [
  { type: 'text', name: '立项ID' },
  { type: 'text', name: '品类机会描述' },
  { type: 'text', name: '关联竞品货号' },
  { type: 'text', name: '关联爆品货号' },
  { type: 'text', name: '关联未起量货号' },
  { type: 'text', name: '价格带' },
  { type: 'number', name: '预估成本' },
  { type: 'number', name: '预估售价' },
  { type: 'datetime', name: '日期' },
  { type: 'text', name: '备注' },
];

async function main() {
  // 获取已有字段
  const listResult = run(`lark-cli base +field-list --base-token ${BASE_TOKEN} --table-id ${TABLE_ID}`);
  const existingFields = (listResult && listResult.ok) ? (listResult.data.fields || []) : [];
  const existingFieldNames = new Set(existingFields.map(f => f.name));

  for (const field of fieldsToAdd) {
    if (existingFieldNames.has(field.name)) {
      console.log(`  Field "${field.name}" already exists, skipping.`);
      continue;
    }

    // 写入临时 JSON 文件到工作目录
    const tmpFile = path.join(WORK_DIR, `field_${field.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(field));
    
    const relativePath = path.relative(WORK_DIR, tmpFile);
    const cmd = `lark-cli base +field-create --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --json @${relativePath}`;
    console.log(`  Creating field: ${field.name}`);
    run(cmd);
    
    // 清理临时文件
    fs.unlinkSync(tmpFile);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
