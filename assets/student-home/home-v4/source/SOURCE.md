# Student home artwork source

- Source archive: `学习首页素材包_20260802.zip`
- Supplied reference image: `ChatGPT Image 2026年8月2日 15_28_56.png`
- Received: 2026-08-02
- The committed scene files are optimized WebP derivatives of the supplied PNG artwork.
- The committed transparent UI files are cropped and Retina-sized PNG derivatives. All three chest states share a `320 × 300` canvas, a common bottom baseline, and a consistent visual width.
- `reference-home.webp` is retained only as visual provenance. Live titles, values, labels, stamps, and reward controls remain HTML/CSS.

Stable mappings:

- `首页总背景.png` → `scenes/home-background.webp`
- `词汇探险底图.png` → `scenes/vocabulary-adventure.webp`
- `单词挑战底图.png` → `scenes/word-challenge.webp`
- `语法挑战底图.png` → `scenes/grammar-challenge.webp`
- `随堂练习底图.png` → `scenes/classroom-practice.webp`
- `新词导览底图.png` → `scenes/new-word-guide.webp`
- UI coin, plaque, tag, stamp, and chest sources → matching stable English names under `ui/`
