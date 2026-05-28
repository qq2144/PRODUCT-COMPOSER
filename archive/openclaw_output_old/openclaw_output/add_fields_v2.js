#!/usr/bin/env node
/**
 * 淘玛特立项专家 - 飞书多维表字段批量添加脚本
 * 修正版：使用 --json 而非 --fields
 */

const { execSync } = require('child_process');

const BASE_TOKEN = process.argv[2] || 'YLu7bUHjLa4rF3sOZR8cLbUGnlf';

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

// 表ID映射
tableIds = {
  '01_产品立项池': 'tbl2zGUOnrFoCHwE',
  '02_立项前模块预判表': 'tblvUWALNKnZp0Fm',
  '03_立项评分表': 'tbl1TFkdFCfMhcgF',
  '04_立项路径产出表': 'tblCX4Z6mDteoqmk',
  '05_立项任务分发表': 'tblp45AcaKD3mDw1',
  '06_立项复盘表': 'tbltxU2nX0sPnNLf',
  '07_模块库': 'tblddaVSDrKAYIlJ',
  '08_货品池': 'tblZVcyd0EPw8hDc',
};

// ============ 02_立项前模块预判表 ============
const fields02 = [
  { field_name: '预判ID', type: 'text' },
  { field_name: '立项ID', type: 'text' },
  { field_name: '模块维度', type: 'select', property: { options: [{ name: '版型模块' }, { name: '材料模块' }, { name: '结构模块' }, { name: '外观模块' }, { name: '功能模块' }, { name: '包装模块' }] } },
  { field_name: '预期模块', type: 'text' },
  { field_name: '匹配状态', type: 'select', property: { options: [{ name: '可复用' }, { name: '可改良' }, { name: '需新增' }, { name: '无效/禁用' }, { name: '需人工确认' }] } },
  { field_name: '匹配模块ID', type: 'text' },
  { field_name: '预估复用率', type: 'number' },
  { field_name: '对立项影响', type: 'select', property: { options: [{ name: '降低开发难度' }, { name: '支撑快速升级' }, { name: '构成核心差异' }, { name: '增加风险' }, { name: '不影响' }, { name: '需人工确认' }] } },
  { field_name: '缺失信息', type: 'text' },
  { field_name: '模块负责人', type: 'user' },
  { field_name: '下一步动作', type: 'text' },
];

// ============ 03_立项评分表 ============
const fields03 = [
  { field_name: '评分ID', type: 'text' },
  { field_name: '立项ID', type: 'text' },
  { field_name: '评分维度', type: 'select', property: { options: [{ name: '市场需求' }, { name: '竞品验证' }, { name: '品牌承载力' }, { name: '差异化空间' }, { name: '供应链可行性' }, { name: '内容表达性' }, { name: '模块复用价值' }, { name: '成本和价格带合理性' }] } },
  { field_name: '满分', type: 'number' },
  { field_name: '得分', type: 'number' },
  { field_name: '评分理由', type: 'text' },
  { field_name: '需人工确认', type: 'text' },
  { field_name: '负责人', type: 'user' },
];

// ============ 04_立项路径产出表 ============
const fields04 = [
  { field_name: '路径产出ID', type: 'text' },
  { field_name: '立项ID', type: 'text' },
  { field_name: '项目类型', type: 'select', property: { options: [{ name: '品类地图缺失' }, { name: '竞品产品升级' }, { name: '现有爆品升级' }, { name: '未起量产品升级' }] } },
  { field_name: '品类机会判断', type: 'text' },
  { field_name: '竞品池', type: 'text' },
  { field_name: '价格带分析', type: 'text' },
  { field_name: '首发单品建议', type: 'text' },
  { field_name: '用户购买原因', type: 'text' },
  { field_name: '竞品不足', type: 'text' },
  { field_name: '我们的升级方向', type: 'text' },
  { field_name: '可复用模块', type: 'text' },
  { field_name: '需新增模块', type: 'text' },
  { field_name: '模块驱动立项理由', type: 'text' },
  { field_name: '爆品成立原因', type: 'text' },
  { field_name: '可放大模块', type: 'text' },
  { field_name: '未起量原因诊断', type: 'text' },
  { field_name: '处理建议', type: 'select', property: { options: [{ name: '重新立项' }, { name: '内容优化' }, { name: '品牌化涂装' }, { name: '成本优化' }, { name: '渠道切换' }, { name: '止损' }, { name: '需人工确认' }] } },
];

// ============ 05_立项任务分发表 ============
const fields05 = [
  { field_name: '任务ID', type: 'text' },
  { field_name: '立项ID', type: 'text' },
  { field_name: '任务名称', type: 'text' },
  { field_name: '任务类型', type: 'select', property: { options: [{ name: '品类' }, { name: '产品' }, { name: '品牌' }, { name: '材料' }, { name: '供应链' }, { name: '内容' }, { name: '财务' }, { name: 'QA' }] } },
  { field_name: '负责人', type: 'user' },
  { field_name: '协同人', type: 'user' },
  { field_name: '截止时间', type: 'datetime' },
  { field_name: '输出物', type: 'text' },
  { field_name: '目标智能体', type: 'multi_select', property: { options: [{ name: '品类增长' }, { name: '产品模块化' }, { name: '品牌资产' }, { name: '材料创新' }, { name: '供应链打样' }, { name: '内容短视频' }, { name: '财务测算' }] } },
  { field_name: '任务状态', type: 'select', property: { options: [{ name: '待开始' }, { name: '进行中' }, { name: '已完成' }, { name: '阻塞' }, { name: '取消' }] } },
  { field_name: '阻塞原因', type: 'text' },
];

