#!/usr/bin/env python3
"""Generate reproducible, read-only statistics for Harumnesia V1 CSV datasets."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


PLACEHOLDERS = {"-", "?", "n/a", "na", "nan", "none", "null", "unknown"}
CATEGORICAL_COLUMNS = {
    "concentrate",
    "country",
    "gender",
    "is_lokal",
    "situation",
}
NOTE_COLUMNS = {
    "base",
    "base notes",
    "middle",
    "mid notes",
    "notes",
    "top",
    "top notes",
}


def decode_csv(path: Path) -> tuple[str, str]:
    data = path.read_bytes()
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Unable to decode {path}")


def normalize_text(value: str) -> str:
    return " ".join(value.casefold().strip().split())


def variant_key(value: str) -> str:
    return "".join(character for character in normalize_text(value) if character.isalnum())


def infer_type(values: list[str]) -> str:
    non_missing = [value.strip() for value in values if not is_missing(value)]
    if not non_missing:
        return "unknown"
    if all(value.casefold() in {"true", "false"} for value in non_missing):
        return "boolean"
    if all(re.fullmatch(r"[-+]?\d+", value) for value in non_missing):
        return "integer"
    if all(re.fullmatch(r"[-+]?\d+(?:[.,]\d+)?", value) for value in non_missing):
        return "decimal-string"
    if all(urlparse(value).scheme in {"http", "https"} for value in non_missing):
        return "url"
    return "string"


def is_missing(value: str | None) -> bool:
    if value is None:
        return True
    normalized = normalize_text(value)
    return normalized == "" or normalized in PLACEHOLDERS


def ordered_examples(values: list[str], limit: int = 5) -> list[str]:
    examples: list[str] = []
    seen: set[str] = set()
    for value in values:
        stripped = value.strip()
        if stripped and stripped not in seen:
            examples.append(stripped)
            seen.add(stripped)
        if len(examples) == limit:
            break
    return examples


def column_statistics(rows: list[dict[str, str | None]], column: str) -> dict[str, Any]:
    raw_values = [row.get(column) for row in rows]
    values = [value if value is not None else "" for value in raw_values]
    null_count = sum(value is None for value in raw_values)
    blank_count = sum(value is not None and value.strip() == "" for value in raw_values)
    placeholder_count = sum(
        value is not None and normalize_text(value) in PLACEHOLDERS for value in raw_values
    )
    missing_count = null_count + blank_count + placeholder_count
    trimmed_non_blank = [value.strip() for value in values if value.strip()]
    frequencies = Counter(trimmed_non_blank)
    normalized_frequencies = Counter(normalize_text(value) for value in trimmed_non_blank)
    result: dict[str, Any] = {
        "inferred_type": infer_type(values),
        "null_count": null_count,
        "blank_count": blank_count,
        "placeholder_count": placeholder_count,
        "missing_count": missing_count,
        "missing_percentage": round(missing_count / len(rows) * 100, 4) if rows else 0,
        "unique_count": len(frequencies),
        "normalized_unique_count": len(normalized_frequencies),
        "leading_whitespace_count": sum(
            value is not None and value != value.lstrip() for value in raw_values
        ),
        "trailing_whitespace_count": sum(
            value is not None and value != value.rstrip() for value in raw_values
        ),
        "zero_width_space_count": sum("\u200b" in value for value in values),
        "c1_control_character_count": sum(
            any(0x80 <= ord(character) <= 0x9F for character in value)
            for value in values
        ),
        "examples": ordered_examples(values),
        "top_values": [
            {"value": value, "count": count}
            for value, count in frequencies.most_common(20)
        ],
    }
    if normalize_text(column) in CATEGORICAL_COLUMNS or len(frequencies) <= 50:
        result["all_values"] = [
            {"value": value, "count": count}
            for value, count in sorted(frequencies.items(), key=lambda item: (-item[1], item[0]))
        ]
    return result


def duplicate_statistics(rows: list[dict[str, str | None]], columns: list[str]) -> dict[str, Any]:
    exact_counter = Counter(
        tuple((row.get(column) or "").strip() for column in columns) for row in rows
    )

    lower_columns = {normalize_text(column): column for column in columns}
    perfume_column = lower_columns.get("perfume")
    brand_column = lower_columns.get("brand")
    id_column = lower_columns.get("id_perfume")

    def key_stats(selected_columns: list[str]) -> dict[str, int]:
        if not selected_columns:
            return {"duplicate_rows": 0, "duplicate_groups": 0}
        counter = Counter(
            tuple(normalize_text(row.get(column) or "") for column in selected_columns)
            for row in rows
        )
        counter.pop(tuple("" for _ in selected_columns), None)
        duplicates = [count for count in counter.values() if count > 1]
        return {
            "duplicate_rows": sum(count - 1 for count in duplicates),
            "duplicate_groups": len(duplicates),
        }

    exact_duplicates = [count for count in exact_counter.values() if count > 1]
    result: dict[str, Any] = {
        "exact_duplicate_rows": sum(count - 1 for count in exact_duplicates),
        "exact_duplicate_groups": len(exact_duplicates),
        "perfume_name": key_stats([perfume_column] if perfume_column else []),
        "perfume_brand": key_stats(
            [column for column in (perfume_column, brand_column) if column]
        ),
        "id": key_stats([id_column] if id_column else []),
    }
    return result


def naming_variants(rows: list[dict[str, str | None]], column: str | None) -> list[dict[str, Any]]:
    if not column:
        return []
    groups: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        value = (row.get(column) or "").strip()
        if value:
            groups[variant_key(value)][value] += 1
    variants = []
    for key, forms in groups.items():
        if len(forms) > 1:
            variants.append(
                {
                    "normalization_key": key,
                    "forms": [
                        {"value": value, "count": count}
                        for value, count in forms.most_common()
                    ],
                }
            )
    return sorted(variants, key=lambda item: item["normalization_key"])


def price_statistics(rows: list[dict[str, str | None]], columns: list[str]) -> dict[str, Any] | None:
    price_column = next(
        (column for column in columns if normalize_text(column) == "price"), None
    )
    if not price_column:
        return None
    values = [(row.get(price_column) or "").strip() for row in rows]
    parsed: list[int] = []
    invalid: Counter[str] = Counter()
    format_patterns: Counter[str] = Counter()
    for value in values:
        if not value:
            continue
        if re.fullmatch(r"\d+", value):
            format_patterns["digits-only"] += 1
            parsed.append(int(value))
        elif re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", value):
            format_patterns["thousands-separated"] += 1
            parsed.append(int(value.replace(".", "").replace(",", "")))
        else:
            format_patterns["other"] += 1
            invalid[value] += 1
    sorted_values = sorted(parsed)
    percentile = lambda ratio: sorted_values[round((len(sorted_values) - 1) * ratio)]
    return {
        "column": price_column,
        "parsed_count": len(parsed),
        "invalid_count": sum(invalid.values()),
        "invalid_values": [
            {"value": value, "count": count} for value, count in invalid.most_common(20)
        ],
        "format_patterns": dict(format_patterns),
        "zero_count": sum(value == 0 for value in parsed),
        "negative_count": sum(value < 0 for value in parsed),
        "minimum": min(parsed) if parsed else None,
        "p25": percentile(0.25) if parsed else None,
        "median": percentile(0.5) if parsed else None,
        "p75": percentile(0.75) if parsed else None,
        "p95": percentile(0.95) if parsed else None,
        "maximum": max(parsed) if parsed else None,
    }


def token_statistics(
    rows: list[dict[str, str | None]], columns: list[str], selected_columns: list[str]
) -> dict[str, Any] | None:
    if not selected_columns:
        return None
    token_forms: dict[str, Counter[str]] = defaultdict(Counter)
    token_counts: Counter[str] = Counter()
    duplicate_tokens_within_rows = 0
    punctuation_terminated_tokens = 0
    total_tokens = 0
    missing_by_column: dict[str, int] = {}
    for column in selected_columns:
        missing_by_column[column] = sum(is_missing(row.get(column)) for row in rows)
    for row in rows:
        row_tokens: list[str] = []
        for column in selected_columns:
            value = row.get(column) or ""
            if is_missing(value):
                continue
            for token in value.split(","):
                stripped = token.strip()
                if not stripped:
                    continue
                total_tokens += 1
                if stripped.endswith((".", ";", ":")):
                    punctuation_terminated_tokens += 1
                normalized = normalize_text(stripped.strip(" .;:"))
                if normalized:
                    row_tokens.append(normalized)
                    token_counts[normalized] += 1
                    token_forms[normalized][stripped] += 1
        duplicate_tokens_within_rows += len(row_tokens) - len(set(row_tokens))
    casing_or_punctuation_variants = [
        {
            "normalized": token,
            "forms": [
                {"value": value, "count": count}
                for value, count in forms.most_common()
            ],
        }
        for token, forms in token_forms.items()
        if len(forms) > 1
    ]
    return {
        "columns": selected_columns,
        "missing_by_column": missing_by_column,
        "total_tokens": total_tokens,
        "unique_normalized_tokens": len(token_counts),
        "duplicate_tokens_within_rows": duplicate_tokens_within_rows,
        "punctuation_terminated_tokens": punctuation_terminated_tokens,
        "top_tokens": [
            {"value": value, "count": count}
            for value, count in token_counts.most_common(30)
        ],
        "variant_group_count": len(casing_or_punctuation_variants),
        "variant_examples": casing_or_punctuation_variants[:30],
    }


def image_statistics(rows: list[dict[str, str | None]], columns: list[str]) -> dict[str, Any] | None:
    image_column = next(
        (column for column in columns if normalize_text(column) == "image"), None
    )
    url_column = next(
        (column for column in columns if normalize_text(column) == "url"), None
    )
    selected = image_column or url_column
    if not selected:
        return None
    values = [(row.get(selected) or "").strip() for row in rows]
    non_blank = [value for value in values if value]
    frequencies = Counter(non_blank)
    domains = Counter(
        urlparse(value).netloc.casefold()
        for value in non_blank
        if urlparse(value).scheme in {"http", "https"}
    )
    return {
        "column": selected,
        "blank_count": sum(not value for value in values),
        "external_url_count": sum(
            urlparse(value).scheme in {"http", "https"} for value in non_blank
        ),
        "local_reference_count": sum(
            urlparse(value).scheme not in {"http", "https"} for value in non_blank
        ),
        "duplicate_reference_rows": sum(count - 1 for count in frequencies.values() if count > 1),
        "duplicate_reference_groups": sum(count > 1 for count in frequencies.values()),
        "query_string_count": sum("?" in value for value in non_blank),
        "recognized_image_extension_count": sum(
            urlparse(value).path.casefold().endswith((".avif", ".jpeg", ".jpg", ".png", ".webp"))
            for value in non_blank
        ),
        "domains": dict(domains.most_common()),
    }


def audit_file(path: Path, source_root: Path) -> tuple[dict[str, Any], set[tuple[str, str]]]:
    text, encoding = decode_csv(path)
    sample = text[:16384]
    dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    reader = csv.DictReader(io.StringIO(text, newline=""), dialect=dialect)
    rows = list(reader)
    columns = reader.fieldnames or []
    lower_columns = {normalize_text(column): column for column in columns}
    perfume_column = lower_columns.get("perfume")
    brand_column = lower_columns.get("brand")
    record_keys = {
        (
            normalize_text(row.get(perfume_column) or ""),
            normalize_text(row.get(brand_column) or ""),
        )
        for row in rows
        if perfume_column and brand_column
    }
    record_keys.discard(("", ""))

    note_columns = [
        column for column in columns if normalize_text(column) in NOTE_COLUMNS
    ]
    accord_columns = [
        column for column in columns if "accord" in normalize_text(column)
    ]

    audit = {
        "path": path.relative_to(source_root).as_posix(),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "size_bytes": path.stat().st_size,
        "encoding": encoding,
        "delimiter": dialect.delimiter,
        "row_count": len(rows),
        "column_count": len(columns),
        "columns": columns,
        "column_statistics": {
            column: column_statistics(rows, column) for column in columns
        },
        "duplicates": duplicate_statistics(rows, columns),
        "brand_naming_variants": naming_variants(rows, brand_column),
        "perfume_naming_variants": naming_variants(rows, perfume_column),
        "price": price_statistics(rows, columns),
        "notes": token_statistics(rows, columns, note_columns),
        "accords": token_statistics(rows, columns, accord_columns),
        "images_or_urls": image_statistics(rows, columns),
    }
    return audit, record_keys


def pairwise_relationships(keys_by_path: dict[str, set[tuple[str, str]]]) -> list[dict[str, Any]]:
    paths = sorted(keys_by_path)
    relationships = []
    for index, left_path in enumerate(paths):
        for right_path in paths[index + 1 :]:
            left = keys_by_path[left_path]
            right = keys_by_path[right_path]
            relationships.append(
                {
                    "left": left_path,
                    "right": right_path,
                    "left_unique_keys": len(left),
                    "right_unique_keys": len(right),
                    "overlap": len(left & right),
                    "left_only": len(left - right),
                    "right_only": len(right - left),
                }
            )
    return relationships


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Path to the V1 ML repository")
    parser.add_argument("--output", type=Path, help="Optional JSON output path")
    args = parser.parse_args()

    source_root = args.source.resolve()
    dataset_root = source_root / "Dataset"
    if not dataset_root.is_dir():
        raise SystemExit(f"Dataset directory not found: {dataset_root}")

    audits = []
    keys_by_path: dict[str, set[tuple[str, str]]] = {}
    for path in sorted(dataset_root.rglob("*.csv")):
        audit, keys = audit_file(path, source_root)
        audits.append(audit)
        keys_by_path[audit["path"]] = keys

    result = {
        "source_repository": source_root.name,
        "dataset_count": len(audits),
        "datasets": audits,
        "pairwise_record_key_relationships": pairwise_relationships(keys_by_path),
    }
    rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8", newline="\n")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
