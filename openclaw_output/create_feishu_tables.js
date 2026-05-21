#!/usr/bin/env node
/**
 * 淘玛特立项专家 - 飞书多维表批量创建脚本
 * 用法: node create_feishu_tables.js <base_token>
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

// ============ 01_产品立项池 ============
const table01 = {
  name: '01_产品立项池',
  fields: [
    { field_name: '立项ID', type: 'text' },
    { field_name: '立项名称', type: 'text' },
    { field_name: '品牌', type: 'select', property: { options: [{ name: 'Seruna' }, { name: 'ENYISA' }, { name: '奈肤 Silk-Skin' }, { name: 'JFK' }, { name: 'TMT' }, { name: '其他' }] } },
    { field_name: '品类', type: 'text' },
    { field_name: '机会来源', type: 'select', property: { options: [{ name: '品类缺失' }, { name: '竞品' }, { name: '自有爆品' }, { name: '未起量产品' }, { name: '运营反馈' }, { name: '销售反馈' }, { name: '老板输入' }] } },
    { field_name: '产品资料', type: 'link' },
    { field_name: '当前是否已有自有产品', type: 'select', property: { options: [{ name: '有' }, { name: '没有' }, { name: '需人工确认' }] } },
    { field_name: '是否已有竞品验证', type: 'select', property: { options: [{ name: '是' }, { name: '否' }, { name: '需人工确认' }] } },
    { field_name: '目标用户', type: 'text' },
    { field_name: '使用场景', type: 'text' },
    { field_name: '核心痛点', type: 'multi_select', property: { options: [{ name: '支撑不足' }, { name: '滑落' }, { name: '闷热' }, { name: '勒痕' }, { name: '价格高' }] } },
    { field_name: '目标价格带', type: 'text' },
    { field_name: '目标渠道', type: 'multi_select', property: { options: [{ name: '抖音' }, { name: '天猫' }, { name: '京东' }, { name: '私域' }, { name: '线下' }, { name: '跨境' }] } },
    { field_name: '当前销售表现', type: 'text' },
    { field_name: '已知问题', type: 'text' },
    { field_name: '供应链资源', type: 'text' },
    { field_name: '品牌资产空间', type: 'multi_select', property: { options: [{ name: '品牌色' }, { name: '品牌符号' }, { name: '品牌材料' }, { name: '品牌语言' }, { name: '系列识别' }, { name: '包装一致性' }, { name: '结构语言' }] } },
    { field_name: '立项前模块复用率', type: 'number' },
    { field_name: '模块闸口结论', type: 'select', property: { options: [{ name: '模块高复用，可快速推进' }, { name: '模块中等复用，建议小样测试' }, { name: '模块低复用，默认暂缓' }, { name: '核心模块缺失，不建议直接立项' }, { name: '需人工确认' }] } },
    { field_name: '模块驱动立项原因', type: 'select', property: { options: [{ name: '因已有模块可快速升级' }, { name: '因升级中可复用模块降低难度' }, { name: '因关键模块缺失提高风险' }, { name: '模块信息不足需确认' }] } },
    { field_name: 'AI判断项目类型', type: 'select', property: { options: [{ name: '品类地图缺失' }, { name: '竞品产品升级' }, { name: '现有爆品升级' }, { name: '未起量产品升级' }, { name: '需人工确认' }] } },
    { field_name: '立项总分', type: 'number' },
    { field_name: '推荐动作', type: 'select', property: { options: [{ name: '建议立项' }, { name: '小样测试' }, { name: '暂缓补资料' }, { name: '不建议立项' }, { name: '止损' }] } },
    { field_name: '最大机会', type: 'text' },
    { field_name: '最大风险', type: 'text' },
    { field_name: '人工确认点', type: 'text' },
    { field_name: '下一步智能体', type: 'multi_select', property: { options: [{ name: '品类增长' }, { name: '产品模块化' }, { name: '品牌资产' }, { name: '材料创新' }, { name: '供应链打样' }, { name: '内容短视频' }, { name: '财务测算' }] } },
    { field_name: '当前状态', type: 'select', property: { options: [{ name: '待判断' }, { name: '待补资料' }, { name: '已建议立项' }, { name: '小样测试' }, { name: '暂缓' }, { name: '放弃' }, { name: '已转项目' }] } },
    { field_name: '提交人', type: 'user' },
    { field_name: '产品负责人', type: 'user' },
    { field_name: '代理决策人', type: 'user' },
    { field_name: 'Agent版本', type: 'text' },
    { field_name: '跨档触发二审', type: 'checkbox' },
  ]
};

// ============ 02_立项前模块预判表 ============
const table02 = {
  name: '02_立项前模块预判表',
  fields: [
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
  ]
};

// ============ 03_立项评分表 ============
const table03 = {
  name: '03_立项评分表',
  fields: [
    { field_name: '评分ID', type: 'text' },
    { field_name: '立项ID', type: 'text' },
    { field_name: '评分维度', type: 'select', property: { options: [{ name: '市场需求' }, { name: '竞品验证' }, { name: '品牌承载力' }, { name: '差异化空间' }, { name: '供应链可行性' }, { name: '内容表达性' }, { name: '模块复用价值' }, { name: '成本和价格带合理性' }] } },
    { field_name: '满分', type: 'number' },
    { field_name: '得分', type: 'number' },
    { field_name: '评分理由', type: 'text' },
    { field_name: '需人工确认', type: 'text' },
    { field_name: '负责人', type: 'user' },
  ]
};

// ============ 04_立项路径产出表 ============
const table04 = {
  name: '04_立项路径产出表',
  fields: [
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
  ]
};

// ============ 05_立项任务分发表 ============
const table05 = {
  name: '05_立项任务分发表',
  fields: [
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
  ]
};

// ============ 06_立项复盘表 ============
const table06 = {
  name: '06_立项复盘表',
  fields: [
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
  ]
};

// ============ 07_模块库 ============
const table07 = {
  name: '07_模块库',
  fields: [
    { field_name: '临时编号', type: 'text' },
    { field_name: '模块名', type: 'text' },
    { field_name: '模块维度', type: 'select', property: { options: [{ name: '版型' }, { name: '材料' }, { name: '结构' }, { name: '外观' }, { name: '功能' }, { name: '包装' }, { name: '待归类' }] } },
    { field_name: '归属品牌', type: 'multi_select', property: { options: [{ name: 'Seruna' }, { name: 'ENYISA' }, { name: '奈肤 Silk-Skin' }, { name: 'JFK' }, { name: 'TMT' }, { name: '通用' }] } },
    { field_name: '一句话说明', type: 'text' },
    { field_name: '来源SKU', type: 'text' },
    { field_name: '状态', type: 'select', property: { options: [{ name: '已量产' }, { name: '打样过' }, { name: '概念' }, { name: '已禁用（踩坑）' }] } },
    { field_name: '关键参数', type: 'text' },
    { field_name: '适用品类', type: 'multi_select', property: { options: [{ name: '护膝' }, { name: '护踝' }, { name: '鞋垫' }, { name: '文胸' }, { name: '内裤' }, { name: '跨品类通用' }] } },
  ]
};

// ============ 08_货品池 ============
const table08 = {
  name: '08_货品池',
  fields: [
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
  ]
};

const tables = [table01, table02, table03, table04, table05, table06, table07, table08];

async function main() {
  // 先列出已有表
  const listResult = run(`lark-cli base +table-list --base-token ${BASE_TOKEN}`);
  if (!listResult || !listResult.ok) {
    console.error('Failed to list tables');
    process.exit(1);
  }

  const existingTables = listResult.data.tables || [];
  console.log(`Existing tables: ${existingTables.map(t => t.name).join(', ')}`);

  for (const table of tables) {
    const existing = existingTables.find(t => t.name === table.name);
    let tableId;

    if (existing) {
      console.log(`\nTable "${table.name}" already exists (id=${existing.id}), skipping creation.`);
      tableId = existing.id;
    } else {
      console.log(`\nCreating table: ${table.name}`);
      const createResult = run(`lark-cli base +table-create --base-token ${BASE_TOKEN} --name "${table.name}"`);
      if (!createResult || !createResult.ok) {
        console.error(`Failed to create table ${table.name}`);
        continue;
      }
      tableId = createResult.data.table_id;
      console.log(`Created table "${table.name}" with id=${tableId}`);
    }

    // 列出已有字段
    const fieldListResult = run(`lark-cli base +field-list --base-token ${BASE_TOKEN} --table-id ${tableId}`);
    const existingFields = (fieldListResult && fieldListResult.ok) ? (fieldListResult.data.fields || []) : [];
    const existingFieldNames = new Set(existingFields.map(f => f.name));

    // 创建缺失字段
    for (const field of table.fields) {
      if (existingFieldNames.has(field.field_name)) {
        console.log(`  Field "${field.field_name}" already exists, skipping.`);
        continue;
      }

      const fieldJson = JSON.stringify(field).replace(/"/g, '\\"');
      const cmd = `lark-cli base +field-create --base-token ${BASE_TOKEN} --table-id ${tableId} --fields "${fieldJson}"`;
      console.log(`  Creating field: ${field.field_name}`);
      run(cmd);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
