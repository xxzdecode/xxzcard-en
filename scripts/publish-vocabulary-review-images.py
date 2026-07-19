#!/usr/bin/env python3
"""Batch-prepare and finalize vocabulary-review image releases.

The prepare phase processes every pending batch as one release but deliberately
does not run Git or mark manifests completed. The finalize phase verifies the
prepared files and the pushed remote-tracking ref before updating local batch
status files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4


PLAN_SCHEMA_VERSION = 1
DEFAULT_QUALITY = 85
DEFAULT_MAX_SIZE = 1024
INCOMING_RELATIVE = Path("_incoming/vocabulary-review-images")
PLAN_FILENAME = "publish-plan.json"
PREVIEW_FILENAME = "publish-preview.jpg"
DATA_RELATIVE = Path("js/vocabularyReviewData.js")
SERVICE_WORKER_RELATIVE = Path("service-worker.js")
ASSET_DIRECTORY_RELATIVE = Path("assets/vocabulary-review")
SAFE_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FULL_SHA = re.compile(r"^[0-9a-f]{40}$")


class PublishError(RuntimeError):
    """An expected validation or publication failure."""


@dataclass(frozen=True)
class BatchItem:
    word: str
    filename: str
    meaning: str
    slug: str
    source_path: Path


@dataclass(frozen=True)
class Batch:
    directory: Path
    manifest_path: Path
    manifest: dict[str, Any]
    items: tuple[BatchItem, ...]


def fail(message: str) -> None:
    raise PublishError(message)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        fail(f"{label}不存在：{path}")
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        fail(f"{label}不是有效 UTF-8 JSON：{path}（{error}）")
    if not isinstance(value, dict):
        fail(f"{label}必须是 JSON 对象：{path}")
    return value


def require_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label}不能为空")
    return value.strip()


def parse_created_at(value: Any, manifest_path: Path) -> datetime:
    text = require_text(value, f"createdAt（{manifest_path}）")
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        fail(f"createdAt 不是有效 ISO 时间：{text}（{manifest_path}）")
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        fail(f"createdAt 必须包含时区：{text}（{manifest_path}）")
    return parsed


def batch_number(name: str) -> int:
    match = re.search(r"第([一二三四五六七八九十\d]+)批", name)
    if not match:
        return 999
    token = match.group(1)
    if token.isdigit():
        return int(token)
    values = {
        "一": 1,
        "二": 2,
        "三": 3,
        "四": 4,
        "五": 5,
        "六": 6,
        "七": 7,
        "八": 8,
        "九": 9,
        "十": 10,
    }
    return values.get(token, 999)


def decode_zip_member(name: str, flag_bits: int) -> str:
    """Repair UTF-8 filenames stored without ZIP's UTF-8 flag."""
    if flag_bits & 0x800:
        return name
    try:
        repaired = name.encode("cp437").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name
    return repaired


def extract_zip_safely(source: Path, destination: Path) -> None:
    try:
        archive = zipfile.ZipFile(source)
    except (FileNotFoundError, zipfile.BadZipFile) as error:
        fail(f"ZIP 无法读取：{source}（{error}）")
    destination = destination.resolve()
    seen_targets: set[str] = set()
    with archive:
        for info in archive.infolist():
            member_name = decode_zip_member(info.filename, info.flag_bits)
            member_path = Path(member_name.replace("\\", "/"))
            if member_path.is_absolute() or ".." in member_path.parts:
                fail(f"ZIP 含不安全路径：{member_name}")
            target_key = member_path.as_posix().casefold().rstrip("/")
            if target_key in seen_targets:
                fail(f"ZIP 含重复或大小写冲突路径：{member_name}")
            seen_targets.add(target_key)
            target = (destination / member_path).resolve()
            if target != destination and destination not in target.parents:
                fail(f"ZIP 路径越出解压目录：{member_name}")
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source_handle, target.open("wb") as target_handle:
                shutil.copyfileobj(source_handle, target_handle)


def find_batch_root(source: Path) -> Path:
    source = source.resolve()
    nested = source / "vocabulary-review-images"
    if nested.is_dir():
        return nested
    if source.is_dir():
        return source
    fail(f"未找到批次根目录：{source}")


