# Learning from Human Corrections

A research demonstration website about human guidance and residual learning for robotic box insertion.

**Project page:** https://r-ush.github.io/contact_residual_learning/

**Seunghwan Um**, [Hyouk Ryeol Choi](https://scholar.google.com/citations?user=EDrjHWsAAAAJ&hl=ko) · Sungkyunkwan University

Dataset collection: thanks to [Tae Hyun Bae](https://github.com/bbaetae).

## On the page

- Demonstration collection and base-policy contact failures.
- Synchronized wrist-camera, insertion-video, and robot-trajectory views of the same rollout.
- A compact residual-policy diagram and synchronized, auto-looping concept animations without a timeline or local playback buttons.
- Human correction vectors and evaluation at Original and Back −3 cm positions.
- Muted, viewport-aware video playback with manual playback controls.

The base policy uses absolute-action demonstrations collected at the Original position only. Evaluation clips are separate autonomous rollouts. The failure/correction animations and network diagram are concept illustrations, not measured performance comparisons.

Related work: [Compliant Residual DAgger (CR-DAgger)](https://compliant-residual-dagger.github.io/) · [Paper](https://arxiv.org/abs/2506.16685)

## Local preview

Requires Python 3.9 or newer; no additional packages or build step are needed.

```sh
python scripts/serve.py
```

Open http://127.0.0.1:8765/. The preview server supports video seeking and binds only to localhost.

## Hosting and repository scope

This is a static HTML/CSS/JavaScript site. GitHub Pages serves the root of the `main` branch; `.nojekyll` disables Jekyll processing. Asset paths are relative so the site works under the repository URL.

Only the current page and its selected media are versioned. Original recordings, slide decks, full datasets, editing scripts, local manifests, draft posts, and intermediate exports remain outside the public repository. The embedded trajectory contains the selected rollout coordinates needed for the visualization; this repository is not a training-code or full-dataset release.