// ============ 06_立项复盘表 ============
const fields06 = [
  { field_name: '复盘ID', type: 'text' },
  { field_name: '立项ID', type: 'text' },
  { field_name: 'AI推荐动作', type: 'select', property: { options: [{ name: '建议立项' }, { name: '小样测试' }, { name: '暂缓补资料' }, { name: '不建议立项' }, { name: '止损' }] } },
  { field_name: 'AI总分', type: 'number' },
  { field_name: '人工最终动作', type: 'select', property: { options: [{ name: '立项' }, { name: '小样测试' }, { name: '暂缓' }, { name: '放弃' }, { name: '止损' }] } },
  { field_name: '判断是否一致', type: 'text' },
  { field_name: '立项判断是否准确', type: 'select', property: { options: [{ name: '是' }, { name: '否' }, { name: '需观察' }] } },
  { field_name: '实际结果', type: 'text' },
  { field_name: '误判原因', type: 'text' },
  { field_name: '沉淀规则', type: 'text' },
  { field_name: 'Agent版本', type: 'text' },
  { field_name: '是否进入模块化智能体', type: 'select', property: { options: [{ name: '是' }, { name: '否' }] } },
  { field_name: '复盘负责人', type: 'user' },
];

// ============ 07_模块库 ============
const fields07 = [
  { field_name: '临时编号', type: 'text' },
  { field_name: '模块名', type: 'text' },
  { field_name: '模块维度', type: 'select', property: { options: [{ name: '版型' }, { name: '材料' }, { name: '结构' }, { name: '外观' }, { name: '功能' }, { name: '包装' }, { name: '待归类' }] } },
  { field_name: '归属品牌', type: 'multi_select', property: { options: [{ name: 'Seruna' }, { name: 'ENYISA' }, { name: '奈肤 Silk-Skin' }, { name: 'JFK' }, { name: 'TMT' }, { name: '通用' }] } },
  { field_name: '一句话说明', type: 'text' },
  { field_name: '来源SKU', type: 'text' },
  { field_name: '状态', type: 'select', property: { options: [{ name: '已量产' }, { name: '打样过' }, { name: '概念' }, { name: '已禁用（踩坑）' }] } },
  { field_name: '关键参数', type: 'text' },
  { field_name: '适用品类', type: 'multi_select', property: { options: [{ name: '护膝' }, { name: '护踝' }, { name: '鞋垫' }, { name: '文胸' }, { name: '内裤' }, { name: '跨品类通用' }] } },
];

// ============ 08_货品池 ============
const fields08 = [
  { field_name: '品类', type: 'text' },
  { field_name: '二级品类', type: 'text' },
  { field_name: '版型(细分品类)', type: 'text' },
  { field_name: '代际', type: 'text' },
  { field_name: '品牌', type: 'text' },
  { field_name: '货号', type: 'text' },
  { field_name: '销量', type: 'text' },
  { field_name: '状态', type: 'text' },
  { field_name: '本代升级情况', type: 'text' },
  { field_name: '细分品类后续升级思路', type: 'text' },
  { field_name: '竞品参考链接', type: 'text' },
  { field_name: '数据来源', type: 'text' },
  { field_name: '数据来源sheet', type: 'text' },
];

const tableFields = {
  '02_立项前模块预判表': fields02,
  '03_立项评分表': fields03,
  '04_立项路径产出表': fields04,
  '05_立项任务分发表': fields05,
  '06_立项复盘表': fields06,
  '07_模块库': fields07,
  '08_货品池': fields08,
};

async function main() {
  for (const [tableName, fields] of Object.entries(tableFields)) {
    const tableId = tableIds[tableName];
    console.log(`\n=== Processing ${tableName} (${tableId}) ===`);

    // 列出已有字段
    const fieldListResult = run(`lark-cli base +field-list --base-token ${BASE_TOKEN} --table-id ${tableId}`);
    const existingFields = (fieldListResult && fieldListResult.ok) ? (fieldListResult.data.fields || []) : [];
    const existingFieldNames = new Set(existingFields.map(f => f.name));

    for (const field of fields) {
      if (existingFieldNames.has(field.field_name)) {
        console.log(`  Field "${field.field_name}" already exists, skipping.`);
        continue;
      }

      // 注意：--json 参数需要传 name 不是 field_name
      const fieldPayload = { ...field, name: field.field_name };
      delete fieldPayload.field_name;
      
      const fieldJson = JSON.stringify(fieldPayload).replace(/"/g, '\\"');
      const cmd = `lark-cli base +field-create --base-token ${BASE_TOKEN} --table-id ${tableId} --json "${fieldJson}"`;
      console.log(`  Creating field: ${field.field_name}`);
      run(cmd);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
