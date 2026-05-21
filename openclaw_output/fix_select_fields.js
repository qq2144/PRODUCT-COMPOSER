#!/usr/bin/env node
/**
 * 批量创建 select/multi_select 字段（使用 lark-cli api POST）
 */

const { execSync } = require('child_process');

const BASE_TOKEN = 'YLu7bUHjLa4rF3sOZR8cLbUGnlf';

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

const tables = [
  {
    id: 'tbl2zGUOnrFoCHwE',
    name: '01_产品立项池',
    fields: [
      { name: '品牌', type: 3, options: ['Seruna', 'ENYISA', '奈肤 Silk-Skin', 'JFK', 'TMT', '其他'] },
      { name: '机会来源', type: 3, options: ['品类缺失', '竞品', '自有爆品', '未起量产品', '运营反馈', '销售反馈', '老板输入'] },
      { name: '当前是否已有自有产品', type: 3, options: ['有', '没有', '需人工确认'] },
      { name: '是否已有竞品验证', type: 3, options: ['是', '否', '需人工确认'] },
      { name: '核心痛点', type: 4, options: ['支撑不足', '滑落', '闷热', '勒痕', '价格高'] },
      { name: '目标渠道', type: 4, options: ['抖音', '天猫', '京东', '私域', '线下', '跨境'] },
      { name: '品牌资产空间', type: 4, options: ['品牌色', '品牌符号', '品牌材料', '品牌语言', '系列识别', '包装一致性', '结构语言'] },
      { name: '模块闸口结论', type: 3, options: ['模块高复用，可快速推进', '模块中等复用，建议小样测试', '模块低复用，默认暂缓', '核心模块缺失，不建议直接立项', '需人工确认'] },
      { name: '模块驱动立项原因', type: 3, options: ['因已有模块可快速升级', '因升级中可复用模块降低难度', '因关键模块缺失提高风险', '模块信息不足需确认'] },
      { name: 'AI判断项目类型', type: 3, options: ['品类地图缺失', '竞品产品升级', '现有爆品升级', '未起量产品升级', '需人工确认'] },
      { name: '推荐动作', type: 3, options: ['建议立项', '小样测试', '暂缓补资料', '不建议立项', '止损'] },
      { name: '下一步智能体', type: 4, options: ['品类增长', '产品模块化', '品牌资产', '材料创新', '供应链打样', '内容短视频', '财务测算'] },
      { name: '当前状态', type: 3, options: ['待判断', '待补资料', '已建议立项', '小样测试', '暂缓', '放弃', '已转项目'] },
    ]
  },
  {
    id: 'tblvUWALNKnZp0Fm',
    name: '02_立项前模块预判表',
    fields: [
      { name: '模块维度', type: 3, options: ['版型模块', '材料模块', '结构模块', '外观模块', '功能模块', '包装模块'] },
      { name: '匹配状态', type: 3, options: ['可复用', '可改良', '需新增', '无效/禁用', '需人工确认'] },
      { name: '对立项影响', type: 3, options: ['降低开发难度', '支撑快速升级', '构成核心差异', '增加风险', '不影响', '需人工确认'] },
    ]
  },
  {
    id: 'tbl1TFkdFCfMhcgF',
    name: '03_立项评分表',
    fields: [
      { name: '评分维度', type: 3, options: ['市场需求', '竞品验证', '品牌承载力', '差异化空间', '供应链可行性', '内容表达性', '模块复用价值', '成本和价格带合理性'] },
    ]
  },
  {
    id: 'tblCX4Z6mDteoqmk',
    name: '04_立项路径产出表',
    fields: [
      { name: '项目类型', type: 3, options: ['品类地图缺失', '竞品产品升级', '现有爆品升级', '未起量产品升级'] },
      { name: '处理建议', type: 3, options: ['重新立项', '内容优化', '品牌化涂装', '成本优化', '渠道切换', '止损', '需人工确认'] },
    ]
  },
  {
    id: 'tblp45AcaKD3mDw1',
    name: '05_立项任务分发表',
    fields: [
      { name: '任务类型', type: 3, options: ['品类', '产品', '品牌', '材料', '供应链', '内容', '财务', 'QA'] },
      { name: '目标智能体', type: 4, options: ['品类增长', '产品模块化', '品牌资产', '材料创新', '供应链打样', '内容短视频', '财务测算'] },
      { name: '任务状态', type: 3, options: ['待开始', '进行中', '已完成', '阻塞', '取消'] },
    ]
  },
  {
    id: 'tbltxU2nX0sPnNLf',
    name: '06_立项复盘表',
    fields: [
      { name: 'AI推荐动作', type: 3, options: ['建议立项', '小样测试', '暂缓补资料', '不建议立项', '止损'] },
      { name: '人工最终动作', type: 3, options: ['立项', '小样测试', '暂缓', '放弃', '止损'] },
      { name: '立项判断是否准确', type: 3, options: ['是', '否', '需观察'] },
      { name: '是否进入模块化智能体', type: 3, options: ['是', '否'] },
    ]
  },
  {
    id: 'tblddaVSDrKAYIlJ',
    name: '07_模块库',
    fields: [
      { name: '模块维度', type: 3, options: ['版型', '材料', '结构', '外观', '功能', '包装', '待归类'] },
      { name: '归属品牌', type: 4, options: ['Seruna', 'ENYISA', '奈肤 Silk-Skin', 'JFK', 'TMT', '通用'] },
      { name: '状态', type: 3, options: ['已量产', '打样过', '概念', '已禁用（踩坑）'] },
      { name: '适用品类', type: 4, options: ['护膝', '护踝', '鞋垫', '文胸', '内裤', '跨品类通用'] },
    ]
  },
];

async function main() {
  for (const table of tables) {
    console.log(`\n=== ${table.name} (${table.id}) ===`);

    // 获取已有字段
    const listResult = run(`lark-cli base +field-list --base-token ${BASE_TOKEN} --table-id ${table.id}`);
    const existingFields = (listResult && listResult.ok) ? (listResult.data.fields || []) : [];
    const existingFieldNames = new Set(existingFields.map(f => f.name));

    for (const field of table.fields) {
      if (existingFieldNames.has(field.name)) {
        console.log(`  Field "${field.name}" already exists, skipping.`);
        continue;
      }

      const options = field.options.map(name => ({ name }));
      const payload = {
        field_name: field.name,
        type: field.type,
        property: { options }
      };

      const payloadJson = JSON.stringify(payload).replace(/"/g, '\\"');
      const cmd = `lark-cli api POST "/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${table.id}/fields" --data "${payloadJson}"`;
      console.log(`  Creating field: ${field.name} (type=${field.type})`);
      run(cmd);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
