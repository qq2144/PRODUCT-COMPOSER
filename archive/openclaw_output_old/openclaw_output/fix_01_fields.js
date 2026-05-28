#!/usr/bin/env node
/**
 * 补充 01_产品立项池 缺失的基础字段
 */

const { execSync } = require('child_process');

const BASE_TOKEN = 'YLu7bUHjLa4rF3sOZR8cLbUGnlf';
const TABLE_ID = 'tbl2zGUOnrFoCHwE';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    console.log(result);
    return JSON.parse(result);
  } catch (e) {
    console.error('Error:', e.stderr || e.message);
    return null;
  }
}

const fieldsToAdd = [
  { name: '立项ID', type: 'text' },
  { name: '品类机会描述', type: 'text' },
  { name: '关联竞品货号', type: 'text' },
  { name: '关联爆品货号', type: 'text' },
  { name: '关联未起量货号', type: 'text' },
  { name: '价格带', type: 'text' },
  { name: '预估成本', type: 'number' },
  { name: '预估售价', type: 'number' },
  { name: '日期', type: 'datetime' },
  { name: '备注', type: 'text' },
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

    const payload = { type: field.type, name: field.name };
    const payloadJson = JSON.stringify(payload).replace(/"/g, '\"');
    const cmd = `lark-cli base +field-create --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --json "${payloadJson}"`;
    console.log(`  Creating field: ${field.name}`);
    run(cmd);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
