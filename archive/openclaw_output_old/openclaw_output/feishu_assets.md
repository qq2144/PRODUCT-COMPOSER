# 淘玛特立项专家 - 飞书多维表资产清单

> 创建时间: 2026-05-21
> 创建方式: OpenClaw + lark-cli

## 多维表应用

- **应用名称**: 淘玛特立项专家
- **Base Token**: `YLu7bUHjLa4rF3sOZR8cLbUGnlf`
- **应用 URL**: https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf

## 数据表清单

| 序号 | 表名 | Table ID | 直达 URL |
|---|---|---|---|
| 1 | 01_产品立项池 | `tbl2zGUOnrFoCHwE` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tbl2zGUOnrFoCHwE |
| 2 | 02_立项前模块预判表 | `tblvUWALNKnZp0Fm` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tblvUWALNKnZp0Fm |
| 3 | 03_立项评分表 | `tbl1TFkdFCfMhcgF` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tbl1TFkdFCfMhcgF |
| 4 | 04_立项路径产出表 | `tblCX4Z6mDteoqmk` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tblCX4Z6mDteoqmk |
| 5 | 05_立项任务分发表 | `tblp45AcaKD3mDw1` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tblp45AcaKD3mDw1 |
| 6 | 06_立项复盘表 | `tbltxU2nX0sPnNLf` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tbltxU2nX0sPnNLf |
| 7 | 07_模块库 | `tblddaVSDrKAYIlJ` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tblddaVSDrKAYIlJ |
| 8 | 08_货品池 | `tblZVcyd0EPw8hDc` | https://fu9yna69q3.feishu.cn/base/YLu7bUHjLa4rF3sOZR8cLbUGnlf?table=tblZVcyd0EPw8hDc |

## 字段创建状态

### 01_产品立项池

**已创建字段**:
- ID (auto_number)
- 立项ID (text)
- 立项名称 (text)
- 品牌 (select)
- 品类 (text)
- 机会来源 (select)
- 当前是否已有自有产品 (select)
- 是否已有竞品验证 (select)
- 目标用户 (text)
- 使用场景 (text)
- 核心痛点 (multi_select)
- 价格带 (text)
- 目标渠道 (multi_select)
- 当前销售表现 (text)
- 已知问题 (text)
- 供应链资源 (text)
- 品牌资产空间 (multi_select)
- 立项前模块复用率 (number)
- 模块闸口结论 (select)
- 模块驱动立项原因 (select)
- AI判断项目类型 (select)
- 立项总分 (number)
- 推荐动作 (select)
- 最大机会 (text)
- 最大风险 (text)
- 人工确认点 (text)
- 下一步智能体 (multi_select)
- 当前状态 (select)
- 提交人 (user)
- 产品负责人 (user)
- 代理决策人 (user)
- Agent版本 (text)
- 跨档触发二审 (checkbox)
- 品类机会描述 (text)
- 关联竞品货号 (text)
- 关联爆品货号 (text)
- 关联未起量货号 (text)
- 预估成本 (number)
- 预估售价 (number)
- 日期 (datetime)
- 备注 (text)

### 02_立项前模块预判表

**已创建字段**:
- ID (auto_number)
- 预判ID (text)
- 立项ID (text)
- 模块维度 (select)
- 预期模块 (text)
- 匹配状态 (select)
- 匹配模块ID (text)
- 预估复用率 (number)
- 对立项影响 (select)
- 缺失信息 (text)
- 模块负责人 (user)
- 下一步动作 (text)

### 03_立项评分表

**已创建字段**:
- ID (auto_number)
- 评分ID (text)
- 立项ID (text)
- 评分维度 (select)
- 满分 (number)
- 得分 (number)
- 评分理由 (text)
- 需人工确认 (text)
- 负责人 (user)

### 04_立项路径产出表

**已创建字段**:
- ID (auto_number)
- 路径产出ID (text)
- 立项ID (text)
- 项目类型 (select)
- 品类机会判断 (text)
- 竞品池 (text)
- 价格带分析 (text)
- 首发单品建议 (text)
- 用户购买原因 (text)
- 竞品不足 (text)
- 我们的升级方向 (text)
- 可复用模块 (text)
- 需新增模块 (text)
- 模块驱动立项理由 (text)
- 爆品成立原因 (text)
- 可放大模块 (text)
- 未起量原因诊断 (text)
- 处理建议 (select)

### 05_立项任务分发表