def validate_manifest(directory: Path) -> Batch:
    manifest_path = directory / "manifest.json"
    manifest = read_json(manifest_path, "manifest.json")
    require_text(manifest.get("batchName"), f"batchName（{manifest_path}）")
    require_text(manifest.get("sourceWordbook"), f"sourceWordbook（{manifest_path}）")
    parse_created_at(manifest.get("createdAt"), manifest_path)
    status = require_text(manifest.get("status"), f"status（{manifest_path}）")
    if status not in {"pending", "completed"}:
        fail(f"status 只能是 pending 或 completed：{manifest_path}")
    raw_items = manifest.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        fail(f"items 必须是非空数组：{manifest_path}")

    items: list[BatchItem] = []
    seen_words: set[str] = set()
    seen_slugs: set[str] = set()
    for index, raw_item in enumerate(raw_items, start=1):
        if not isinstance(raw_item, dict):
            fail(f"items[{index}] 必须是对象：{manifest_path}")
        word = require_text(raw_item.get("word"), f"items[{index}].word")
        filename = require_text(raw_item.get("filename"), f"items[{index}].filename")
        meaning = require_text(raw_item.get("meaning"), f"items[{index}].meaning")
        filename_path = Path(filename)
        if filename_path.name != filename or filename_path.is_absolute():
            fail(f"filename 必须是 images/ 下的单个文件名：{filename}")
        slug = filename_path.stem.lower()
        if not SAFE_SLUG.fullmatch(slug):
            fail(f"图片 slug 只能包含小写字母、数字和连字符：{slug}")
        if word.casefold() in seen_words:
            fail(f"批次内单词重复：{word}（{manifest_path}）")
        if slug in seen_slugs:
            fail(f"批次内图片 slug 重复：{slug}（{manifest_path}）")
        seen_words.add(word.casefold())
        seen_slugs.add(slug)
        image_path = directory / "images" / filename
        if not image_path.is_file():
            fail(f"清单图片不存在：{image_path}")
        items.append(BatchItem(word, filename, meaning, slug, image_path))

    return Batch(directory, manifest_path, manifest, tuple(items))


def collect_batches(root: Path) -> list[Batch]:
    if not root.is_dir():
        fail(f"批次目录不存在：{root}")
    batches: list[Batch] = []
    for directory in sorted(path for path in root.iterdir() if path.is_dir()):
        if (directory / "manifest.json").is_file():
            batches.append(validate_manifest(directory))
    if not batches:
        fail(f"未找到含 manifest.json 的批次：{root}")
    return batches


def batch_identity(manifest: dict[str, Any]) -> dict[str, Any]:
    return {
        "batchName": manifest.get("batchName"),
        "sourceWordbook": manifest.get("sourceWordbook"),
        "createdAt": manifest.get("createdAt"),
        "items": manifest.get("items"),
    }


def merge_batch_into_incoming(source_batch: Batch, incoming_root: Path) -> Path:
    target = incoming_root / source_batch.directory.name
    if not target.exists():
        shutil.copytree(source_batch.directory, target)
        return target
    target_batch = validate_manifest(target)
    if batch_identity(source_batch.manifest) != batch_identity(target_batch.manifest):
        fail(f"同名批次清单冲突，未覆盖：{target}")
    for item in source_batch.items:
        target_image = target / "images" / item.filename
        if not target_image.is_file() or sha256_file(item.source_path) != sha256_file(target_image):
            fail(f"同名批次图片冲突，未覆盖：{target_image}")
    return target


def import_source(
    source: Path, incoming_root: Path, temporary_root: Path, *, merge: bool = True
) -> list[Path]:
    if source.suffix.lower() == ".zip":
        extracted = temporary_root / "extracted"
        extracted.mkdir(parents=True)
        extract_zip_safely(source, extracted)
        source_root = find_batch_root(extracted)
    else:
        source_root = find_batch_root(source)

    source_batches = collect_batches(source_root)
    if not merge:
        return [batch.directory for batch in source_batches]
    incoming_root.mkdir(parents=True, exist_ok=True)
    if source_root.resolve() == incoming_root.resolve():
        return [batch.directory for batch in source_batches]
    return [merge_batch_into_incoming(batch, incoming_root) for batch in source_batches]


def load_pillow() -> tuple[Any, Any, Any]:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        fail("prepare 需要 Pillow：请使用 Codex 工作区 Python，或运行 python -m pip install Pillow")
    return Image, ImageDraw, ImageFont


