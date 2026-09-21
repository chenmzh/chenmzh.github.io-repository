# Self-hosted fonts

All font files are bundled locally and served from this game's `assets/` directory with content-hashed names. No third-party font service is contacted during play.

## Inter

- Inter 4.001, Latin variable weight font; unmodified file from `@fontsource-variable/inter@5.2.8`.
- Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter).
- License: [SIL Open Font License 1.1](Inter-OFL.txt).
- Source: https://github.com/rsms/inter and https://fontsource.org/fonts/inter.

## Time Exchange Sans SC

- Modified UI subsets of Noto Sans CJK SC 2.004, Regular and Bold. Copyright © 2014–2021 Adobe (http://www.adobe.com/).
- Subset families renamed to **Time Exchange Sans SC**; original copyright and license metadata retained.
- License: [SIL Open Font License 1.1](Noto-OFL.txt).
- Source: https://github.com/notofonts/noto-cjk.
- The source project's `scripts/subset-ui-font.py` regenerates these WOFF2 files from the original TTC faces using FontTools and Brotli. It includes CJK characters used by the UI and the instrument catalog. Other user-entered characters fall back to system fonts.

Fonts remain under the SIL OFL; they are not covered by the application's or its JavaScript dependencies' licenses.
