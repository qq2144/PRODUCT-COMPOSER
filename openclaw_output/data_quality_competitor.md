# 货盘竞品情报 · 数据质量报告

> 生成时间：2026-06-01
> 输入：`RawData/货盘/*.xlsx` (4 个货盘最新月份 sheet)
> 输出：`data/competitor_intel.csv`

## 📊 总览

| 指标 | 值 |
|---|---:|
| 总记录数 | **31** |
| 含竞品 URL 行数 | 22 |
| URL 行含销量描述 | 0（0.0%）|
| URL 行含团队升级思路 | 22（100.0%）|
| 仅有升级思路无 URL | 9 |

## 📦 按品类分布

| 品类 | 记录数 | 含 URL |
|---|---:|---:|
| 护踝 | 16 | 14 |
| 护腕 | 15 | 8 |

## 📑 按货盘文件

| 文件 | sheet | 竞品 URL | 独立升级思路 |
|---|---|---:|---:|
| 护腕货盘.xlsx | 26年04月 | 8 | 7 |
| 护膝货盘.xlsx | 26年04月 | 0 | 0 |
| 护踝货盘(5).xlsx | 2026.03 | 14 | 2 |
| 睡眠货盘(7).xlsx | 26年4月 | 0 | 0 |

## 🔍 样本（前 5 条竞品 URL）

- **[护腕/双向扭伤护腕/二代]** 
  - URL: https://detail.tmall.com/item.htm?abbucket=6&id=785482207904&mi_id=0000OkTfX96sqSQA4gIGMGv...
  - 升级思路: ①虎口处加厚，减少勒手的压力。 / ②工艺从纯缝线改为热压＋缝线。更精致（参考李宁、蜗牛）
- **[护腕/双向扭伤护腕/二代]** 
  - URL: https://detail.tmall.com/item.htm?abbucket=6&id=937693751344&mi_id=00009CUWScyRfubDbfisiD9...
  - 升级思路: ①虎口处加厚，减少勒手的压力。 / ②工艺从纯缝线改为热压＋缝线。更精致（参考李宁、蜗牛）
- **[护腕/双向扭伤护腕/三代]** 
  - URL: https://detail.tmall.com/item.htm?abbucket=6&id=785482207904&mi_id=0000OkTfX96sqSQA4gIGMGv...
  - 升级思路: ①虎口处加厚，减少勒手的压力。 / ②工艺从纯缝线改为热压＋缝线。更精致（参考李宁、蜗牛）
- **[护腕/双向扭伤护腕/三代]** 
  - URL: https://detail.tmall.com/item.htm?abbucket=6&id=937693751344&mi_id=00009CUWScyRfubDbfisiD9...
  - 升级思路: ①虎口处加厚，减少勒手的压力。 / ②工艺从纯缝线改为热压＋缝线。更精致（参考李宁、蜗牛）
- **[护腕/单向扭伤护腕/二代]** 
  - URL: https://detail.tmall.com/item.htm?abbucket=6&id=785482207904&mi_id=0000OkTfX96sqSQA4gIGMGv...
  - 升级思路: 工艺从纯缝线改为热压＋缝线。更精致（参考李宁、蜗牛）

## ⚠️ 已知问题

1. URL 去重：同一个 URL 可能在不同行重复出现（货盘是矩阵布局），已做 set 去重。
2. 部分备注列内容不是 URL 而是销量描述（如「3000＋ / 单链接双商品」）——已分别归到 `competitor_sales_note`。
3. 团队升级思路按细分品类合并（多代际共享），可能丢失「哪一代升级」的精度。

## 🔄 下一步

- Step 5：交叉验证 4 张表 JOIN 通不通：
  - module_product_link.product_code ↔ product_assets.货品编号
  - competitor_intel.sub_category ↔ product_assets.分类（语义层映射）