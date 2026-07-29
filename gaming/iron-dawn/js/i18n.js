(function attachIronI18n(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IronI18n = api;
})(typeof window !== 'undefined' ? window : globalThis, function createIronI18nModule(root) {
  'use strict';

  const STORAGE_KEY = 'iron-dawn-language';
  const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'en']);

  const ZH = {
    'app.title': '钢铁黎明：零号战区 · Iron Dawn',
    'app.name': '钢铁黎明：零号战区',
    'app.description': '《钢铁黎明：零号战区》是一款拥有陆空联合作战与丰沛晶矿的原创明亮科幻俯视角浏览器即时战略游戏。',
    'a11y.skipToBattlefield': '跳到战场',
    'a11y.gameShell': '钢铁黎明：零号战区战术控制台',
    'a11y.battlefieldViewport': '零号战区主战场视口',
    'a11y.battlefieldCanvas': '即时战略主战场。拖拽框选单位，右键下达移动或攻击命令。',
    'a11y.battleStatus': '战场状态',
    'a11y.telemetry': '资源与战况',
    'a11y.systemControls': '系统控制',
    'a11y.commandRack': '生产与战术控制',
    'a11y.consoleOnline': '控制台在线',
    'a11y.minimap': '战术小地图',
    'a11y.orderDeck': '单位与命令控制',
    'a11y.controlGroups': '战术编队 1 至 9',
    'a11y.missionPoints': '任务要点',
    'a11y.difficulty': '游戏难度',
    'a11y.resultStats': '行动统计',
    'a11y.language': '界面语言',
    'error.canvasUnsupported': '你的浏览器不支持 Canvas，无法运行《钢铁黎明：零号战区》。',
    'error.canvasMissing': '战场画布未找到',

    'hud.operation.aria': '行动代号：晨线',
    'hud.operation.name': '晨线行动',
    'hud.objective.label': '当前指令',
    'hud.objective.initial': '建立前沿基地，摧毁赤砂军团指挥核心',
    'hud.objective.running': '目标：摧毁敌方指挥核心',
    'hud.objective.paused': '战术时钟已冻结',
    'hud.objective.menu': '任务等待确认',
    'hud.credits': '补给',
    'hud.power': '电力',
    'hud.population': '人口',
    'hud.wave': '波次',
    'hud.timer': '计时',
    'hud.creditsAria': '当前补给',
    'hud.powerAria': '当前电力',
    'hud.populationAria': '当前人口',
    'hud.waveAria': '当前波次',
    'hud.timerAria': '任务计时',
    'hud.wave.first': '波次 00 · {seconds}s',
    'hud.wave.active': '波次 {wave} · {seconds}s',

    'controls.pause': '暂停',
    'controls.pauseAria': '暂停游戏',
    'controls.resume': '继续',
    'controls.resumeAria': '继续游戏',
    'controls.sound': '声音',
    'controls.soundDisableAria': '关闭声音',
    'controls.soundEnableAria': '开启声音',
    'controls.soundEnabled': '声音已开启',
    'controls.soundDisabled': '声音已关闭',
    'controls.help': '帮助',
    'controls.helpOpenAria': '打开操作帮助',

    'mobile.controls': '触控战术控制',
    'mobile.production': '生产',
    'mobile.minimap': '地图',
    'mobile.pan': '视野',
    'mobile.panEnableAria': '切换到视野拖动模式',
    'mobile.panDisableAria': '切换到框选模式',
    'mobile.focus': '聚焦',
    'mobile.closeProduction': '关闭生产面板',
    'mobile.closeMinimap': '关闭小地图',
    'mobile.closePanels': '关闭战术面板',
    'mobile.touchHint': '轻点选择 · 单指拖动视野 · 点“视野”可切换框选',

    'rack.queue': '生产队列',
    'rack.build': '基地设施',
    'rack.units': '作战编制',
    'rack.events': '战术纸带',
    'queue.standby': '待机',
    'queue.noTasks': '尚无生产任务',
    'queue.empty': '生产通道空闲',
    'queue.remaining.one': '后续 {count} 项',
    'queue.remaining.other': '后续 {count} 项',
    'event.connected': '控制链路已建立',
    'event.awaitAuthorization': '等待行动授权',
    'event.waiting': '等待战区链路',

    'build.role.powerPlant': '+电力',
    'build.role.refinery': '+补给',
    'build.role.barracks': '步兵',
    'build.role.factory': '载具',
    'build.role.airfield': '空军',
    'build.role.turret': '防御',
    'unit.role.rifle': '反步兵',
    'unit.role.rocket': '反装甲',
    'unit.role.scout': '高机动',
    'unit.role.tank': '重装甲',
    'unit.role.fighter': '空地制空',
    'unit.role.harvester': '经济',
    'tooltip.production': '{name} · {cost} 补给 · {seconds}s',

    'minimap.title': '区域测绘',
    'minimap.fallback': '战术小地图',
    'selection.title': '当前编队',
    'selection.none': '未选择单位',
    'selection.noneUnitHint': '拖拽框选，或单击一个单位',
    'selection.noneFacilityHint': '拖拽框选，或单击一座设施',
    'selection.group': '{count} 个单位 · 编队链路在线',
    'selection.entity': '{name} · {kind} {id}',
    'selection.health': '{status} · 结构 {hp} / {maxHp}',
    'entity.kind.unit': 'UNIT',
    'entity.kind.structure': 'STRUCTURE',
    'commands.title': '指令回波',
    'commands.move': '移动',
    'commands.attackMove': '攻击移动',
    'commands.patrol': '巡逻',
    'commands.hold': '原地防守',
    'commands.rally': '设置集结点',
    'commands.stop': '停止',
    'groups.title': '战术编队',
    'groups.hint': 'Ctrl/Cmd + 数字保存 · 双击聚焦',
    'groups.slot.emptyAria': '编队 {slot}，空',
    'groups.slot.countAria': '编队 {slot}，{count} 个实体；单击选择，双击聚焦',

    'briefing.archive': '行动档案 07—C',
    'briefing.clearance': '授权等级：战地',
    'briefing.localizedTitle': '钢铁黎明：零号战区',
    'briefing.lead': '旧世界的线路沉默了。向零号战区推进，在赤砂军团封锁全境前切断它的指挥链。',
    'briefing.title': '任务简报',
    'briefing.story1': '1983 年，北纬工业走廊在一夜之间与外界失联。<strong>赤砂军团</strong>正沿废弃输电网推进，并以零号战区的装甲指挥核心封锁全境信号。',
    'briefing.story2': '你是第七码头最后一名战术调度员。开发扩容后的晶矿藏，建立陆空生产链，以装甲与截击机突破敌军防线并摧毁赤砂军团指挥核心；若我方指挥核心先被摧毁，这座城市也将永久熄灯。',
    'briefing.point1': '建设电力与精炼设施',
    'briefing.point2': '编制陆军及空中力量',
    'briefing.point3': '摧毁敌方指挥核心',
    'briefing.controls': '基本操作',
    'briefing.selectKey': '左键',
    'briefing.select': '点选单位；拖拽可框选编队',
    'briefing.commandKey': '右键',
    'briefing.command': '移动；点中敌军时自动攻击',
    'briefing.camera': '移动战场镜头',
    'briefing.home': '镜头返回我方基地',
    'briefing.commandKeys': '移动 / 攻击移动 / 停止',
    'briefing.tacticalKeys': '巡逻 / 原地防守 / 集结点',
    'briefing.groups': '保存编队；双击数字聚焦',
    'briefing.queueCommands': '追加最多 16 条移动或攻击指令',
    'difficulty.title': '选择授权等级',
    'difficulty.easy.description': '敌军较少，经济宽裕',
    'difficulty.normal.description': '标准攻势与资源配置',
    'difficulty.hard.description': '更强敌军，更短准备时间',
    'briefing.encrypted': '链路已加密',
    'briefing.localOnly': '本次行动在你的浏览器本地运行，无需联网。',
    'start.action': '启动战术链路',
    'assets.preparing': '准备资源清单',
    'assets.progress': '载入美术资源 {loaded} / {total}',
    'assets.failedNotice': '{count} 项美术资源未载入，已启用矢量备用图。',
    'assets.animationFailedNotice': '{count} 项差分动画未载入，对应实体将使用静态美术。',
    'assets.status.uplink': '资源链路同步中',
    'assets.status.ready': '战术链路就绪',
    'assets.status.degraded': '降级图形 · {count}',
    'assets.status.procedural': '程序化备用图已启用',

    'pause.title': '战术链路已冻结',
    'pause.copy': '所有单位与生产计时均已暂停。战场信号仍保留在缓冲区中。',
    'pause.resume': '恢复行动',
    'result.defaultTitle': '零号战区已肃清',
    'result.defaultCopy': '赤砂军团指挥核心已经熄灭。城市上空重新亮起了第一条航标线。',
    'result.victory': '战区已控制',
    'result.defeat': '指挥链中断',
    'result.duration': '作战时间',
    'result.kills': '摧毁目标',
    'result.losses': '损失单位',
    'result.harvested': '精炼补给',
    'result.restart': '重新部署',

    'help.title': '控制台操作',
    'help.closeAria': '关闭帮助',
    'help.selection': '选择与命令',
    'help.selectKey': '左键',
    'help.select': '选择单位或建筑',
    'help.dragKey': '拖拽',
    'help.drag': '框选多个单位',
    'help.touchPanKey': '视野',
    'help.touchPan': '视野模式下单指拖动战场；关闭后拖动框选',
    'help.commandKey': '右键',
    'help.command': '移动或攻击目标',
    'help.queue': '将移动、攻击或攻击移动追加到指令队列',
    'help.moveMode': '进入移动指令模式',
    'help.attackMode': '进入攻击移动模式',
    'help.patrol': '设置往返巡逻路线',
    'help.hold': '原地防守，不追击射程外目标',
    'help.rally': '为兵营、战车工厂或机场设置集结点',
    'help.stop': '停止并清空指令队列',
    'help.groups': '保存编队；按数字召回，连续按两次聚焦',
    'help.camera': '镜头与系统',
    'help.pan': '平移镜头；屏幕边缘也可滚动',
    'help.home': '镜头返回我方基地',
    'help.focusSelection': '镜头聚焦当前选择',
    'help.minimapKey': '小地图',
    'help.minimap': '点击快速定位',
    'help.pause': '取消当前模式；无模式时暂停或继续',
    'help.manual': '打开本操作手册',
    'help.tip': '提示',
    'help.tipCopy': '晶矿藏储量再次提升。地面部队会绕开建筑与矿堆；稳定经济后建设机场，截击机可快速支援战线。',

    'status.standby': '待命',
    'status.constructing': '建造 {percent}%',
    'status.producing': '生产 {unit}',
    'status.lowPower': '低电力',
    'status.online': '在线',
    'status.harvester.seeking': '搜寻晶矿',
    'status.harvester.toMine': '前往矿区',
    'status.harvester.mining': '采集中',
    'status.harvester.toRefinery': '返回精炼站',
    'status.harvester.unloading': '卸载中',
    'status.harvester.manual': '手动移动',
    'status.harvester.cargo': '{state} · {cargo}/{capacity}',
    'status.command.moving': '移动中',
    'status.command.attackMove': '攻击移动',
    'status.command.engaging': '交战中',
    'status.command.patrol': '巡逻中',
    'status.command.hold': '原地防守',

    'team.player.name': '北境同盟',
    'team.enemy.name': '赤砂军团',
    'entity.unit.rifle.name': '突击步兵',
    'entity.unit.rifle.short': '步兵',
    'entity.unit.rocket.name': '反装甲兵',
    'entity.unit.rocket.short': '导弹',
    'entity.unit.scout.name': '猎犬侦察车',
    'entity.unit.scout.short': '侦察',
    'entity.unit.tank.name': '堡垒主战坦克',
    'entity.unit.tank.short': '坦克',
    'entity.unit.fighter.name': '曙光截击机',
    'entity.unit.fighter.short': '截击',
    'entity.unit.harvester.name': '晶矿采集车',
    'entity.unit.harvester.short': '采集',
    'entity.building.hq.name': '指挥核心',
    'entity.building.hq.short': '核心',
    'entity.building.powerPlant.name': '裂变电厂',
    'entity.building.powerPlant.short': '电厂',
    'entity.building.refinery.name': '晶矿精炼站',
    'entity.building.refinery.short': '精炼',
    'entity.building.barracks.name': '前线兵营',
    'entity.building.barracks.short': '兵营',
    'entity.building.factory.name': '战车工厂',
    'entity.building.factory.short': '工厂',
    'entity.building.airfield.name': '天穹空军基地',
    'entity.building.airfield.short': '机场',
    'entity.building.turret.name': '哨戒机炮塔',
    'entity.building.turret.short': '炮塔',
    'difficulty.easy.name': '新兵',
    'difficulty.normal.name': '指挥官',
    'difficulty.hard.name': '老兵',

    'game.start.objective': '战区链路建立。摧毁赤砂军团的指挥核心。',
    'game.start.harvesterAuto': '采集车已自动前往最近晶矿。',
    'game.result.timeout': '通讯窗口关闭前未能摧毁敌方指挥核心，行动被迫撤回。',
    'game.building.completed': '{entity} 已接入基地网络。',
    'game.unit.deployed': '{entity} 已完成部署。',
    'game.entity.lost': '{entity} 已损失。',
    'game.enemyHq.collapsed': '敌方指挥核心发生结构性坍塌！',
    'game.insufficientCredits': '补给不足：{entity} 需要 {cost}。',
    'game.populationFull': '人口上限已满。',
    'game.noProducer': '没有可生产{entity}的设施。',
    'game.queueFull': '生产队列已满。',
    'game.queued': '{entity} 已加入生产队列。',
    'game.prerequisiteMissing': '科技链未满足，暂不能建造{entity}。',
    'game.selectBuildLocation': '选择{entity}部署位置；右键或 Esc 取消。',
    'game.foundationPlaced': '{entity} 地基已部署。',
    'game.build.unknown': '未知设施',
    'game.build.outOfBounds': '超出战区边界',
    'game.build.outOfRadius': '超出基地建造半径',
    'game.build.overlap': '与现有设施重叠',
    'game.build.oreBlocked': '晶矿场阻挡部署',
    'game.selectUnits': '请先选择作战单位。',
    'game.attackMovePrompt': '攻击移动：点击战场目标点。',
    'game.movePrompt': '移动：点击战场目标点。',
    'game.patrolPrompt': '巡逻：点击战场设置往返目标点。',
    'game.holdSet': '所选单位已进入原地防守。',
    'game.rallyPrompt': '集结点：点击战场为所选生产设施设置目标。',
    'game.rallySet': '生产设施集结点已设置。',
    'game.rallyCleared': '生产设施集结点已清除。',
    'game.group.assigned': '编队 {slot} 已保存（{count} 个实体）。',
    'game.group.cleared': '编队 {slot} 已清除。',
    'game.group.recalled': '编队 {slot} 已召回（{count} 个实体）。',
    'game.deploymentCancelled': '已取消设施部署。',
    'game.result.mutualLoss': '双方核心同时失联；战区判定为撤退。',
    'game.result.victory': '赤砂军团指挥链已切断，战区归于北境同盟。',
    'game.result.defeat': '己方指挥核心被摧毁，作战链路中断。',
    'ai.wave.incoming': '远程侦测：敌军纵队正在集结。',
    'ai.wave.launched.one': '敌军第 {wave} 波攻势已越过警戒线（{count} 个单位）。',
    'ai.wave.launched.other': '敌军第 {wave} 波攻势已越过警戒线（{count} 个单位）。',
    'canvas.oreGain': '+{amount} 晶矿',
    'canvas.productionProgress': '{unit} {percent}%',
    'canvas.hostileSignal': '敌军信号',
    'canvas.deploymentValid': '部署位置有效',
    'canvas.deploymentBlocked': '部署受阻',
    'canvas.surveyLimit': '零号测绘 / 边界 00',
    'canvas.coordinate': '零号坐标 // X {x}  Y {y}',
  };

  const EN = {
    'app.title': 'Iron Dawn: Zero Sector',
    'app.name': 'Iron Dawn: Zero Sector',
    'app.description': 'An original offline browser RTS featuring combined ground-air warfare, richer crystal fields, and a bright top-down science-fiction battlefield.',
    'a11y.skipToBattlefield': 'Skip to battlefield',
    'a11y.gameShell': 'Iron Dawn: Zero Sector tactical console',
    'a11y.battlefieldViewport': 'Zero Sector main battlefield viewport',
    'a11y.battlefieldCanvas': 'Real-time strategy battlefield. Drag to select units and right-click to move or attack.',
    'a11y.battleStatus': 'Battle status',
    'a11y.telemetry': 'Resources and battle status',
    'a11y.systemControls': 'System controls',
    'a11y.commandRack': 'Production and tactical controls',
    'a11y.consoleOnline': 'Console online',
    'a11y.minimap': 'Tactical minimap',
    'a11y.orderDeck': 'Unit and command controls',
    'a11y.controlGroups': 'Tactical control groups 1 through 9',
    'a11y.missionPoints': 'Mission objectives',
    'a11y.difficulty': 'Game difficulty',
    'a11y.resultStats': 'After-action statistics',
    'a11y.language': 'Interface language',
    'error.canvasUnsupported': 'Your browser does not support Canvas and cannot run Iron Dawn: Zero Sector.',
    'error.canvasMissing': 'Battlefield canvas not found',

    'hud.operation.aria': 'Operation codename: Dawnline',
    'hud.operation.name': 'DAWNLINE',
    'hud.objective.label': 'CURRENT ORDER',
    'hud.objective.initial': 'Establish a forward base and destroy the Red Sand command core',
    'hud.objective.running': 'OBJECTIVE: DESTROY ENEMY COMMAND CORE',
    'hud.objective.paused': 'TACTICAL CLOCK FROZEN',
    'hud.objective.menu': 'AWAITING MISSION AUTHORIZATION',
    'hud.credits': 'CREDITS',
    'hud.power': 'POWER',
    'hud.population': 'FORCE',
    'hud.wave': 'WAVE',
    'hud.timer': 'TIME',
    'hud.creditsAria': 'Current credits',
    'hud.powerAria': 'Current power',
    'hud.populationAria': 'Current population',
    'hud.waveAria': 'Current wave',
    'hud.timerAria': 'Mission timer',
    'hud.wave.first': 'WAVE 00 · {seconds}s',
    'hud.wave.active': 'WAVE {wave} · {seconds}s',

    'controls.pause': 'Pause',
    'controls.pauseAria': 'Pause game',
    'controls.resume': 'Resume',
    'controls.resumeAria': 'Resume game',
    'controls.sound': 'Sound',
    'controls.soundDisableAria': 'Mute sound',
    'controls.soundEnableAria': 'Enable sound',
    'controls.soundEnabled': 'Sound enabled',
    'controls.soundDisabled': 'Sound disabled',
    'controls.help': 'Help',
    'controls.helpOpenAria': 'Open field manual',

    'mobile.controls': 'Touch tactical controls',
    'mobile.production': 'BUILD',
    'mobile.minimap': 'MAP',
    'mobile.pan': 'PAN',
    'mobile.panEnableAria': 'Switch to camera drag mode',
    'mobile.panDisableAria': 'Switch to box-select mode',
    'mobile.focus': 'FOCUS',
    'mobile.closeProduction': 'Close production panel',
    'mobile.closeMinimap': 'Close minimap',
    'mobile.closePanels': 'Close tactical panels',
    'mobile.touchHint': 'Tap to select · Drag to pan · Tap PAN to switch to box selection',

    'rack.queue': 'PRODUCTION QUEUE',
    'rack.build': 'BASE FACILITIES',
    'rack.units': 'COMBAT ROSTER',
    'rack.events': 'TACTICAL FEED',
    'queue.standby': 'IDLE',
    'queue.noTasks': 'No production orders',
    'queue.empty': 'Production channel clear',
    'queue.remaining.one': '{count} item queued',
    'queue.remaining.other': '{count} items queued',
    'event.connected': 'Control link established',
    'event.awaitAuthorization': 'Awaiting operation authorization',
    'event.waiting': 'Awaiting sector uplink',

    'build.role.powerPlant': '+POWER',
    'build.role.refinery': '+CREDITS',
    'build.role.barracks': 'INFANTRY',
    'build.role.factory': 'VEHICLES',
    'build.role.airfield': 'AIR FORCE',
    'build.role.turret': 'DEFENSE',
    'unit.role.rifle': 'ANTI-INFANTRY',
    'unit.role.rocket': 'ANTI-ARMOR',
    'unit.role.scout': 'HIGH MOBILITY',
    'unit.role.tank': 'HEAVY ARMOR',
    'unit.role.fighter': 'AIR / GROUND',
    'unit.role.harvester': 'ECONOMY',
    'tooltip.production': '{name} · {cost} CREDITS · {seconds}s',

    'minimap.title': 'SECTOR SURVEY',
    'minimap.fallback': 'Tactical minimap',
    'selection.title': 'CURRENT GROUP',
    'selection.none': 'NO UNIT SELECTED',
    'selection.noneUnitHint': 'Drag-select or click a unit',
    'selection.noneFacilityHint': 'Drag-select or click a facility',
    'selection.group': '{count} UNITS · GROUP LINK ONLINE',
    'selection.entity': '{name} · {kind} {id}',
    'selection.health': '{status} · INTEGRITY {hp} / {maxHp}',
    'entity.kind.unit': 'UNIT',
    'entity.kind.structure': 'STRUCTURE',
    'commands.title': 'COMMAND ECHO',
    'commands.move': 'MOVE',
    'commands.attackMove': 'ATTACK MOVE',
    'commands.patrol': 'PATROL',
    'commands.hold': 'HOLD POSITION',
    'commands.rally': 'SET RALLY POINT',
    'commands.stop': 'STOP',
    'groups.title': 'CONTROL GROUPS',
    'groups.hint': 'Ctrl/Cmd + number to save · double-click to focus',
    'groups.slot.emptyAria': 'Control group {slot}, empty',
    'groups.slot.countAria': 'Control group {slot}, {count} entities; click to select, double-click to focus',

    'briefing.archive': 'OPERATION FILE 07—C',
    'briefing.clearance': 'CLEARANCE: FIELD',
    'briefing.localizedTitle': 'IRON DAWN: ZERO SECTOR',
    'briefing.lead': 'The old world has gone silent. Advance into Zero Sector and sever the command chain before the Red Sand Legion seals the corridor.',
    'briefing.title': 'MISSION BRIEF',
    'briefing.story1': 'In 1983, the Northern Industrial Corridor vanished from the network overnight. The <strong>Red Sand Legion</strong> is advancing along the abandoned power grid, using an armored command core in Zero Sector to suppress every signal.',
    'briefing.story2': 'You are Dock Seven’s last tactical dispatcher. Exploit the expanded crystal reserves, establish a combined ground-air production chain, and break the enemy line with armor and interceptors before destroying its command core. If your own core falls first, the city goes dark for good.',
    'briefing.point1': 'Build power and refining infrastructure',
    'briefing.point2': 'Field ground and air forces',
    'briefing.point3': 'Destroy the enemy command core',
    'briefing.controls': 'BASIC CONTROLS',
    'briefing.selectKey': 'LEFT CLICK',
    'briefing.select': 'Select units; drag to form a group',
    'briefing.commandKey': 'RIGHT CLICK',
    'briefing.command': 'Move; attack when targeting an enemy',
    'briefing.camera': 'Pan the battlefield camera',
    'briefing.home': 'Return camera to your base',
    'briefing.commandKeys': 'Move / Attack Move / Stop',
    'briefing.tacticalKeys': 'Patrol / Hold Position / Rally Point',
    'briefing.groups': 'Save groups; double-tap a number to focus',
    'briefing.queueCommands': 'Queue up to 16 move or attack orders',
    'difficulty.title': 'SELECT CLEARANCE',
    'difficulty.easy.description': 'Fewer enemies and a stronger economy',
    'difficulty.normal.description': 'Standard assault and resource balance',
    'difficulty.hard.description': 'Stronger enemies with less preparation time',
    'briefing.encrypted': 'LINK ENCRYPTED',
    'briefing.localOnly': 'This operation runs locally in your browser. No network required.',
    'start.action': 'BEGIN OPERATION',
    'assets.preparing': 'PREPARING ASSET MANIFEST',
    'assets.progress': 'LOADING ART ASSETS {loaded} / {total}',
    'assets.failedNotice': '{count} art assets failed to load; vector fallbacks enabled.',
    'assets.animationFailedNotice': '{count} animation sheets failed to load; affected entities will use static art.',
    'assets.status.uplink': 'ASSET UPLINK',
    'assets.status.ready': 'TACTICAL LINK READY',
    'assets.status.degraded': 'DEGRADED ART · {count}',
    'assets.status.procedural': 'PROCEDURAL FALLBACK',

    'pause.title': 'TACTICAL LINK FROZEN',
    'pause.copy': 'All units and production timers are paused. Battlefield state remains buffered.',
    'pause.resume': 'RESUME OPERATION',
    'result.defaultTitle': 'ZERO SECTOR SECURED',
    'result.defaultCopy': 'The Red Sand command core is dark. The first navigation beacon is burning over the city again.',
    'result.victory': 'SECTOR CONTROLLED',
    'result.defeat': 'COMMAND LINK LOST',
    'result.duration': 'OPERATION TIME',
    'result.kills': 'TARGETS DESTROYED',
    'result.losses': 'UNITS LOST',
    'result.harvested': 'CREDITS REFINED',
    'result.restart': 'REDEPLOY',

    'help.title': 'CONSOLE CONTROLS',
    'help.closeAria': 'Close field manual',
    'help.selection': 'SELECTION & ORDERS',
    'help.selectKey': 'LEFT CLICK',
    'help.select': 'Select a unit or structure',
    'help.dragKey': 'DRAG',
    'help.drag': 'Box-select multiple units',
    'help.touchPanKey': 'PAN',
    'help.touchPan': 'Drag the battlefield in pan mode; turn it off to box-select',
    'help.commandKey': 'RIGHT CLICK',
    'help.command': 'Move or attack a target',
    'help.queue': 'Append move, attack, or attack-move orders to the command queue',
    'help.moveMode': 'Enter move-order mode',
    'help.attackMode': 'Enter attack-move mode',
    'help.patrol': 'Set a repeating patrol route',
    'help.hold': 'Hold position without chasing targets beyond weapon range',
    'help.rally': 'Set a rally point for a barracks, vehicle factory, or airfield',
    'help.stop': 'Stop and clear the command queue',
    'help.groups': 'Save a group; press its number to recall and twice to focus',
    'help.camera': 'CAMERA & SYSTEM',
    'help.pan': 'Pan the camera; screen-edge scrolling also works',
    'help.home': 'Return camera to your base',
    'help.focusSelection': 'Center the camera on the current selection',
    'help.minimapKey': 'MINIMAP',
    'help.minimap': 'Click to jump to a location',
    'help.pause': 'Cancel the current mode; otherwise pause or resume',
    'help.manual': 'Open this field manual',
    'help.tip': 'TIP',
    'help.tipCopy': 'Crystal reserves have grown again. Ground forces now route around structures and crystal fields; build an airfield so interceptors can provide rapid support.',

    'status.standby': 'STANDBY',
    'status.constructing': 'CONSTRUCTING {percent}%',
    'status.producing': 'PRODUCING {unit}',
    'status.lowPower': 'LOW POWER',
    'status.online': 'ONLINE',
    'status.harvester.seeking': 'SEEKING CRYSTALS',
    'status.harvester.toMine': 'EN ROUTE TO FIELD',
    'status.harvester.mining': 'HARVESTING',
    'status.harvester.toRefinery': 'RETURNING TO REFINERY',
    'status.harvester.unloading': 'UNLOADING',
    'status.harvester.manual': 'MANUAL MOVE',
    'status.harvester.cargo': '{state} · {cargo}/{capacity}',
    'status.command.moving': 'MOVING',
    'status.command.attackMove': 'ATTACK MOVING',
    'status.command.engaging': 'ENGAGING',
    'status.command.patrol': 'PATROLLING',
    'status.command.hold': 'HOLDING POSITION',

    'team.player.name': 'Northern Alliance',
    'team.enemy.name': 'Red Sand Legion',
    'entity.unit.rifle.name': 'Rifle Infantry',
    'entity.unit.rifle.short': 'RFL',
    'entity.unit.rocket.name': 'Rocket Infantry',
    'entity.unit.rocket.short': 'RKT',
    'entity.unit.scout.name': 'Hound Scout Car',
    'entity.unit.scout.short': 'SCT',
    'entity.unit.tank.name': 'Bastion Battle Tank',
    'entity.unit.tank.short': 'TNK',
    'entity.unit.fighter.name': 'Dawn Interceptor',
    'entity.unit.fighter.short': 'INT',
    'entity.unit.harvester.name': 'Crystal Harvester',
    'entity.unit.harvester.short': 'HRV',
    'entity.building.hq.name': 'Command Core',
    'entity.building.hq.short': 'CORE',
    'entity.building.powerPlant.name': 'Fission Power Plant',
    'entity.building.powerPlant.short': 'PWR',
    'entity.building.refinery.name': 'Crystal Refinery',
    'entity.building.refinery.short': 'REF',
    'entity.building.barracks.name': 'Forward Barracks',
    'entity.building.barracks.short': 'BAR',
    'entity.building.factory.name': 'Vehicle Factory',
    'entity.building.factory.short': 'FAC',
    'entity.building.airfield.name': 'Skyforge Airfield',
    'entity.building.airfield.short': 'AF',
    'entity.building.turret.name': 'Sentry Autocannon',
    'entity.building.turret.short': 'TUR',
    'difficulty.easy.name': 'Recruit',
    'difficulty.normal.name': 'Commander',
    'difficulty.hard.name': 'Veteran',

    'game.start.objective': 'Sector link established. Destroy the Red Sand command core.',
    'game.start.harvesterAuto': 'The harvester is moving to the nearest crystal field.',
    'game.result.timeout': 'The communications window closed before the enemy core was destroyed. Operation withdrawn.',
    'game.building.completed': '{entity} connected to the base network.',
    'game.unit.deployed': '{entity} deployment complete.',
    'game.entity.lost': '{entity} lost.',
    'game.enemyHq.collapsed': 'Enemy command core has suffered structural collapse!',
    'game.insufficientCredits': 'Insufficient credits: {entity} requires {cost}.',
    'game.populationFull': 'Population cap reached.',
    'game.noProducer': 'No facility can produce {entity}.',
    'game.queueFull': 'Production queue is full.',
    'game.queued': '{entity} added to the production queue.',
    'game.prerequisiteMissing': 'Tech chain incomplete. Cannot construct {entity}.',
    'game.selectBuildLocation': 'Select a deployment site for {entity}; right-click or press Esc to cancel.',
    'game.foundationPlaced': '{entity} foundation deployed.',
    'game.build.unknown': 'Unknown facility',
    'game.build.outOfBounds': 'Outside sector boundary',
    'game.build.outOfRadius': 'Outside base construction radius',
    'game.build.overlap': 'Overlaps an existing facility',
    'game.build.oreBlocked': 'Crystal field blocks deployment',
    'game.selectUnits': 'Select combat units first.',
    'game.attackMovePrompt': 'Attack move: select a battlefield destination.',
    'game.movePrompt': 'Move: select a battlefield destination.',
    'game.patrolPrompt': 'Patrol: select a battlefield turnaround point.',
    'game.holdSet': 'Selected units are holding position.',
    'game.rallyPrompt': 'Rally point: select a destination for the chosen production facilities.',
    'game.rallySet': 'Production rally point set.',
    'game.rallyCleared': 'Production rally point cleared.',
    'game.group.assigned': 'Control group {slot} saved ({count} entities).',
    'game.group.cleared': 'Control group {slot} cleared.',
    'game.group.recalled': 'Control group {slot} recalled ({count} entities).',
    'game.deploymentCancelled': 'Facility deployment cancelled.',
    'game.result.mutualLoss': 'Both command cores went offline. Sector status: withdrawal.',
    'game.result.victory': 'The Red Sand command chain is severed. Zero Sector belongs to the Northern Alliance.',
    'game.result.defeat': 'Your command core was destroyed. Tactical link lost.',
    'ai.wave.incoming': 'Long-range detection: enemy column forming.',
    'ai.wave.launched.one': 'Enemy wave {wave} crossed the perimeter ({count} unit).',
    'ai.wave.launched.other': 'Enemy wave {wave} crossed the perimeter ({count} units).',
    'canvas.oreGain': '+{amount} CRYSTALS',
    'canvas.productionProgress': '{unit} {percent}%',
    'canvas.hostileSignal': 'HOSTILE SIGNAL',
    'canvas.deploymentValid': 'DEPLOYMENT VALID',
    'canvas.deploymentBlocked': 'DEPLOYMENT BLOCKED',
    'canvas.surveyLimit': 'ZERO SURVEY / LIMIT 00',
    'canvas.coordinate': 'ZERO TABLE // X {x}  Y {y}',
  };

  const DICTIONARIES = Object.freeze({
    'zh-CN': Object.freeze(ZH),
    en: Object.freeze(EN),
  });

  function normalizeLocale(value) {
    const input = String(value || '').trim().toLowerCase();
    if (input === 'en' || input.startsWith('en-')) return 'en';
    if (input === 'zh' || input.startsWith('zh-')) return 'zh-CN';
    return 'zh-CN';
  }

  function createI18n(options) {
    const opts = options || {};
    const environment = opts.root || root || {};
    const documents = new Set();
    const listeners = new Set();
    let storage = opts.storage;
    if (storage === undefined) {
      try { storage = environment.localStorage || null; } catch (_) { storage = null; }
    }

    const storedLocale = (() => {
      try { return storage && storage.getItem ? storage.getItem(STORAGE_KEY) : null; } catch (_) { return null; }
    })();
    const browserLocale = opts.browserLocale != null
      ? opts.browserLocale : environment.navigator && environment.navigator.language;
    let locale = normalizeLocale(opts.locale || storedLocale || browserLocale || 'zh-CN');

    const resolveValue = (value) => {
      if (value && typeof value === 'object' && value.$t) return translate(value.$t, value.params);
      return value == null ? '' : String(value);
    };

    function translate(key, params, requestedLocale) {
      const language = normalizeLocale(requestedLocale || locale);
      const template = DICTIONARIES[language][key] ?? DICTIONARIES['zh-CN'][key] ?? key;
      if (!params) return template;
      return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
        Object.prototype.hasOwnProperty.call(params, name) ? resolveValue(params[name]) : match
      ));
    }

    function plural(key, count, params) {
      let category = 'other';
      try { category = new Intl.PluralRules(locale).select(Number(count)); } catch (_) { category = Number(count) === 1 ? 'one' : 'other'; }
      const dictionary = DICTIONARIES[locale];
      const resolvedKey = dictionary[`${key}.${category}`] ? `${key}.${category}` : `${key}.other`;
      return translate(resolvedKey, { ...(params || {}), count });
    }

    function formatNumber(value) {
      try { return Number(value).toLocaleString(locale); } catch (_) { return String(value); }
    }

    function apply(documentRoot) {
      const doc = documentRoot && documentRoot.querySelectorAll
        ? documentRoot : environment.document;
      if (!doc || typeof doc.querySelectorAll !== 'function') return;
      const html = doc.documentElement || (doc.ownerDocument && doc.ownerDocument.documentElement);
      if (html) html.lang = locale;
      doc.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = translate(element.dataset.i18n);
      });
      doc.querySelectorAll('[data-i18n-html]').forEach((element) => {
        element.innerHTML = translate(element.dataset.i18nHtml);
      });
      const attributes = [
        ['data-i18n-aria-label', 'aria-label'],
        ['data-i18n-title', 'title'],
        ['data-i18n-content', 'content'],
      ];
      attributes.forEach(([dataAttribute, attribute]) => {
        doc.querySelectorAll(`[${dataAttribute}]`).forEach((element) => {
          element.setAttribute(attribute, translate(element.getAttribute(dataAttribute)));
        });
      });
      doc.querySelectorAll('[data-language]').forEach((button) => {
        const active = normalizeLocale(button.dataset.language) === locale;
        button.setAttribute('aria-pressed', String(active));
        const languageName = button.dataset.language === 'en' ? 'English' : '简体中文';
        button.setAttribute('title', languageName);
        button.setAttribute('aria-label', languageName);
      });
    }

    function setLocale(nextLocale, optionsForSet) {
      const normalized = normalizeLocale(nextLocale);
      const changed = normalized !== locale;
      locale = normalized;
      if (!optionsForSet || optionsForSet.persist !== false) {
        try { if (storage && storage.setItem) storage.setItem(STORAGE_KEY, locale); } catch (_) { /* Storage is optional. */ }
      }
      documents.forEach((doc) => apply(doc));
      if (changed) listeners.forEach((listener) => {
        try { listener(locale); } catch (_) { /* Language listeners are isolated. */ }
      });
      return locale;
    }

    function bind(documentRoot) {
      const doc = documentRoot || environment.document;
      if (!doc || typeof doc.querySelectorAll !== 'function') return;
      documents.add(doc);
      doc.querySelectorAll('[data-language]').forEach((button) => {
        if (button.dataset.languageBound === 'true') return;
        button.dataset.languageBound = 'true';
        button.addEventListener('click', () => setLocale(button.dataset.language));
      });
      apply(doc);
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return Object.freeze({
      t: translate,
      plural,
      formatNumber,
      normalizeLocale,
      getLocale: () => locale,
      setLocale,
      apply,
      bind,
      subscribe,
      has: (key, requestedLocale) => Boolean(DICTIONARIES[normalizeLocale(requestedLocale || locale)][key]),
    });
  }

  const defaultInstance = createI18n({ root });
  return Object.freeze({
    ...defaultInstance,
    createI18n,
    normalizeLocale,
    dictionaries: DICTIONARIES,
    supportedLocales: SUPPORTED_LOCALES,
    storageKey: STORAGE_KEY,
  });
});
