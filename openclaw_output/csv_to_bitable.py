#!/usr/bin/env python3
"""Convert CSV to Feishu Bitable batch_create JSON and print curl commands."""

import csv
import json
import datetime
import sys
import os

BASE_DIR = "/root/.openclaw/workspace/projects/tmt-product-initiative-specialist"

def parse_date_to_ms(date_str):
    """Convert date string like '2026/5/21' or '2026-05-21' to milliseconds timestamp."""
    if not date_str:
        return None
    for fmt in ["%Y/%m/%d", "%Y-%m-%d", "%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M"]:
        try:
            dt = datetime.datetime.strptime(date_str.strip(), fmt)
            return int(dt.timestamp() * 1000)
        except ValueError:
            continue
    return None

def convert_07_seed():
    """Convert 07_module_library_intake_seed.csv to records."""
    records = []
    path = os.path.join(BASE_DIR, "feishu_import", "07_module_library_intake_seed.csv")
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fields = {}
            if row.get("临时编号"):
                fields["临时编号"] = row["临时编号"]
            if row.get("模块名"):
                fields["模块名"] = row["模块名"]
            if row.get("模块维度"):
                fields["模块维度"] = row["模块维度"]
            if row.get("归属品牌"):
                brands = [b.strip() for b in row["归属品牌"].split("/") if b.strip()]
                fields["归属品牌"] = brands
            if row.get("一句话说明"):
                fields["一句话说明"] = row["一句话说明"]
            if row.get("来源SKU"):
                fields["来源SKU"] = row["来源SKU"]
            if row.get("状态"):
                fields["状态"] = row["状态"]
            if row.get("关键参数"):
                fields["关键参数"] = row["关键参数"]
            if row.get("适用品类"):
                cats = [c.strip() for c in row["适用品类"].split("/") if c.strip()]
                fields["适用品类"] = cats
            if row.get("不适用场景"):
                fields["不适用场景"] = row["不适用场景"]
            # 负责人: 人员字段需要 open_id，暂不填
            if row.get("建议归入维度"):
                fields["建议归入维度"] = row["建议归入维度"]
            if row.get("收集来源"):
                fields["收集来源"] = row["收集来源"]
            ms = parse_date_to_ms(row.get("收集时间", ""))
            if ms:
                fields["收集时间"] = ms
            if row.get("确认状态"):
                fields["确认状态"] = row["确认状态"]
            records.append({"fields": fields})
    return records

def convert_08_pallet():
    """Convert 08_pallet_flat.csv to records."""
    records = []
    path = os.path.join(BASE_DIR, "feishu_import", "08_pallet_flat.csv")
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fields = {}
            if row.get("品类"):
                fields["品类"] = row["品类"]
            if row.get("二级品类"):
                fields["二级品类"] = row["二级品类"]
            if row.get("版型(细分品类)"):
                fields["版型(细分品类)"] = row["版型(细分品类)"]
            if row.get("代际"):
                fields["代际"] = row["代际"]
            if row.get("品牌"):
                fields["品牌"] = row["品牌"]
            if row.get("货号"):
                fields["货号"] = row["货号"]
            if row.get("销量"):
                fields["销量"] = row["销量"]
            if row.get("状态"):
                fields["状态"] = row["状态"]
            if row.get("本代升级情况"):
                fields["本代升级情况"] = row["本代升级情况"]
            if row.get("细分品类后续升级思路"):
                fields["细分品类后续升级思路"] = row["细分品类后续升级思路"]
            # 竞品参考链接: URL 字段，可能有多个用 | 分隔，取第一个
            links = row.get("竞品参考链接", "").strip()
            if links:
                first_link = links.split("|")[0].strip()
                if first_link.startswith("http"):
                    fields["竞品参考链接"] = {"link": first_link, "text": first_link}
            if row.get("数据来源"):
                fields["数据来源"] = row["数据来源"]
            if row.get("数据来源sheet"):
                fields["数据来源sheet"] = row["数据来源sheet"]
            records.append({"fields": fields})
    return records

if __name__ == "__main__":
    print("=== 07 模块库种子数据 ===")
    records_07 = convert_07_seed()
    print(f"共 {len(records_07)} 条记录")
    # 分批，每批最多 500 条
    batch_size = 500
    for i in range(0, len(records_07), batch_size):
        batch = records_07[i:i+batch_size]
        print(f"\n--- 批次 {i//batch_size + 1} ({len(batch)} 条) ---")
        print(json.dumps(batch, ensure_ascii=False, indent=2))
    
    print("\n=== 08 货品池数据 ===")
    records_08 = convert_08_pallet()
    print(f"共 {len(records_08)} 条记录")
    for i in range(0, len(records_08), batch_size):
        batch = records_08[i:i+batch_size]
        print(f"\n--- 批次 {i//batch_size + 1} ({len(batch)} 条) ---")
        print(json.dumps(batch, ensure_ascii=False, indent=2))
