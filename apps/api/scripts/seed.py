#!/usr/bin/env python3
"""Seed D1 dari output pipeline V2 (data/perfumes.json + data/taxonomy/*.json).

Menulis SQL ke seed/*.sql, dipecah per chunk biar `wrangler d1 execute --file` aman.

Pakai:
    python scripts/seed.py                    # baca D:/repos/harumnesia/data
    HARUMNESIA_DATA_DIR=<path> python scripts/seed.py
"""
import json
import os
import pathlib
import sys

DATA_DIR = pathlib.Path(
    os.environ.get("HARUMNESIA_DATA_DIR", pathlib.Path(__file__).resolve().parents[3] / "data")
)
OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "seed"
CHUNK = 25          # baris per statement INSERT (statement D1 maks ~100 KB)
CHUNKS_PER_FILE = 200


def sql_str(value):
    """Literal string SQL yang aman (quote di-escape), atau NULL."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def build_rows():
    perfumes = json.loads((DATA_DIR / "perfumes.json").read_text(encoding="utf-8"))
    runtime = {p["id"]: p for p in json.loads((DATA_DIR / "runtime" / "recommendation.json").read_text(encoding="utf-8"))}
    for p in perfumes:
        lp = runtime.get(p["id"])
        if lp is None:
            raise SystemExit(f"id {p['id']} tidak ada di runtime/recommendation.json — jalankan dataset:build di repo V2 dulu")
        price = p.get("price") or {}
        conc = (p.get("concentration") or {}).get("value")
        yield "({},{},{},{},{},{},{},{},{},{})".format(
            sql_str(p["id"]),
            sql_str(p["name"]),
            sql_str(p["brand"]),
            sql_str(p["market"]),
            sql_str(p["gender"]),
            sql_str(conc),
            sql_str(price.get("amount")),
            sql_str(price.get("currency")),
            sql_str(json.dumps(lp, ensure_ascii=False, separators=(",", ":"))),
            sql_str(json.dumps(p, ensure_ascii=False, separators=(",", ":"))),
        )


def write_chunks():
    OUT_DIR.mkdir(exist_ok=True)
    for old in OUT_DIR.glob("*.sql"):
        old.unlink()
    cols = "(id,name,brand,market,gender,concentration,price_amount,price_currency,payload_list,payload_detail)"
    n, file_no, statements, buf = 0, 0, [], []

    def flush_file():
        nonlocal file_no, statements
        if not statements:
            return
        file_no += 1
        (OUT_DIR / f"seed-{file_no:03d}.sql").write_text("\n".join(statements) + "\n", encoding="utf-8")
        statements = []

    for row in build_rows():
        buf.append(row)
        n += 1
        if len(buf) == CHUNK:
            statements.append(f"INSERT OR REPLACE INTO perfume {cols} VALUES\n" + ",\n".join(buf) + ";")
            buf = []
            if len(statements) == CHUNKS_PER_FILE:
                flush_file()
    if buf:
        statements.append(f"INSERT OR REPLACE INTO perfume {cols} VALUES\n" + ",\n".join(buf) + ";")
    flush_file()
    return n, file_no


def write_taxonomy():
    tax = {}
    for name in ("notes", "accords", "genders", "concentrations"):
        tax[name] = json.loads((DATA_DIR / "taxonomy" / f"{name}.json").read_text(encoding="utf-8"))
    payload = json.dumps(tax, ensure_ascii=False, separators=(",", ":"))
    (OUT_DIR / "taxonomy.sql").write_text(
        "INSERT OR REPLACE INTO meta (key,value) VALUES ('taxonomy'," + sql_str(payload) + ");\n", encoding="utf-8"
    )


def write_brands_and_stats():
    """BE-03: tabel brand materialized + statistik di meta (agar endpoint tidak COUNT(*) tiap request)."""
    perfumes = json.loads((DATA_DIR / "perfumes.json").read_text(encoding="utf-8"))
    counts = {}
    for p in perfumes:
        counts[p["brand"]] = counts.get(p["brand"], 0) + 1
    rows = sorted(counts.items(), key=lambda kv: kv[0])
    stmts = []
    for i in range(0, len(rows), CHUNK):
        values = ",".join(f"({sql_str(b)},{c})" for b, c in rows[i : i + CHUNK])
        stmts.append(f"INSERT OR REPLACE INTO brand (name,count) VALUES {values};")
    stats = json.dumps({"perfumeCount": len(perfumes), "brandCount": len(rows)}, separators=(",", ":"))
    stmts.append(f"INSERT OR REPLACE INTO meta (key,value) VALUES ('stats',{sql_str(stats)});")
    (OUT_DIR / "stats.sql").write_text("\n".join(stmts) + "\n", encoding="utf-8")
    return len(rows)


if __name__ == "__main__":
    if not (DATA_DIR / "perfumes.json").exists():
        sys.exit(f"Tidak ditemukan {DATA_DIR / 'perfumes.json'}")
    total, chunks = write_chunks()
    write_taxonomy()
    brands = write_brands_and_stats()
    size = sum(f.stat().st_size for f in OUT_DIR.glob("*.sql"))
    print(f"OK: {total} parfum -> {chunks} chunk + taxonomy.sql + stats.sql ({brands} brand) di {OUT_DIR} ({size/1e6:.1f} MB)")
