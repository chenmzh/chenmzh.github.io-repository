# 青溪渡 NPC 全身待机精灵

使用内置 ImageGen。最终素材：`chapter-npcs-keyed.png`（1536×1024，RGB）。
人物参考：`chapter-portraits.png` 顶排中间阿蘅、顶排右侧顾药师。

图集规格：4 列 × 2 行，每格 384×512。第一行阿蘅端茶、提杯、闭眼、放杯；第二行顾药师持草、调息、抚须、收手。姿势逐帧播放，脚底使用各帧独立锚点对齐。`chapter-npcs.js` 的颜色键合成只在加载时进行一次，之后只裁帧绘制，兼容减少动态效果设置。

## 生成提示词

Use case: stylized-concept. Production game asset: original Chinese wuxia HD pixel art FULL BODY NPC idle-animation sprite atlas. The reference is ONLY character identity/color reference: top middle tea keeper A Heng; top right elderly herbalist Gu. Generate an RGBA PNG with a GENUINELY TRANSPARENT ALPHA background, no baked checkerboard, no backdrop, no floor, no frames, no text. Exactly 4 columns by 2 rows, 8 separate full-body figures. Canvas 1536x1024, each cell 384x512. Feet at cell local (192,470), crown at local y=65, entire figure within x=75..310. Row 1: SAME adult woman A Heng in all four cells: black updo with plum blossom hairpin, ochre shawl, muted dusty rose long Chinese dress, small cream tea cup held before waist. Idle loop 4 consecutive poses: relaxed cup low, cup slightly lifted with inhaling shoulders, brief blink and cup near chest with turned wrist, returning cup low and shawl settling. Row 2: SAME elderly herbalist Gu: grey topknot, small grey beard, moss green long layered Chinese robe, cloth belt with tiny medicinal pouch, pale inner sleeves. Idle loop: arms gently folded holding small herb sprig, inhale subtle shoulder lift, right hand smoothing beard and brief blink, return hand to herb sprig. Every figure fully visible head to shoes, approximately four-heads-tall RPG sprite proportions, all facing 3/4 toward camera right. Keep feet and head size registered consistently across frames. Crisp deliberate pixel clusters with rich detailed fabric and amber highlights, dark teal rim shadow, sophisticated HD-2D JRPG sprite craftsmanship as in Octopath Traveler but original Chinese characters. Small clear pixels, no antialiased painterly brushwork. Characters must remain distinct from transparent space. Alpha zero outside sprite silhouettes. Do not draw portraits or busts; eight complete standing people.

## 最终背景编辑提示词（实际交付版本）

生成器返回了 RGB 棋盘背景，透明提取重试仍未返回真实 alpha。因此继续用 ImageGen 生成纯色键版本，保留其原文件，由游戏渲染器进行颜色键合成；没有把棋盘当作透明图片。

Precise background edit for a game color-key sprite atlas. Replace ONLY the entire grey and white checkered background with FLAT PURE HOT MAGENTA #ff00ff RGB(255,0,255). This is an intentional solid chroma-key sprite texture, do NOT draw a checkerboard, transparency symbols, shadows, gradients, grid or text. Preserve all 8 complete standing characters from the input in exactly the same 4 columns x 2 rows positions and poses, same detailed pixel-art rendering, same faces, same clothes and hands, same fullbody scale and feet positions. Make ALL exterior background pixels uniform saturated fuchsia magenta, including tiny empty gaps between tassels and around hair. Crisp hard opaque silhouette edges against magenta. Output 1536x1024. No light magenta reflected onto clothing; keep original clothing colors. No background pattern.
