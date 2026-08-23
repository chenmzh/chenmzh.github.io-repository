/* Synthetic teaching data only. These values are not paper or course results. */
window.CS329A_DATA = Object.freeze({
  scaling: Object.freeze([
    Object.freeze({ budget: 1, samples: 1, verifier: 'off', success: 42, cost: 1.0 }),
    Object.freeze({ budget: 2, samples: 2, verifier: 'off', success: 58, cost: 2.0 }),
    Object.freeze({ budget: 4, samples: 4, verifier: 'off', success: 68, cost: 4.0 }),
    Object.freeze({ budget: 8, samples: 8, verifier: 'off', success: 74, cost: 8.0 }),
    Object.freeze({ budget: 2, samples: 2, verifier: 'on', success: 66, cost: 2.8 }),
    Object.freeze({ budget: 4, samples: 4, verifier: 'on', success: 79, cost: 5.2 }),
    Object.freeze({ budget: 8, samples: 8, verifier: 'on', success: 84, cost: 9.6 })
  ]),
  candidates: Object.freeze([
    Object.freeze({ id: 'A', answer: 'x = 4', answerStatus: 'pass', process: '一步跳到结果', processStatus: 'warn', score: 0.68 }),
    Object.freeze({ id: 'B', answer: 'x = 4', answerStatus: 'pass', process: '逐步移项并代回', processStatus: 'pass', score: 0.94 }),
    Object.freeze({ id: 'C', answer: 'x = 5', answerStatus: 'fail', process: '移项符号错误', processStatus: 'fail', score: 0.12 }),
    Object.freeze({ id: 'D', answer: 'x = 4', answerStatus: 'pass', process: '缺少中间步骤', processStatus: 'warn', score: 0.58 })
  ]),
  toolTrace: Object.freeze([
    Object.freeze({ step: '提议补丁', actor: 'agent', state: 'candidate', detail: '为 parse_date 增加 ISO 分支' }),
    Object.freeze({ step: '运行测试', actor: 'tool', state: 'observe', detail: '2/10 失败：时区后缀未处理' }),
    Object.freeze({ step: '检查反馈', actor: 'verifier', state: 'feedback', detail: '保留失败样例，拒绝当前补丁' }),
    Object.freeze({ step: '生成修订', actor: 'agent', state: 'retry', detail: '补充 Z / offset 解析路径' }),
    Object.freeze({ step: '再次测试', actor: 'tool', state: 'accepted', detail: '10/10 通过（教学模拟）' })
  ]),
  planning: Object.freeze([
    Object.freeze({ id: 'start', label: '目标：开门', x: 60, y: 110, kind: 'start' }),
    Object.freeze({ id: 'key', label: '拿钥匙', x: 260, y: 55, kind: 'good' }),
    Object.freeze({ id: 'wall', label: '撞墙', x: 260, y: 165, kind: 'bad' }),
    Object.freeze({ id: 'door', label: '开门', x: 465, y: 55, kind: 'good' }),
    Object.freeze({ id: 'dead', label: '死路', x: 465, y: 165, kind: 'bad' })
  ]),
  memory: Object.freeze([
    Object.freeze({ id: 'm1', text: 'ISO 日期常带 Z 后缀', tags: 'date, parser', freshness: 'fresh', relevance: 0.94, tokens: 8 }),
    Object.freeze({ id: 'm2', text: '旧 API 的错误码已废弃', tags: 'api, legacy', freshness: 'stale', relevance: 0.34, tokens: 7 }),
    Object.freeze({ id: 'm3', text: '先跑小测试再扩大补丁', tags: 'testing, workflow', freshness: 'fresh', relevance: 0.77, tokens: 9 }),
    Object.freeze({ id: 'm4', text: '用户偏好短回答', tags: 'style, user', freshness: 'fresh', relevance: 0.21, tokens: 6 })
  ]),
  horizon: Object.freeze([
    Object.freeze({ steps: 1, error: 0.05, checkpoint: false, survival: 95, cost: 1.0 }),
    Object.freeze({ steps: 3, error: 0.05, checkpoint: false, survival: 86, cost: 3.0 }),
    Object.freeze({ steps: 6, error: 0.05, checkpoint: false, survival: 74, cost: 6.0 }),
    Object.freeze({ steps: 10, error: 0.05, checkpoint: false, survival: 60, cost: 10.0 }),
    Object.freeze({ steps: 3, error: 0.05, checkpoint: true, survival: 91, cost: 3.8 }),
    Object.freeze({ steps: 6, error: 0.05, checkpoint: true, survival: 84, cost: 7.6 }),
    Object.freeze({ steps: 10, error: 0.05, checkpoint: true, survival: 76, cost: 12.5 })
  ])
});
