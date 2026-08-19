#!/usr/bin/env python3
"""Snap! の XML からカスタムブロックの JS 本体と引数名を取り出して JSON にする。"""
import json
import sys
import xml.etree.ElementTree as ET


def extract(path):
    root = ET.parse(path).getroot()
    defs = {}
    for bd in root.iter("block-definition"):
        spec = bd.get("s")
        for blk in bd.iter("block"):
            if blk.get("s") != "reportJSFunction":
                continue
            lst = blk.find("list")
            code_el = blk.find("l")
            if lst is None or code_el is None:
                continue
            args = [x.text.strip() for x in lst.findall("l") if x.text]
            defs[spec] = {"args": args, "code": code_el.text or "", "type": bd.get("type")}
            break
    return defs


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    defs = extract(src)
    json.dump(defs, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(defs)} blocks -> {dst}")
    for k, v in defs.items():
        print(f"  {v['type']:8} {k}  args={v['args']}")