**已创建字段**:
- ID (auto_number)
- 任务ID (text)
- 立项ID (text)
- 任务名称 (text)
- 任务类型 (select)
- 负责人 (user)
- 协同人 (user)
- 截止时间 (datetime)
- 输出物 (text)
- 目标智能体 (multi_select)
- 任务状态 (select)
- 阻塞原因 (text)

### 06_立项复盘表

**已创建字段**:
- ID (auto_number)
- 复盘ID (text)
- 立项ID (text)
- AI推荐动作 (select)
- AI总分 (number)
- 人工最终动作 (select)
- 判断是否一致 (text)
- 立项判断是否准确 (select)
- 实际结果 (text)
- 误判原因 (text)
- 沉淀规则 (text)
- Agent版本 (text)
- 是否进入模块化智能体 (select)
- 复盘负责人 (user)

### 07_模块库

**已创建字段**:
- ID (auto_number)
- 临时编号 (text)
- 模块名 (text)
- 模块维度 (select)
- 一句话说明 (text)
- 关键参数 (text)
- 适用品类 (multi_select)
- 归属品牌 (multi_select)
- 状态 (select)
- 来源SKU (text)

### 08_货品池

**已创建字段**:
- ID (auto_number)
- 品类 (text)
- 二级品类 (text)
- 版型(细分品类) (text)
- 代际 (text)
- 品牌 (text)
- 货号 (text)
- 销量 (text)
- 状态 (text)
- 本代升级情况 (text)
- 细分品类后续升级思路 (text)
- 竞品参考链接 (text)
- 数据来源 (text)
- 数据来源sheet (text)

## OpenAPI 不支持自动创建的字段

以下字段类型 lark-cli / 飞书 Base OpenAPI 当前**不支持通过 API 自动创建**，需**手动在飞书界面补配**：

| 表 | 字段名 | 期望类型 | 说明 |
|---|---|---|---|
| 01_产品立项池 | 产品资料 | 附件/链接 | 竞品链接、图片、参数、销售截图；OpenAPI 不支持附件字段创建 |
| 02_立项前模块预判表 | 立项ID | 关联 | 应关联 01_产品立项池；当前为 text，需手动改为关联 |
| 03_立项评分表 | 立项ID | 关联 | 应关联 01_产品立项池；当前为 text |
| 04_立项路径产出表 | 立项ID | 关联 | 应关联 01_产品立项池；当前为 text |
| 05_立项任务分发表 | 立项ID | 关联 | 应关联 01_产品立项池；当前为 text |
| 06_立项复盘表 | 立项ID | 关联 | 应关联 01_产品立项池；当前为 text |
| 06_立项复盘表 | 判断是否一致_公式 | 公式 | `IF([AI推荐动作]=[人工最终动作],"一致","不一致")`；**已通过 OpenAPI 自动创建** |
| 06_立项复盘表 | 判断是否一致 | 文本 | 原文档要求的公式字段已由上方 "判断是否一致_公式" 实现；本 text 字段可删除或留作备用 |
| 06_立项复盘表 | AI推荐动作 | 关联/只读快照 | 文档要求"关联自01"只读快照；当前为独立 select，需手动改为 lookup 或直接保留独立字段由 AI 回填 |
| 06_立项复盘表 | AI总分 | 关联/只读快照 | 文档要求"关联自01"只读快照；当前为独立 number，需手动改为 lookup 或直接保留独立字段由 AI 回填 |
| 06_立项复盘表 | Agent版本 | 关联/只读快照 | 文档要求"关联自01"只读快照；当前为独立 text，需手动改为 lookup 或直接保留独立字段由 AI 回填 |

## 手动操作清单

1. **01_产品立项池**: 手动添加 "产品资料" 附件字段
2. **02~06 表**: 将 "立项ID" 从 text 改为 **关联字段**，关联到 01_产品立项池
3. **06_立项复盘表**:
   - 将 "判断是否一致" 从 text 改为 **公式字段**
   - 配置公式: `IF(AI推荐动作 与 人工最终动作 同档, "一致", "不一致")`
   - 或保留当前独立 select/text 字段，由 AI/人工回填
4. **06_立项复盘表**: 如需严格实现"关联自01只读快照"，需手动创建 lookup 字段（OpenAPI 不支持）

## 备注

- 自动创建时间: 2026-05-21
- 创建工具: lark-cli + Node.js 脚本
- 身份策略: user-default（以用户身份操作）
