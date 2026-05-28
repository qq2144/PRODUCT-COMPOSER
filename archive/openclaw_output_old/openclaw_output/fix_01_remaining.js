#!/usr/bin/env node
/**
 * 补充 01_产品立项池 剩余字段
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
  { type: 'text', name: '立项名称' },
  { type: 'text', name: '品类' },
  { type: 'text', name: '目标用户' },
  { type: 'text', name: '使用场景' },
  { type: 'text', name: '当前销售表现' },
  { type: 'text', name: '已知问题' },
  { type: 'text', name: '供应链资源' },
  { type: 'number', name: '立项前模块复用率' },
  { type: 'number', name: '立项总分' },
  { type: 'text', name: '最大机会' },
  { type: 'text', name: '最大风险' },
  { type: 'text', name: '人工确认点' },
  { type: 'user', name: '提交人' },
  { type: 'user', name: '产品负责人' },
  { type: 'user', name: '代理决策人' },
  { type: 'text', name: 'Agent版本' },
];

async function main() {
  const listResult = run(`lark-cli base +field-list --base-token ${BASE_TOKEN} --table-id ${TABLE_ID}`);
  const existingFields = (listResult && listResult.ok) ? (listResult.data.fields || []) : [];
  const existingFieldNames = new Set(existingFields.map(f => f.name));

  for (const field of fieldsToAdd) {
    if (existingFieldNames.has(field.name)) {
      console.log(`  Field "${field.name}" already exists, skipping.`);
      continue;
    }

    const tmpFile = path.join(WORK_DIR, `field_${field.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(field));
    
    const relativePath = path.relative(WORK_DIR, tmpFile);
    const cmd = `lark-cli base +field-create --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --json @${relativePath}`;
    console.log(`  Creating field: ${field.name}`);
    run(cmd);
    
    fs.unlinkSync(tmpFile);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
