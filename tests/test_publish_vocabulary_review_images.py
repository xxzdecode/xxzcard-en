import importlib.util
import json
import os
import shutil
import stat
import subprocess
import sys
import unittest
import zipfile
from pathlib import Path
from uuid import uuid4

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "publish-vocabulary-review-images.py"
SPEC = importlib.util.spec_from_file_location("publish_vocabulary_review_images", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PublishVocabularyReviewImagesTests(unittest.TestCase):
    def setUp(self):
        test_temp_root = ROOT / "_incoming" / "publish-script-tests"
        test_temp_root.mkdir(parents=True, exist_ok=True)
        self.repo = test_temp_root / uuid4().hex
        self.repo.mkdir()
        (self.repo / "js").mkdir()
        (self.repo / "assets" / "vocabulary-review").mkdir(parents=True)
        (self.repo / "_incoming" / "vocabulary-review-images").mkdir(parents=True)
        (self.repo / "js" / "vocabularyReviewData.js").write_text(
            "const reviewWords = Object.freeze([\n"
            "  { word: 'alpha', phonetic: '/a/', meaning: '甲', image: '', placeholder: 'A' },\n"
            "  { word: 'beta', phonetic: '/b/', meaning: '乙', image: '', placeholder: 'B' }\n"
            "]);\n",
            encoding="utf-8",
        )
        (self.repo / "service-worker.js").write_text(
            "const VOCABULARY_REVIEW_CACHE = 'vocabulary-review-v3';\n"
            "const VOCABULARY_REVIEW_ASSETS = [\n"
            "  './index.html'\n"
            "];\n",
            encoding="utf-8",
        )
        self.git("init")
        self.git("config", "user.email", "tests@example.com")
        self.git("config", "user.name", "Tests")
        self.git("add", ".")
        self.git("commit", "-m", "baseline")

    def tearDown(self):
        def make_writable(function, path, _error):
            os.chmod(path, stat.S_IWRITE)
            function(path)

        shutil.rmtree(self.repo, onexc=make_writable)

    def git(self, *arguments):
        return subprocess.run(
            ["git", *arguments],
            cwd=self.repo,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        ).stdout.strip()

    def add_batch(self, directory_name, batch_name, created_at, word, *, with_image=True):
        directory = self.repo / "_incoming" / "vocabulary-review-images" / directory_name
        images = directory / "images"
        images.mkdir(parents=True)
        if with_image:
            Image.new("RGB", (128, 128), "#88aadd").save(images / f"{word}.png")
        manifest = {
            "batchName": batch_name,
            "sourceWordbook": "测试词书",
            "createdAt": created_at,
            "status": "pending",
            "items": [{"word": word, "filename": f"{word}.png", "meaning": word}],
        }
        (directory / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return directory

    def test_prepare_combines_batches_and_finalize_is_push_gated(self):
        first = self.add_batch("batch-1", "第一批", "2026-07-20T00:00:00+08:00", "alpha")
        second = self.add_batch("batch-2", "第二批", "2026-07-20T00:30:00+08:00", "beta")

        plan = MODULE.prepare(self.repo, None)
        self.assertEqual(plan["totalImages"], 2)
        self.assertEqual([item["batchName"] for item in plan["batches"]], ["第一批", "第二批"])
        self.assertEqual(plan["cache"], {"from": "vocabulary-review-v3", "to": "vocabulary-review-v4"})
        self.assertTrue((self.repo / "assets/vocabulary-review/alpha.webp").is_file())
        self.assertTrue((self.repo / "assets/vocabulary-review/beta.webp").is_file())
        self.assertEqual(json.loads((first / "manifest.json").read_text(encoding="utf-8"))["status"], "pending")
        service_worker = (self.repo / "service-worker.js").read_text(encoding="utf-8")
        self.assertIn("vocabulary-review-v4", service_worker)
        self.assertIn("./assets/vocabulary-review/alpha.webp", service_worker)
        self.assertIn("./assets/vocabulary-review/beta.webp", service_worker)

        repeated = MODULE.prepare(self.repo, None)
        self.assertEqual(repeated["preparedAt"], plan["preparedAt"])
        self.assertEqual((self.repo / "service-worker.js").read_text(encoding="utf-8"), service_worker)

        self.git("add", *plan["stagedFiles"])
        self.git("commit", "-m", "publish")
        commit_sha = self.git("rev-parse", "HEAD")
        with self.assertRaises(MODULE.PublishError):
            MODULE.finalize(self.repo, None, commit_sha)
        self.assertEqual(json.loads((first / "manifest.json").read_text(encoding="utf-8"))["status"], "pending")

        self.git("update-ref", "refs/remotes/origin/main", commit_sha)
        finalized = MODULE.finalize(self.repo, None, commit_sha)
        self.assertEqual(finalized["status"], "completed")
        for directory in (first, second):
            manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
            result = json.loads((directory / "result.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["status"], "completed")
            self.assertEqual(result["commitSha"], commit_sha)
            self.assertEqual(result["successFileCount"], 1)

    def test_missing_image_fails_before_site_files_change(self):
        self.add_batch("batch-bad", "坏批次", "2026-07-20T00:00:00+08:00", "alpha", with_image=False)
        service_worker_before = (self.repo / "service-worker.js").read_bytes()
        with self.assertRaises(MODULE.PublishError):
            MODULE.prepare(self.repo, None)
        self.assertEqual((self.repo / "service-worker.js").read_bytes(), service_worker_before)
        self.assertFalse((self.repo / "assets/vocabulary-review/alpha.webp").exists())

    def test_relevant_dirty_file_is_not_overwritten(self):
        self.add_batch("batch-1", "第一批", "2026-07-20T00:00:00+08:00", "alpha")
        service_worker = self.repo / "service-worker.js"
        service_worker.write_text(service_worker.read_text(encoding="utf-8") + "// user edit\n", encoding="utf-8")
        with self.assertRaises(MODULE.PublishError):
            MODULE.prepare(self.repo, None)
        self.assertFalse((self.repo / "assets/vocabulary-review/alpha.webp").exists())

    def test_dry_run_does_not_write_site_files_or_plan(self):
        self.add_batch("batch-1", "第一批", "2026-07-20T00:00:00+08:00", "alpha")
        service_worker_before = (self.repo / "service-worker.js").read_bytes()
        plan = MODULE.prepare(self.repo, None, dry_run=True)
        self.assertEqual(plan["totalImages"], 1)
        self.assertEqual((self.repo / "service-worker.js").read_bytes(), service_worker_before)
        self.assertFalse((self.repo / "assets/vocabulary-review/alpha.webp").exists())
        self.assertFalse(
            (self.repo / "_incoming/vocabulary-review-images/publish-plan.json").exists()
        )

    def test_repairs_unflagged_utf8_zip_names(self):
        expected = "暑假生词_第一批/manifest.json"
        mojibake = expected.encode("utf-8").decode("cp437")
        self.assertEqual(MODULE.decode_zip_member(mojibake, 0), expected)
        self.assertEqual(MODULE.decode_zip_member(expected, 0x800), expected)

    def test_zip_case_collisions_are_rejected(self):
        archive = self.repo / "collision.zip"
        with zipfile.ZipFile(archive, "w") as handle:
            handle.writestr("folder/a.txt", "one")
            handle.writestr("folder/A.txt", "two")
        with self.assertRaises(MODULE.PublishError):
            MODULE.extract_zip_safely(archive, self.repo / "extracted")


if __name__ == "__main__":
    unittest.main()
