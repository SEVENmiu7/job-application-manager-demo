import {
  getCurrentStageTime,
  type StageTimeFields,
} from '../../client/src/lib/stage-time';

const APPLY = '2026-08-24T00:00:00.000Z'; // 8/24 08:00 北京时间
const AI = '2026-08-31T08:56:00.000Z'; // 8/31 16:56 北京时间
const FIRST = '2026-08-28T02:00:00.000Z'; // 8/28 10:00 北京时间

function base(overrides: Partial<StageTimeFields>): StageTimeFields {
  return { 当前进度: '收藏', ...overrides };
}

describe('getCurrentStageTime', () => {
  it('正常节点：显示当前进度与对应流程时间', () => {
    const result = getCurrentStageTime(
      base({ 当前进度: 'AI面试', 流程时间: { AI面试: AI } }),
    );
    expect(result.stage).toBe('AI面试');
    expect(result.missing).toBe(false);
    expect(result.time).toBe('8/31 16:56');
    expect(result.timestamp).toBe(new Date(AI).getTime());
    expect(result.reviewable).toBe(true);
  });

  it('节点时间为空：显示当前节点 · 未记录，不得冒充', () => {
    const result = getCurrentStageTime(
      base({
        当前进度: '二面',
        流程时间: { 一面: FIRST },
        投递时间: APPLY,
      }),
    );
    expect(result.stage).toBe('二面');
    expect(result.time).toBeUndefined();
    expect(result.missing).toBe(true);
    expect(result.timestamp).toBe(0);
    expect(result.rawTime).toBeUndefined();
  });

  it('已投递：第一行显示已投递与投递时间', () => {
    const result = getCurrentStageTime(base({ 当前进度: '已投递', 投递时间: APPLY }));
    expect(result.stage).toBe('已投递');
    expect(result.time).toBe('8/24 08:00');
    expect(result.reviewable).toBe(false);
  });

  it('收藏与准备中使用收藏时间', () => {
    const favorite = '2026-08-20T01:00:00.000Z';
    const asFavorite = getCurrentStageTime(
      base({ 当前进度: '收藏', 收藏时间: favorite }),
    );
    expect(asFavorite.stage).toBe('收藏');
    expect(asFavorite.rawTime).toBe(favorite);
    const asPreparing = getCurrentStageTime(
      base({ 当前进度: '准备中', 收藏时间: favorite }),
    );
    expect(asPreparing.stage).toBe('收藏');
    expect(asPreparing.rawTime).toBe(favorite);
  });

  it('已拒绝：显示实际时间最近的流程节点，乱序时间也正确', () => {
    const result = getCurrentStageTime(
      base({
        当前进度: '已拒绝',
        流程时间: { 一面: FIRST, AI面试: AI, 笔试: '2026-08-25T02:00:00.000Z' },
        投递时间: APPLY,
      }),
    );
    // AI面试时间（8/31）晚于一面的 8/28
    expect(result.stage).toBe('AI面试');
    expect(result.time).toBe('8/31 16:56');
    expect(result.reviewable).toBe(true);
  });

  it('已拒绝且无流程时间：回退到投递时间', () => {
    const result = getCurrentStageTime(
      base({ 当前进度: '已拒绝', 投递时间: APPLY }),
    );
    expect(result.stage).toBe('已拒绝');
    expect(result.time).toBe('8/24 08:00');
    expect(result.rawTime).toBe(APPLY);
  });

  it('无效日期不参与选择', () => {
    const result = getCurrentStageTime(
      base({
        当前进度: '已拒绝',
        流程时间: { 一面: 'not-a-date' },
        投递时间: APPLY,
      }),
    );
    expect(result.stage).toBe('已拒绝');
    expect(result.rawTime).toBe(APPLY);
  });

  it('完全空数据：missing 为真且不抛错', () => {
    const result = getCurrentStageTime(base({ 当前进度: '已投递' }));
    expect(result.stage).toBe('已投递');
    expect(result.missing).toBe(true);
    expect(result.timestamp).toBe(0);
  });
});