def validate_and_convert_images(
    batches: Iterable[Batch], output_root: Path, max_size: int, quality: int
) -> dict[str, Path]:
    Image, _, _ = load_pillow()
    converted: dict[str, Path] = {}
    seen_words: dict[str, Path] = {}
    seen_slugs: dict[str, Path] = {}
    output_root.mkdir(parents=True, exist_ok=True)

    for batch in batches:
        for item in batch.items:
            word_key = item.word.casefold()
            if word_key in seen_words:
                fail(f"跨批次单词重复：{item.word}（{seen_words[word_key]} / {batch.manifest_path}）")
            if item.slug in seen_slugs:
                fail(f"跨批次 slug 重复：{item.slug}（{seen_slugs[item.slug]} / {batch.manifest_path}）")
            seen_words[word_key] = batch.manifest_path
            seen_slugs[item.slug] = batch.manifest_path
            try:
                with Image.open(item.source_path) as image:
                    image.verify()
                with Image.open(item.source_path) as image:
                    if image.width != image.height:
                        fail(f"图片不是正方形：{item.source_path}（{image.width}x{image.height}）")
                    destination = output_root / f"{item.slug}.webp"
                    if (
                        image.format == "WEBP"
                        and max(image.size) <= max_size
                        and image.mode in {"RGB", "RGBA"}
                    ):
                        destination.write_bytes(item.source_path.read_bytes())
                    else:
                        if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
                            rgba = image.convert("RGBA")
                            background = Image.new("RGBA", rgba.size, "white")
                            background.alpha_composite(rgba)
                            converted_image = background.convert("RGB")
                        else:
                            converted_image = image.convert("RGB")
                        if max(converted_image.size) > max_size:
                            converted_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                        converted_image.save(destination, "WEBP", quality=quality, method=6)
            except PublishError:
                raise
            except Exception as error:
                fail(f"图片无法读取或转换：{item.source_path}（{error}）")
            converted[item.slug] = destination
    return converted


def create_preview(batches: Iterable[Batch], destination: Path) -> None:
    Image, ImageDraw, ImageFont = load_pillow()
    entries = [(batch, item) for batch in batches for item in batch.items]
    columns = 5
    cell = 220
    label_height = 28
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell, rows * (cell + label_height)), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (_, item) in enumerate(entries):
        with Image.open(item.source_path) as image:
            thumbnail = image.convert("RGB")
            thumbnail.thumbnail((cell, cell), Image.Resampling.LANCZOS)
        column = index % columns
        row = index // columns
        x = column * cell + (cell - thumbnail.width) // 2
        y = row * (cell + label_height) + (cell - thumbnail.height) // 2
        sheet.paste(thumbnail, (x, y))
        draw.text((column * cell + 6, row * (cell + label_height) + cell + 6), item.slug, fill="black", font=font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "JPEG", quality=90)


def update_data_file(source: str, batches: Iterable[Batch]) -> str:
    updated = source
    for batch in batches:
        for item in batch.items:
            object_pattern = re.compile(
                r"\{[^{}]*?\bword:\s*'" + re.escape(item.word) + r"'[^{}]*?\}", re.DOTALL
            )
            matches = list(object_pattern.finditer(updated))
            if len(matches) != 1:
                fail(f"数据文件中单词 {item.word!r} 应恰好出现一次，实际 {len(matches)} 次")
            object_text = matches[0].group(0)
            image_pattern = re.compile(r"\bimage:\s*'[^']*'")
            image_matches = list(image_pattern.finditer(object_text))
            if len(image_matches) != 1:
                fail(f"数据文件中单词 {item.word!r} 的 image 字段应恰好出现一次")
            desired = f"image: 'assets/vocabulary-review/{item.slug}.webp'"
            new_object = image_pattern.sub(desired, object_text, count=1)
            updated = updated[: matches[0].start()] + new_object + updated[matches[0].end() :]
    return updated


