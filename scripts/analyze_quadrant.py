# -*- coding: utf-8 -*-
"""分析当前 4 象限阈值对 77 个真实品类的分布效果"""
import csv
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

with open('data/product_assets.csv', encoding='utf-8-sig') as f:
    products = list(csv.DictReader(f))

by_cat = defaultdict(lambda: {'sku_count': 0, 'product_sales': defaultdict(int)})
for p in products:
    cat = p.get('分类', '').strip()
    if not cat:
        continue
    abbrev = p.get('货品简称', '').strip()
    try:
        sales = int(float(p.get('实际销售量', 0) or 0))
    except (ValueError, TypeError):
        sales = 0
    by_cat[cat]['sku_count'] += 1
    if abbrev:
        by_cat[cat]['product_sales'][abbrev] += sales

stats = []
for cat, d in by_cat.items():
    sku_count = d['sku_count']
    top_sales = max(d['product_sales'].values()) if d['product_sales'] else 0
    is_large = sku_count >= 100
    is_strong = top_sales >= 1000
    if is_large and is_strong:
        q = '🌟 明星'
    elif not is_large and is_strong:
        q = '⭐ 潜力'
    elif is_large and not is_strong:
        q = '🌊 红海'
    else:
        q = '❌ 鸡肋'
    stats.append((cat, sku_count, top_sales, q))

stats.sort(key=lambda x: -x[1])

# 分布
counts = defaultdict(int)
for _, _, _, q in stats:
    counts[q] += 1

print('=== 按当前阈值 (SKU≥100=大市场 / 爆品销量≥1000=强需求) ===')
print(f'77 个品类四象限分布：')
for q, c in sorted(counts.items(), key=lambda x: -x[1]):
    bar = '█' * int(c / 2)
    print(f'  {q}: {c:3d} 个 ({c*100/len(stats):4.1f}%)  {bar}')

print(f'\n=== Top 20 品类（按 SKU 销售行数）===')
print(f'{"品类":<14} {"SKU":>5} {"爆品销量":>10}  象限')
print('-' * 60)
for cat, sku, top, q in stats[:20]:
    print(f'{cat:<14} {sku:>5} {top:>10}  {q}')

print(f'\n=== SKU 销售行数分布 ===')
sku_counts = sorted([s for _, s, _, _ in stats])


def pct(arr, p):
    return arr[int(len(arr) * p / 100)]


print(f'  P10={pct(sku_counts, 10):4d}  P25={pct(sku_counts, 25):4d}  '
      f'P50={pct(sku_counts, 50):4d}  P75={pct(sku_counts, 75):4d}  '
      f'P90={pct(sku_counts, 90):4d}  Max={sku_counts[-1]}')

print(f'\n=== 爆品销量分布 ===')
top_sales = sorted([s for _, _, s, _ in stats])
print(f'  P10={pct(top_sales, 10):6d}  P25={pct(top_sales, 25):6d}  '
      f'P50={pct(top_sales, 50):6d}  P75={pct(top_sales, 75):6d}  '
      f'P90={pct(top_sales, 90):6d}  Max={top_sales[-1]}')

print(f'\n=== 用百分位阈值（P50 SKU / P50 销量）会怎样？ ===')
sku_median = pct(sku_counts, 50)
sales_median = pct(top_sales, 50)
print(f'  阈值改为：SKU >= {sku_median} / 销量 >= {sales_median}')
counts2 = defaultdict(int)
for cat, sku, top, _ in stats:
    is_large = sku >= sku_median
    is_strong = top >= sales_median
    if is_large and is_strong:
        q = '🌟 明星'
    elif not is_large and is_strong:
        q = '⭐ 潜力'
    elif is_large and not is_strong:
        q = '🌊 红海'
    else:
        q = '❌ 鸡肋'
    counts2[q] += 1
for q, c in sorted(counts2.items(), key=lambda x: -x[1]):
    print(f'  {q}: {c:3d} 个 ({c*100/len(stats):4.1f}%)')
