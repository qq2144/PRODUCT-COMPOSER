# 淘玛特立项专家 — 飞书多维表资产清单

> 生成时间: 2026-05-21
> 由 openclaw 自动创建

## 多维表应用

- **应用名称**: 淘玛特立项专家
- **app_token**: `MKw3b1xReaOlcMsRAHmcYJGFn7f`
- **应用 URL**: https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f

---

## 8 张数据表

| 序号 | 表名 | table_id | 直达 URL |
|:---:|------|----------|----------|
| 01 | 产品立项池 | `tblYLlDhMjZ37clW` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblYLlDhMjZ37clW |
| 02 | 立项前模块预判表 | `tbl6AYI33WcDSPqM` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tbl6AYI33WcDSPqM |
| 03 | 立项评分表 | `tblRX2G5gX2L1q4z` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblRX2G5gX2L1q4z |
| 04 | 立项路径产出表 | `tblnbgN27J74XnC8` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblnbgN27J74XnC8 |
| 05 | 立项任务分发表 | `tblqYGZXcLG9Yz4w` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblqYGZXcLG9Yz4w |
| 06 | 立项复盘表 | `tblSMdAVyGcg8aAh` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblSMdAVyGcg8aAh |
| 07 | 模块库 | `tblX5yVRQuX79661` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblX5yVRQuX79661 |
| 08 | 货品池 | `tblYSONxUeN3h9bI` | https://fu9yna69q3.feishu.cn/base/MKw3b1xReaOlcMsRAHmcYJGFn7f?table=tblYSONxUeN3h9bI |

> 注：默认空表 `tblXO5sUVhetFcDA`（数据表）保留未删除，飞书 OpenAPI 暂不支持删除数据表。

---

## 关联关系

| 从表 | 字段 | 关联到 | 类型 |
|------|------|--------|------|
| 02_立项前模块预判表 | 立项ID | 01_产品立项池 | 单向关联 |
| 02_立项前模块预判表 | 匹配模块ID | 07_模块库 | 单向关联 |
| 03_立项评分表 | 立项ID | 01_产品立项池 | 单向关联 |
| 04_立项路径产出表 | 立项ID | 01_产品立项池 | 单向关联 |
| 05_立项任务分发表 | 立项ID | 01_产品立项池 | 单向关联 |
| 06_立项复盘表 | 立项ID | 01_产品立项池 | 单向关联 |

---

## 需手动补配的字段

以下字段类型飞书 OpenAPI **不支持自动创建完整配置**，已创建空壳/替代字段，需人工在飞书界面补配：

| 表 | 字段名 | 问题说明 | 手动操作 |
|----|--------|----------|----------|
| 06_立项复盘表 | **判断是否一致** | 公式字段创建时无法通过 API 设置 `formula_expression` | 在 06 表中手动编辑该字段，配置公式：`IF(OR(AND({AI推荐动作}="建议立项",{人工最终动作}="立项"),AND({AI推荐动作}="小样测试",{人工最终动作}="小样测试"),AND({AI推荐动作}="暂缓补资料",{人工最终动作}="暂缓"),AND({AI推荐动作}="不建议立项",{人工最终动作}="放弃"),AND({AI推荐动作}="止损",{人工最终动作}="止损")),"一致","不一致")` |
| 06_立项复盘表 | **AI推荐动作** | feishu_tables.md 标记为"关联自01（只读快照）"，但 API 不支持创建查找引用(LookUp)字段 | 如需实现从 01 表同步的只读效果，可手动将该字段改为**查找引用**字段，引用 01 表的"推荐动作" |
| 06_立项复盘表 | **AI总分** | feishu_tables.md 标记为"关联自01（只读快照）" | 如需实现从 01 表同步的只读效果，可手动将该字段改为**查找引用**字段，引用 01 表的"立项总分" |
| 06_立项复盘表 | **Agent版本** | feishu_tables.md 标记为"关联自01" | 如需实现从 01 表同步的只读效果，可手动将该字段改为**查找引用**字段，引用 01 表的"Agent版本" |

---

## 字段创建状态汇总

### 01_产品立项池 (tblYLlDhMjZ37clW)
全部 31 个字段已自动创建，含：
- 文本字段 × 14
- 单选字段 × 8（品牌、机会来源、当前是否已有自有产品、是否已有竞品验证、模块闸口结论、模块驱动立项原因、AI判断项目类型、推荐动作、当前状态）
- 多选字段 × 4（核心痛点、目标渠道、品牌资产空间、下一步智能体）
- 数字字段 × 2（立项前模块复用率、立项总分）
- 人员字段 × 3（提交人、产品负责人、代理决策人）
- 复选框 × 1（跨档触发二审）
- 日期字段 × 2（创建时间、更新时间，均设 auto_fill）
- 超链接 × 1（产品资料）

### 02_立项前模块预判表 (tbl6AYI33WcDSPqM)
全部 11 个字段已自动创建，含关联字段 2 个（立项ID → 01，匹配模块ID → 07）。

### 03_立项评分表 (tblRX2G5gX2L1q4z)
全部 8 个字段已自动创建，含关联字段 1 个（立项ID → 01）。

### 04_立项路径产出表 (tblnbgN27J74XnC8)
全部 17 个字段已自动创建，含关联字段 1 个（立项ID → 01）。

### 05_立项任务分发表 (tblqYGZXcLG9Yz4w)
全部 11 个字段已自动创建，含关联字段 1 个（立项ID → 01）。

### 06_立项复盘表 (tblSMdAVyGcg8aAh)
13 个字段已自动创建，含关联字段 1 个（立项ID → 01）。**公式字段需手动补配表达式**。

### 07_模块库 (tblX5yVRQuX79661)
全部 15 个字段已自动创建。

### 08_货品池 (tblYSONxUeN3h9bI)
全部 13 个字段已自动创建。

---

## 下一步

1. 手动补配 06 表"判断是否一致"公式字段
2. （可选）将 06 表的 AI推荐动作 / AI总分 / Agent版本 改为查找引用字段
3. 导入种子数据：07 模块库（`feishu_import/07_module_library_intake.csv`）和 08 货品池（`feishu_import/08_pallet_flat.csv`）
4. 配置每周例会 5 个视图（在 01 表上配筛选视图）