def update_service_worker(source: str, asset_paths: list[str]) -> tuple[str, str, str]:
    cache_pattern = re.compile(
        r"const VOCABULARY_REVIEW_CACHE = 'vocabulary-review-v(\d+)';"
    )
    cache_matches = list(cache_pattern.finditer(source))
    if len(cache_matches) != 1:
        fail("service-worker.js 中必须恰好有一个 vocabulary-review-vN 缓存版本")
    old_version = int(cache_matches[0].group(1))
    old_cache = f"vocabulary-review-v{old_version}"
    new_cache = f"vocabulary-review-v{old_version + 1}"
    updated = cache_pattern.sub(
        f"const VOCABULARY_REVIEW_CACHE = '{new_cache}';", source, count=1
    )

    assets_pattern = re.compile(
        r"(const VOCABULARY_REVIEW_ASSETS = \[\r?\n)([\s\S]*?)(\r?\n\];)"
    )
    match = assets_pattern.search(updated)
    if not match:
        fail("service-worker.js 中未找到 VOCABULARY_REVIEW_ASSETS 数组")
    body = match.group(2)
    existing = set(re.findall(r"['\"](\./[^'\"]+)['\"]", body))
    missing = [path for path in asset_paths if path not in existing]
    if missing:
        lines = body.rstrip().splitlines()
        if lines and not lines[-1].rstrip().endswith(","):
            lines[-1] = lines[-1] + ","
        lines.extend(
            f"  '{path}'{',' if index < len(missing) - 1 else ''}"
            for index, path in enumerate(missing)
        )
        new_body = "\n".join(lines)
        updated = updated[: match.start(2)] + new_body + updated[match.end(2) :]
    return updated, old_cache, new_cache


def git_output(repo_root: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=repo_root,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        fail(f"Git 命令失败：git {' '.join(arguments)}\n{result.stderr.strip()}")
    return result.stdout.strip()


def ensure_git_clean_for(repo_root: Path, relative_paths: Iterable[Path]) -> None:
    for relative in relative_paths:
        output = git_output(repo_root, "status", "--porcelain=v1", "--", relative.as_posix())
        if output:
            fail(f"待修改文件已有未提交改动，请先处理：{relative.as_posix()}")


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_bytes(data)
    temporary.replace(path)


def transactional_write(outputs: dict[Path, bytes]) -> None:
    originals = {path: path.read_bytes() if path.exists() else None for path in outputs}
    try:
        for path, data in outputs.items():
            atomic_write(path, data)
    except Exception:
        for path, original in originals.items():
            if original is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, original)
        raise


@contextmanager
def workspace_temp_directory(parent: Path, prefix: str):
    parent.mkdir(parents=True, exist_ok=True)
    path = parent / f"{prefix}{uuid4().hex}"
    path.mkdir()
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=False)


def verify_plan_outputs(repo_root: Path, plan: dict[str, Any]) -> None:
    files = plan.get("files")
    if not isinstance(files, list) or not files:
        fail("publish plan 缺少 files")
    for entry in files:
        if not isinstance(entry, dict):
            fail("publish plan 的 files 项格式无效")
        relative = Path(require_text(entry.get("path"), "plan file path"))
        if relative.is_absolute() or ".." in relative.parts:
            fail(f"publish plan 含不安全路径：{relative}")
        path = repo_root / relative
        expected = require_text(entry.get("sha256"), f"sha256（{relative}）")
        if not path.is_file() or sha256_file(path) != expected:
            fail(f"prepare 后文件已缺失或改变：{relative.as_posix()}")


def load_existing_prepared_plan(repo_root: Path, plan_path: Path) -> dict[str, Any] | None:
    if not plan_path.is_file():
        return None
    plan = read_json(plan_path, "publish plan")
    if plan.get("schemaVersion") != PLAN_SCHEMA_VERSION:
        return None
    if plan.get("status") == "prepared":
        verify_plan_outputs(repo_root, plan)
        return plan
    return None


