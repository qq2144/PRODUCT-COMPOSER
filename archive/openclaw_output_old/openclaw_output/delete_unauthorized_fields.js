#!/usr/bin/env node
/**
 * 删除 01_产品立项池 中自作主张添加的 8 个字段
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

const fieldsToDelete = [
  '品类机会描述',
  '关联竞品货号',
  '关联爆品货号',
  '关联未起量货号',
  '预估成本',
  '预估售价',
  '日期',
  '备注',
];

async function main() {
  // 获取已有字段
  const listResult = run(`lark-cli base +field-list --base-token ${BASE_TOKEN} --table-id ${TABLE_ID}`);
  const existingFields = (listResult && listResult.ok) ? (listResult.data.fields || []) : [];
  const fieldMap = {};
  existingFields.forEach(f => {
    fieldMap[f.name] = f.id;
  });

  for (const fieldName of fieldsToDelete) {
    const fieldId = fieldMap[fieldName];
    if (!fieldId) {
      console.log(`  Field "${fieldName}" not found, skipping.`);
      continue;
    }

    const cmd = `lark-cli base +field-delete --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --field-id ${fieldId} --yes`;
    console.log(`  Deleting field: ${fieldName} (${fieldId})`);
    run(cmd);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
