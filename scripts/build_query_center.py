# -*- coding: utf-8 -*-
"""
产品查询中心 · 构建器
─────────────────────────────────────────────
读 data/ 下 4 张 CSV → 生成单文件 web/index.html
所有数据 embed 在 HTML 里，浏览器双击即用，无后端。

功能：
- 顶部 hero：4 个总数指标
- 3 个 Tab：按品类 / 按品牌 / 按模块
- 每个 Tab 含：左侧分组列表 + 右侧 SKU 表格
- 多维筛选：品类 + 品牌 + 销量阈值 + 价格区间
- 全局搜索：货号 / 货品名
"""

import csv
import json
import os
import sys
from collections import Counter, defaultdict

OUT = "web/index.html"


def read_csv(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def to_num(s, default=0):
    try:
        return float(s) if s not in ("", None) else default
    except (ValueError, TypeError):
        return default


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs("web", exist_ok=True)

    print("读 4 张 CSV...")
    products = read_csv("data/product_assets.csv")
    modules = read_csv("data/modules.csv")
    links = read_csv("data/module_product_link.csv")
    comps = read_csv("data/competitor_intel.csv")
    print(f"  products: {len(products)}, modules: {len(modules)}, links: {len(links)}, comps: {len(comps)}")

    # === 精简产品资产，前端只用到的列 ===
    products_lite = []
    for p in products:
        products_lite.append({
            "code": (p.get("商家编码") or "").strip(),
            "product_code": (p.get("货品编号") or "").strip(),
            "product_abbrev": (p.get("货品简称") or "").strip(),
            "name": (p.get("货品名称") or "").strip(),
            "spec": (p.get("规格名称") or "").strip(),
            "brand": (p.get("品牌") or "").strip(),
            "category": (p.get("分类") or "").strip(),
            "shop": (p.get("店铺") or "").strip(),
            "sales": int(to_num(p.get("实际销售量"))),
            "price": int(to_num(p.get("零售价"))),
            "cost": round(to_num(p.get("货品总成本")), 2),
            "margin": round(to_num(p.get("毛利率%")), 1),
            "zero": p.get("is_zero_sales") == "是",
        })

    # === 模块（含每模块被复用次数）===
    reuse_count = Counter(l["module_id"] for l in links)
    modules_lite = []
    for m in modules:
        mid = m["module_id"]
        modules_lite.append({
            "id": mid,
            "type": m.get("module_type_sheet", ""),
            "name": m.get("module_name", "")[:50],
            "factory": m.get("factory_src", ""),
            "material": m.get("material", "")[:30],
            "color": m.get("color", "")[:15],
            "price": m.get("price", ""),
            "reuse": reuse_count.get(mid, 0),
        })

    # === module → product 关联（用 product_abbrev 精确匹配 + 名称索引）===
    abbrev_set = set(p["product_abbrev"] for p in products_lite if p["product_abbrev"])
    # 建一个反向：从名称片段到 product_abbrev 的索引（性能优化）
    # 名称里可能含 product_code，所以预先按 product_abbrev 建一个轻量索引
    abbrev_list = [p["product_abbrev"] for p in products_lite if p["product_abbrev"]]
    name_to_abbrev = {p["name"]: p["product_abbrev"] for p in products_lite if p["name"]}

    links_lite = []
    for l in links:
        code = (l.get("product_code") or "").strip()
        matched_abbrev = ""
        if code:
            if code in abbrev_set:
                matched_abbrev = code
            else:
                # 名称模糊匹配（O(N) 但只在 abbrev 精确不中时才跑）
                for name, abbrev in name_to_abbrev.items():
                    if code in name:
                        matched_abbrev = abbrev
                        break
        links_lite.append({
            "mid": l["module_id"],
            "product_name": (l.get("product_name") or "")[:40],
            "product_code": code,
            "matched_abbrev": matched_abbrev,
            "position": (l.get("reuse_position") or "")[:15],
        })

    # === 统计 ===
    by_category = Counter(p["category"] for p in products_lite if p["category"])
    by_brand = Counter(p["brand"] for p in products_lite if p["brand"])
    by_module_type = Counter(m["type"] for m in modules_lite)

    overview = {
        "total_skus": len(products_lite),
        "total_modules": len(modules_lite),
        "total_categories": len(by_category),
        "total_brands": len(by_brand),
        "total_links": len(links_lite),
        "total_factories": len(set(m["factory"] for m in modules_lite)),
        "categories": [(k, v) for k, v in by_category.most_common()],
        "brands": [(k, v) for k, v in by_brand.most_common()],
        "module_types": [(k, v) for k, v in by_module_type.most_common()],
        "zero_skus": sum(1 for p in products_lite if p["zero"]),
    }

    # === 生成 HTML ===
    html = build_html(products_lite, modules_lite, links_lite, overview)
    with open(OUT, "w", encoding="utf-8-sig") as f:
        f.write(html)

    size_mb = os.path.getsize(OUT) / 1024 / 1024
    print(f"\n✅ 产品查询中心已生成")
    print(f"  {OUT}  ({size_mb:.2f} MB)")
    print(f"  浏览器双击打开即可使用")


def build_html(products, modules, links, overview):
    # 嵌入数据
    data_js = f"""
const DATA = {{
  products: {json.dumps(products, ensure_ascii=False)},
  modules: {json.dumps(modules, ensure_ascii=False)},
  links: {json.dumps(links, ensure_ascii=False)},
  overview: {json.dumps(overview, ensure_ascii=False)}
}};
"""

    html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>产品查询中心</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f5f5f7; color: #1d1d1f; font-size: 14px;
  }
  .page { max-width: 1400px; margin: 0 auto; padding: 24px; }

  /* Hero */
  .hero {
    background: linear-gradient(135deg, #5856d6, #007aff);
    color: white; border-radius: 16px; padding: 24px 32px; margin-bottom: 20px;
  }
  .hero h1 { font-size: 24px; margin-bottom: 8px; }
  .hero .sub { opacity: 0.9; font-size: 13px; margin-bottom: 16px; }
  .hero .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  .metric {
    background: rgba(255,255,255,0.15); border-radius: 10px;
    padding: 12px 14px; backdrop-filter: blur(10px);
  }
  .metric .v { font-size: 22px; font-weight: 700; }
  .metric .l { font-size: 11px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

  /* Tabs */
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
  .tab {
    background: white; padding: 12px 20px; border-radius: 10px;
    cursor: pointer; font-weight: 600; font-size: 14px;
    border: 2px solid transparent; transition: all 0.15s;
  }
  .tab:hover { background: #ebebf0; }
  .tab.active { background: white; border-color: #5856d6; color: #5856d6; }
  .tab .count { background: #f0f0f3; padding: 2px 8px; border-radius: 100px; font-size: 11px; margin-left: 6px; font-weight: 500; }
  .tab.active .count { background: #ebeaff; color: #5856d6; }

  /* Filters */
  .filters {
    background: white; border-radius: 12px; padding: 14px 18px;
    margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
  }
  .filters label { font-size: 12px; color: #6e6e73; margin-right: 4px; }
  .filters select, .filters input {
    border: 1px solid #d2d2d7; border-radius: 8px; padding: 6px 10px;
    font-size: 13px; background: white; min-width: 100px;
  }
  .filters input[type="text"] { min-width: 160px; }
  .filters .clear {
    background: #f5f5f7; padding: 6px 12px; border-radius: 8px;
    cursor: pointer; font-size: 12px; color: #515154; margin-left: auto;
  }
  .filters .clear:hover { background: #ebebf0; }

  /* Main layout */
  .main { display: grid; grid-template-columns: 280px 1fr; gap: 16px; }
  .panel { background: white; border-radius: 12px; padding: 16px; }
  .panel h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #6e6e73; margin-bottom: 12px; }

  /* Side list */
  .side-list { max-height: 75vh; overflow-y: auto; }
  .side-item {
    padding: 8px 10px; border-radius: 6px; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; margin-bottom: 2px;
  }
  .side-item:hover { background: #f5f5f7; }
  .side-item.selected { background: #ebeaff; color: #5856d6; font-weight: 600; }
  .side-item .num { font-size: 11px; color: #86868b; background: #f0f0f3; padding: 1px 7px; border-radius: 100px; }
  .side-item.selected .num { background: white; color: #5856d6; }

  /* Table */
  .table-wrap { max-height: 75vh; overflow: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th {
    background: #f5f5f7; padding: 10px 12px; text-align: left;
    font-weight: 600; color: #515154; font-size: 12px;
    position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #e5e7eb;
  }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f3; }
  tr:hover td { background: #fafbfc; }
  td.num { font-family: 'SF Mono', Menlo, monospace; text-align: right; }
  td.sales-hot { color: #16a34a; font-weight: 700; }
  td.sales-zero { color: #dc2626; }
  td.brand-tag { font-size: 11px; }
  .pill {
    display: inline-block; padding: 1px 7px; border-radius: 100px;
    font-size: 11px; background: #ebebf0; color: #515154;
  }
  .pill-brand { background: #ebeaff; color: #5856d6; }
  .pill-cat { background: #fff7ed; color: #c2410c; }
  .pill-type { background: #e0f2fe; color: #0369a1; }
  .pill-zero { background: #fee2e2; color: #991b1b; }

  .header-info {
    background: #f0f7ff; border-left: 3px solid #007aff;
    padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 14px;
    font-size: 13px; color: #0c4a6e;
  }
  .header-info strong { color: #1d4f8b; }

  .empty {
    padding: 60px 24px; text-align: center; color: #86868b; font-size: 14px;
  }

  /* Search box */
  .search-bar {
    background: white; border-radius: 12px; padding: 10px 14px; margin-bottom: 12px;
  }
  .search-bar input {
    width: 100%; border: none; outline: none; font-size: 14px; padding: 4px 0;
  }
</style>
</head>
<body>
<div class="page">

<div class="hero">
  <h1>📊 产品查询中心</h1>
  <div class="sub">用真数据查 SKU、品牌、模块。所有结果直接来自销量表、工厂模块库和货盘。</div>
  <div class="metrics">
    <div class="metric"><div class="v" id="m-sku">-</div><div class="l">总 SKU</div></div>
    <div class="metric"><div class="v" id="m-mod">-</div><div class="l">模块</div></div>
    <div class="metric"><div class="v" id="m-cat">-</div><div class="l">品类</div></div>
    <div class="metric"><div class="v" id="m-brand">-</div><div class="l">品牌</div></div>
    <div class="metric"><div class="v" id="m-link">-</div><div class="l">模块↔SKU 关联</div></div>
    <div class="metric"><div class="v" id="m-zero">-</div><div class="l">0 销量 SKU</div></div>
  </div>
</div>

<div class="tabs">
  <div class="tab active" data-tab="category">📦 按品类 <span class="count" id="tc-cat">-</span></div>
  <div class="tab" data-tab="brand">🏷️ 按品牌 <span class="count" id="tc-brand">-</span></div>
  <div class="tab" data-tab="module">🧩 按模块 <span class="count" id="tc-mod">-</span></div>
  <div class="tab" data-tab="zero">⚠️ 未起量 SKU <span class="count" id="tc-zero">-</span></div>
</div>

<div class="filters">
  <label>品牌：</label>
  <select id="f-brand"><option value="">全部</option></select>
  <label>品类：</label>
  <select id="f-cat"><option value="">全部</option></select>
  <label>销量 ≥</label>
  <input type="number" id="f-sales-min" placeholder="0" min="0" style="width:80px;">
  <label>价格 ≥</label>
  <input type="number" id="f-price-min" placeholder="0" min="0" style="width:80px;">
  <label>价格 ≤</label>
  <input type="number" id="f-price-max" placeholder="不限" min="0" style="width:80px;">
  <input type="text" id="f-search" placeholder="🔍 搜货号/货品名/规格" style="flex:1;min-width:200px;">
  <span class="clear" id="f-clear">清空筛选</span>
</div>

<div class="main">
  <div class="panel">
    <h3 id="side-title">选择品类</h3>
    <div class="search-bar" style="margin-bottom:8px;padding:6px 10px;">
      <input type="text" id="side-search" placeholder="筛选左侧列表..." style="font-size:12px;">
    </div>
    <div class="side-list" id="side-list"></div>
  </div>

  <div class="panel">
    <div class="header-info" id="header-info">点击左侧任意项查看详情</div>
    <div class="table-wrap">
      <div id="table-area"></div>
    </div>
  </div>
</div>

</div>

<script>
''' + data_js + '''

// ===== 状态 =====
let currentTab = 'category';
let selectedKey = null;  // 选中的分类/品牌/模块 ID

// ===== 初始化总览数字 =====
const o = DATA.overview;
document.getElementById('m-sku').textContent = o.total_skus.toLocaleString();
document.getElementById('m-mod').textContent = o.total_modules.toLocaleString();
document.getElementById('m-cat').textContent = o.total_categories;
document.getElementById('m-brand').textContent = o.total_brands;
document.getElementById('m-link').textContent = o.total_links.toLocaleString();
document.getElementById('m-zero').textContent = o.zero_skus.toLocaleString();

document.getElementById('tc-cat').textContent = o.total_categories;
document.getElementById('tc-brand').textContent = o.total_brands;
document.getElementById('tc-mod').textContent = o.total_modules;
document.getElementById('tc-zero').textContent = o.zero_skus;

// ===== 填充全局筛选下拉 =====
const fBrand = document.getElementById('f-brand');
o.brands.forEach(([b, n]) => {
  const opt = document.createElement('option');
  opt.value = b; opt.textContent = `${b} (${n})`;
  fBrand.appendChild(opt);
});
const fCat = document.getElementById('f-cat');
o.categories.forEach(([c, n]) => {
  const opt = document.createElement('option');
  opt.value = c; opt.textContent = `${c} (${n})`;
  fCat.appendChild(opt);
});

// ===== Tab 切换 =====
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentTab = t.dataset.tab;
    selectedKey = null;
    renderSide();
    renderRight();
  });
});

// ===== 渲染左侧分组列表 =====
function renderSide() {
  const list = document.getElementById('side-list');
  const title = document.getElementById('side-title');
  list.innerHTML = '';
  const sideSearch = (document.getElementById('side-search').value || '').toLowerCase();

  let items = [];
  if (currentTab === 'category') {
    title.textContent = '选择品类';
    items = o.categories.map(([k, v]) => ({key: k, label: k, num: v}));
  } else if (currentTab === 'brand') {
    title.textContent = '选择品牌';
    items = o.brands.map(([k, v]) => ({key: k, label: k, num: v}));
  } else if (currentTab === 'module') {
    title.textContent = '选择模块';
    items = DATA.modules
      .filter(m => m.reuse > 0 || true)  // 显示所有，包括孤儿
      .sort((a, b) => b.reuse - a.reuse)
      .map(m => ({key: m.id, label: `${m.id} · ${m.name.slice(0, 18)}`, num: m.reuse, type: m.type}));
  } else if (currentTab === 'zero') {
    title.textContent = '未起量 SKU 列表';
    // 这个 tab 直接显示所有未起量，不分组
    list.innerHTML = '<div class="empty">右侧直接显示所有 0 销量 SKU<br>用顶部筛选缩小范围</div>';
    return;
  }

  if (sideSearch) {
    items = items.filter(i => i.label.toLowerCase().includes(sideSearch));
  }

  items.forEach(i => {
    const div = document.createElement('div');
    div.className = 'side-item' + (selectedKey === i.key ? ' selected' : '');
    div.innerHTML = `<span>${i.label}${i.type ? ' <span class="pill pill-type" style="margin-left:4px;">' + i.type + '</span>' : ''}</span><span class="num">${i.num}</span>`;
    div.addEventListener('click', () => {
      selectedKey = i.key;
      renderSide();
      renderRight();
    });
    list.appendChild(div);
  });
}

document.getElementById('side-search').addEventListener('input', renderSide);

// ===== 渲染右侧表格 =====
function renderRight() {
  const headerInfo = document.getElementById('header-info');
  const area = document.getElementById('table-area');

  // 收集筛选条件
  const filterBrand = document.getElementById('f-brand').value;
  const filterCat = document.getElementById('f-cat').value;
  const salesMin = parseInt(document.getElementById('f-sales-min').value) || 0;
  const priceMin = parseInt(document.getElementById('f-price-min').value) || 0;
  const priceMaxRaw = document.getElementById('f-price-max').value;
  const priceMax = priceMaxRaw ? parseInt(priceMaxRaw) : Infinity;
  const search = (document.getElementById('f-search').value || '').toLowerCase();

  function passFilters(p) {
    if (filterBrand && p.brand !== filterBrand) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (p.sales < salesMin) return false;
    if (p.price < priceMin || p.price > priceMax) return false;
    if (search && !((p.product_code + p.product_abbrev + p.name + p.spec).toLowerCase().includes(search))) return false;
    return true;
  }

  if (currentTab === 'module') {
    // 模块视图：左选模块 → 右显示该模块的复用 SKU 列表
    if (!selectedKey) {
      headerInfo.innerHTML = '👈 左侧选一个模块';
      area.innerHTML = '';
      return;
    }
    const mod = DATA.modules.find(m => m.id === selectedKey);
    const moduleLinks = DATA.links.filter(l => l.mid === selectedKey);
    headerInfo.innerHTML = `🧩 <strong>${mod.id}</strong> · ${mod.name} <span class="pill pill-type">${mod.type}</span> <span class="pill">工厂 ${mod.factory}</span> · 复用 <strong>${moduleLinks.length}</strong> 次 · 材料: ${mod.material || '—'}`;

    // 把 link 关联到 product_abbrev → 找 SKU
    const linkedProducts = [];
    const seen = new Set();
    moduleLinks.forEach(l => {
      const abbrev = l.matched_abbrev;
      if (abbrev) {
        DATA.products.forEach(p => {
          if (p.product_abbrev === abbrev && !seen.has(p.code)) {
            if (passFilters(p)) {
              linkedProducts.push({...p, _reuse_position: l.position});
              seen.add(p.code);
            }
          }
        });
      }
    });

    renderTable(area, linkedProducts, true);
    return;
  }

  // 品类/品牌/未起量 视图
  let products = DATA.products.filter(passFilters);

  if (currentTab === 'category' && selectedKey) {
    products = products.filter(p => p.category === selectedKey);
    headerInfo.innerHTML = `📦 品类: <strong>${selectedKey}</strong> · 共 <strong>${products.length}</strong> 个 SKU`;
  } else if (currentTab === 'brand' && selectedKey) {
    products = products.filter(p => p.brand === selectedKey);
    headerInfo.innerHTML = `🏷️ 品牌: <strong>${selectedKey}</strong> · 共 <strong>${products.length}</strong> 个 SKU`;
  } else if (currentTab === 'zero') {
    products = products.filter(p => p.zero);
    headerInfo.innerHTML = `⚠️ 未起量 SKU (实际销售量 = 0) · 共 <strong>${products.length}</strong> 个`;
  } else if (!selectedKey) {
    headerInfo.innerHTML = `👈 左侧选一项，或用顶部筛选缩小范围 · 当前匹配 <strong>${products.length}</strong> 个 SKU`;
  }

  renderTable(area, products, false);
}

function renderTable(area, products, showPosition) {
  if (products.length === 0) {
    area.innerHTML = '<div class="empty">没有匹配的 SKU</div>';
    return;
  }

  // 按销量降序
  products = products.slice().sort((a, b) => b.sales - a.sales);

  // 限制最多 200 行避免渲染卡
  const limited = products.slice(0, 200);
  const more = products.length - limited.length;

  let html = '<table><thead><tr>';
  html += '<th>品牌</th><th>品类</th><th>货品简称</th><th>名称</th><th>规格</th>';
  if (showPosition) html += '<th>复用位置</th>';
  html += '<th class="num">销量</th><th class="num">零售价</th><th class="num">毛利%</th><th>店铺</th>';
  html += '</tr></thead><tbody>';

  limited.forEach(p => {
    const salesClass = p.sales >= 100 ? 'sales-hot' : (p.zero ? 'sales-zero' : '');
    html += `<tr>
      <td><span class="pill pill-brand">${p.brand}</span></td>
      <td><span class="pill pill-cat">${p.category}</span></td>
      <td><code>${p.product_abbrev}</code></td>
      <td>${p.name}</td>
      <td>${p.spec || '—'}</td>`;
    if (showPosition) html += `<td><span class="pill">${p._reuse_position || '—'}</span></td>`;
    html += `<td class="num ${salesClass}">${p.sales}</td>
      <td class="num">${p.price ? '¥' + p.price : '—'}</td>
      <td class="num">${p.margin ? p.margin.toFixed(1) + '%' : '—'}</td>
      <td style="color:#86868b;font-size:11px;">${p.shop}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  if (more > 0) {
    html += `<div style="padding:14px;text-align:center;color:#86868b;font-size:12px;">（仅显示前 200 条；用筛选缩小范围看其余 ${more} 条）</div>`;
  }
  area.innerHTML = html;
}

// 全局筛选事件
['f-brand', 'f-cat', 'f-sales-min', 'f-price-min', 'f-price-max', 'f-search'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderRight);
});
document.getElementById('f-clear').addEventListener('click', () => {
  ['f-brand', 'f-cat'].forEach(id => document.getElementById(id).value = '');
  ['f-sales-min', 'f-price-min', 'f-price-max', 'f-search'].forEach(id => document.getElementById(id).value = '');
  renderRight();
});

// 初次渲染
renderSide();
renderRight();
</script>
</body>
</html>
'''
    return html


if __name__ == "__main__":
    main()