def prepare(
    repo_root: Path,
    source: Path | None,
    *,
    max_size: int = DEFAULT_MAX_SIZE,
    quality: int = DEFAULT_QUALITY,
    dry_run: bool = False,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    incoming_root = repo_root / INCOMING_RELATIVE
    plan_path = incoming_root / PLAN_FILENAME
    if not dry_run:
        existing_plan = load_existing_prepared_plan(repo_root, plan_path)
        if existing_plan:
            if source is not None and str(source.resolve()) != existing_plan.get("source"):
                fail("已有另一来源的 prepared plan；请先完成或移走该 plan")
            print(f"已有可复用的 prepared plan：{plan_path}")
            return existing_plan
    if max_size < 64:
        fail("--max-size 不得小于 64")
    if not 1 <= quality <= 100:
        fail("--quality 必须在 1–100 之间")

    source = (source or incoming_root).resolve()
    if not source.exists():
        fail(f"来源不存在：{source}")

    incoming_root.mkdir(parents=True, exist_ok=True)
    with workspace_temp_directory(incoming_root, "vocabulary-review-publish-") as temporary_root:
        imported_directories = import_source(
            source, incoming_root, temporary_root, merge=not dry_run
        )
        batches = [validate_manifest(path) for path in imported_directories]
        pending = [batch for batch in batches if batch.manifest.get("status") == "pending"]
        pending.sort(
            key=lambda batch: (
                parse_created_at(batch.manifest.get("createdAt"), batch.manifest_path),
                batch_number(str(batch.manifest.get("batchName", ""))),
                str(batch.manifest.get("batchName", "")),
            )
        )
        if not pending:
            fail(f"来源中没有有效 pending 批次：{source}")

        converted_root = temporary_root / "converted"
        converted = validate_and_convert_images(pending, converted_root, max_size, quality)
        data_path = repo_root / DATA_RELATIVE
        service_worker_path = repo_root / SERVICE_WORKER_RELATIVE
        try:
            data_source = data_path.read_text(encoding="utf-8")
            service_worker_source = service_worker_path.read_text(encoding="utf-8")
        except FileNotFoundError as error:
            fail(f"网站文件不存在：{error.filename}")

        updated_data = update_data_file(data_source, pending)
        cache_paths = [
            f"./assets/vocabulary-review/{item.slug}.webp"
            for batch in pending
            for item in batch.items
        ]
        updated_service_worker, old_cache, new_cache = update_service_worker(
            service_worker_source, cache_paths
        )

        dirty_paths = [SERVICE_WORKER_RELATIVE]
        if updated_data != data_source:
            dirty_paths.append(DATA_RELATIVE)
        ensure_git_clean_for(repo_root, dirty_paths)

        repo_outputs: dict[Path, bytes] = {}
        staged_paths: list[str] = []
        for slug, converted_path in converted.items():
            relative = ASSET_DIRECTORY_RELATIVE / f"{slug}.webp"
            target = repo_root / relative
            data = converted_path.read_bytes()
            if target.exists() and target.read_bytes() != data:
                fail(f"目标图片已存在且内容不同，未覆盖：{relative.as_posix()}")
            repo_outputs[target] = data
            staged_paths.append(relative.as_posix())
        if updated_data != data_source:
            repo_outputs[data_path] = updated_data.encode("utf-8")
            staged_paths.append(DATA_RELATIVE.as_posix())
        repo_outputs[service_worker_path] = updated_service_worker.encode("utf-8")
        staged_paths.append(SERVICE_WORKER_RELATIVE.as_posix())
        staged_paths = sorted(set(staged_paths))

        preview_temporary = temporary_root / PREVIEW_FILENAME
        create_preview(pending, preview_temporary)
        files = [
            {
                "path": path.relative_to(repo_root).as_posix(),
                "sha256": sha256_bytes(data),
                "bytes": len(data),
            }
            for path, data in sorted(
                repo_outputs.items(), key=lambda pair: pair[0].relative_to(repo_root).as_posix()
            )
        ]
        def plan_path_value(path: Path) -> str:
            try:
                return path.relative_to(repo_root).as_posix()
            except ValueError:
                return str(path)

        plan = {
            "schemaVersion": PLAN_SCHEMA_VERSION,
            "status": "prepared",
            "preparedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
            "source": str(source),
            "batches": [
                {
                    "directory": plan_path_value(batch.directory),
                    "manifest": plan_path_value(batch.manifest_path),
                    "batchName": batch.manifest["batchName"],
                    "sourceWordbook": batch.manifest["sourceWordbook"],
                    "createdAt": batch.manifest["createdAt"],
                    "itemCount": len(batch.items),
                    "words": [item.word for item in batch.items],
                }
                for batch in pending
            ],
            "totalImages": sum(len(batch.items) for batch in pending),
            "imageSettings": {"format": "webp", "maxSize": max_size, "quality": quality},
            "cache": {"from": old_cache, "to": new_cache},
            "dataFileChanged": updated_data != data_source,
            "visualReviewRequired": True,
            "visualPreview": (incoming_root / PREVIEW_FILENAME).relative_to(repo_root).as_posix(),
            "stagedFiles": staged_paths,
            "files": files,
        }
        if dry_run:
            print(json.dumps(plan, ensure_ascii=False, indent=2))
            return plan

        outputs = dict(repo_outputs)
        outputs[incoming_root / PREVIEW_FILENAME] = preview_temporary.read_bytes()
        outputs[plan_path] = json_bytes(plan)
        transactional_write(outputs)
        verify_plan_outputs(repo_root, plan)
        print(
            f"PREPARED batches={len(pending)} images={plan['totalImages']} "
            f"cache={old_cache}->{new_cache}"
        )
        print(f"PLAN {plan_path}")
        print(f"PREVIEW {incoming_root / PREVIEW_FILENAME}")
        return plan


def finalize(
    repo_root: Path,
    plan_path: Path | None,
    commit_sha: str,
    remote_ref: str = "origin/main",
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    plan_path = (plan_path or (repo_root / INCOMING_RELATIVE / PLAN_FILENAME)).resolve()
    plan = read_json(plan_path, "publish plan")
    if plan.get("schemaVersion") != PLAN_SCHEMA_VERSION:
        fail("publish plan schemaVersion 不受支持")
    if plan.get("status") == "completed":
        if plan.get("commitSha") == commit_sha:
            print(f"publish plan 已 finalize：{commit_sha}")
            return plan
        fail("publish plan 已由另一提交 finalize")
    if plan.get("status") != "prepared":
        fail("只有 prepared plan 可以 finalize")
    if not FULL_SHA.fullmatch(commit_sha):
        fail("--commit 必须是 40 位小写 Git SHA")
    verify_plan_outputs(repo_root, plan)
    if git_output(repo_root, "rev-parse", "HEAD") != commit_sha:
        fail("--commit 与当前 HEAD 不一致")
    if git_output(repo_root, "rev-parse", remote_ref) != commit_sha:
        fail(f"远端跟踪引用 {remote_ref} 尚未指向该提交；不得标记 completed")

    raw_batches = plan.get("batches")
    if not isinstance(raw_batches, list) or not raw_batches:
        fail("publish plan 缺少 batches")
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    outputs: dict[Path, bytes] = {}
    for raw_batch in raw_batches:
        if not isinstance(raw_batch, dict):
            fail("publish plan 的 batch 项格式无效")
        manifest_relative = Path(require_text(raw_batch.get("manifest"), "batch manifest"))
        if manifest_relative.is_absolute() or ".." in manifest_relative.parts:
            fail(f"publish plan 含不安全 manifest 路径：{manifest_relative}")
        manifest_path = repo_root / manifest_relative
        manifest = read_json(manifest_path, "manifest.json")
        if manifest.get("status") not in {"pending", "completed"}:
            fail(f"manifest 状态不可 finalize：{manifest_path}")
        manifest["status"] = "completed"
        item_count = raw_batch.get("itemCount")
        if not isinstance(item_count, int) or item_count <= 0:
            fail(f"publish plan 的 itemCount 无效：{manifest_relative}")
        result = {
            "commitSha": commit_sha,
            "uploadedAt": timestamp,
            "successFileCount": item_count,
            "push": remote_ref,
        }
        outputs[manifest_path] = json_bytes(manifest)
        outputs[manifest_path.parent / "result.json"] = json_bytes(result)

    plan["status"] = "completed"
    plan["finalizedAt"] = timestamp
    plan["commitSha"] = commit_sha
    plan["remoteRef"] = remote_ref
    outputs[plan_path] = json_bytes(plan)
    transactional_write(outputs)
    print(
        f"FINALIZED batches={len(raw_batches)} images={plan.get('totalImages')} commit={commit_sha}"
    )
    return plan


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="批量接入生词巩固图片")
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="网站仓库根目录；默认由脚本位置推断",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare_parser = subparsers.add_parser("prepare", help="统一准备全部 pending 批次")
    prepare_parser.add_argument("--source", type=Path, help="总 ZIP 或批次根目录")
    prepare_parser.add_argument("--max-size", type=int, default=DEFAULT_MAX_SIZE)
    prepare_parser.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    prepare_parser.add_argument("--dry-run", action="store_true", help="只输出计划，不写网站文件")

    finalize_parser = subparsers.add_parser("finalize", help="推送成功后统一回写 completed")
    finalize_parser.add_argument("--plan", type=Path, help="publish-plan.json 路径")
    finalize_parser.add_argument("--commit", required=True, help="已推送的完整 40 位提交 SHA")
    finalize_parser.add_argument("--remote-ref", default="origin/main")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    arguments = parser.parse_args(argv)
    try:
        if arguments.command == "prepare":
            prepare(
                arguments.repo_root,
                arguments.source,
                max_size=arguments.max_size,
                quality=arguments.quality,
                dry_run=arguments.dry_run,
            )
        else:
            finalize(
                arguments.repo_root,
                arguments.plan,
                arguments.commit,
                arguments.remote_ref,
            )
    except PublishError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
