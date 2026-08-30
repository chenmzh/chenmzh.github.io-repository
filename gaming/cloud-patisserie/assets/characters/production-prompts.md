# 角色生图提示词集

## 统一母提示词

```text
Use case: stylized-concept
Asset type: browser blind-box game character cutout / collectible mascot sprite
Input images: Image 1 is style reference only, not an edit target.
Primary request: Create exactly one completely original cute dessert-shop mascot from the character brief. Match Image 1's pixel density, dark-plum outline, face construction, proportions, hard color-block shading and upper-left lighting, but do not copy a character from the reference and do not resemble any existing designer-toy, animation, game or retail-brand IP.
Scene/backdrop: genuinely transparent alpha background.
Style/medium: crisp hand-placed modern pixel art; approximately 64×64 logical pixels enlarged with nearest-neighbor appearance; stair-stepped curves; restrained three-tone cel shading; #252439 shared outer outline; warm handmade pastry-shop feeling.
Composition/framing: exactly one character, full body centered, near-front view, complete accessories visible, same collection scale and baseline, oversized head, tiny limbs, generous transparent safe area, no cropping.
Shared face: two small dark vertical pixel eyes, tiny curved mouth, two blush clusters, no nose.
Rarity: COMMON has a simple silhouette and one prop; RARE adds one gold accent and 2–3 hard pixel stars; EPIC adds a richer costume silhouette and 4–6 restrained sparkles; HIDDEN uses night blue, cream, gold and a premium asymmetric silhouette. Never draw a rarity badge.
Constraints: real alpha PNG; preserve every character anchor, palette and pose; no text, letters, numbers, logo, watermark, border, card frame, platform, scenery, cast shadow, checkerboard, extra companion, duplicate character, smooth vector gradients, painterly marks, 3D render, antialiasing or malformed limbs.
Character brief: <one row from the roster below>
```

如果首次生成把棋盘格画入 RGB，则使用下面的背景提取编辑提示词，并把已生成角色作为 edit target：

```text
Use case: background-extraction
Asset type: final transparent game character sprite
Primary request: Remove every white-and-gray checkerboard background pixel and replace the full area outside the character with genuine transparent alpha. Change only the background. Preserve the approved character exactly: identity, face, pose, silhouette, palette, hard pixel blocks, outline thickness, costume, props, canvas framing and baseline. No redraw, recolor, crop, halo, matte, blur, shadow, text or new object.
```

## 角色简报

| ID | 角色简报 |
|---|---|
| `strawberry-puff` | 草莓泡芙小绵羊；圆泡芙头、奶油卷耳、草莓叶冠、心形果酱围兜；粉红/奶油/莓红；右手招手、左脚踮起。 |
| `caramel-pudding` | 焦糖布丁水豚；扁焦糖顶帽、钟形布丁身、圆耳、白瓷盘领；焦糖/蛋奶/深棕；双手抱银勺。 |
| `mint-soda` | 薄荷汽水瓶精灵；细长瓶身、薄荷叶塞、斜吸管、腹部三气泡；薄荷/浅绿/深青；右倾扶吸管。 |
| `cookie-bear` | 方形黄油曲奇熊；圆角方头、圆耳、三颗巧克力豆、短围裙；饼干棕/奶油/深棕；横抱圆烤盘。 |
| `blueberry-shake` | 蓝莓奶昔长耳兔；奶昔杯身、高低长耳、三颗蓝莓、大蝴蝶结；蓝紫/淡紫/深蓝；歪头搅拌。 |
| `lemon-gummy` | 柠檬软糖小鸡；豆形软糖身、两片冠羽、柠檬切片口袋、短翅；黄/奶黄/橄榄；向上弹起。 |
| `rose-canele` | 玫瑰可露丽小刺猬；沟槽烤壳、玫瑰花苞耳、焦脆顶、粉立领；玫瑰棕/浅粉/深红；笔直站立。 |
| `star-macaron` | 流星马卡龙小狐；双层马卡龙头、奶油夹心、星耳与尖耳、短披风；粉紫/浅粉/深紫；腾空跳跃。 |
| `moon-mousse` | 月牙慕斯垂耳兔；慕斯尖顶、下垂长耳、深蓝新月披风、星灯；月蓝/浅蓝/深蓝；困倦倚靠。 |
| `rainbow-donut` | 彩虹甜甜圈小狮；巨大中空圆环鬃毛、糖霜弧带、云耳、彩糖针；珊瑚/奶油/莓红；穿过圆环跳起。 |
| `cloud-pastry-chef` | 云朵羊驼主厨；三瓣云帽、细高薄荷厨师服、金纽扣、碗与打蛋器；薄荷/奶白/深青；右手高举。 |
| `midnight-chocolate` | 午夜巧克力角兽；尖甘纳许头、弯巧克力角、落地披风、金边书；深紫/淡紫/近黑；倾身翻页。 |
| `peach-marshmallow` | 桃心棉花糖云羊；桃心头、四团卷毛、单桃叶、侧蝴蝶结；桃粉/奶粉/莓红；挤脸轻弹。 |
| `matcha-roll` | 抹茶瑞士卷小狸；圆角卷切面、奶油螺旋、小狸耳、茶叶领结；抹茶/奶绿/深绿；侧坐抱茶筅。 |
| `grape-jelly` | 葡萄果冻小蛙；豆形果冻身、泡泡眼耳、三颗葡萄冠、短丝带；葡萄紫/浅紫/深紫；单脚弹开。 |
| `coconut-rabbit` | 椰雪扫地兔；笔直长耳、奶白身体、半椰壳裙、椰雪；椰棕/奶白/深棕；斜握棕榈扫帚。 |
| `coffee-eclair` | 咖啡闪电小雪貂；窄长闪电泡芙、咖啡糖霜、奶油锯齿纹、纸杯套；咖啡/奶咖/深棕；懒倾拄手杖。 |
| `honey-toast` | 蜂蜜方吐司熊；圆角吐司头、面包耳、黄油帽、蜂蜜滴；蜂蜜金/奶黄/深棕；一手挥动。 |
| `sakura-mochi` | 樱花叶包大福小鹿；粉麻薯身、花瓣耳、盐渍樱叶、樱花发饰；樱粉/淡粉/酒红；歪头捧花。 |
| `aurora-parfait` | 极光高脚杯北极狐；细高杯身、青蓝紫分层、星形威化耳、银长勺；极光青/冰蓝/深蓝；S 形悬浮。 |
| `planet-candy` | 行星硬糖小考拉；球形糖身、巨大倾斜糖环、云团卫星耳、望远镜；行星蓝/浅蓝/深蓝；单脚点地。 |
| `crystal-pear` | 水晶梨果冻小飞蛾；梨形透明身、金果核、叶脉翼耳、晶体领；梨绿/浅绿/深绿；展翼抬腿。 |
| `sun-souffle` | 太阳舒芙蕾小狮；沟槽烤盅、膨起头顶、星芒耳、烤箱手套；太阳金/奶黄/深金；举烤盘跳起。 |
| `winter-opera` | 雪夜歌剧猫头鹰；冰晶角耳、半脸面具、帷幕长披风、胸铃；冰蓝/雪白/深蓝；悬浮谢幕。 |
| `daydream-manager` | 翼耳梦境猫店长；奶油心形脸、不对称翼耳、钥匙孔围兜、近等身金钥匙、斜冠；蓝金奶油；屈膝悬浮。 |

