import { getAdvancedApplicationStatus } from '../../shared/types';

describe('流程时间与当前进度双向联动', () => {
  it('填写测评时间会从收藏推进到测评', () => {
    expect(
      getAdvancedApplicationStatus(
        '收藏',
        {},
        { 测评: '2026-09-05T10:00:00Z' },
      ),
    ).toBe('测评');
  });

  it('一次填写多个节点时推进到最远节点', () => {
    expect(
      getAdvancedApplicationStatus(
        '已投递',
        {},
        {
          测评: '2026-09-05T10:00:00Z',
          一面: '2026-09-06T10:00:00Z',
        },
      ),
    ).toBe('一面');
  });

  it('补录较早节点不会让进度回退', () => {
    expect(
      getAdvancedApplicationStatus(
        'AI面试',
        {},
        { 测评: '2026-09-05T10:00:00Z' },
      ),
    ).toBe('AI面试');
  });

  it('修改已有节点时间不会误触发其他进度', () => {
    expect(
      getAdvancedApplicationStatus(
        '一面',
        { 测评: '2026-09-05T10:00:00Z' },
        { 测评: '2026-09-05T11:00:00Z' },
      ),
    ).toBe('一面');
  });

  it('清空节点时间不会回退进度', () => {
    expect(
      getAdvancedApplicationStatus(
        '测评',
        { 测评: '2026-09-05T10:00:00Z' },
        {},
      ),
    ).toBe('测评');
  });

  it('结果态不会因补录流程时间而回退', () => {
    expect(
      getAdvancedApplicationStatus(
        '已拒绝',
        {},
        { 已Offer: '2026-09-05T10:00:00Z' },
      ),
    ).toBe('已拒绝');
  });
});


