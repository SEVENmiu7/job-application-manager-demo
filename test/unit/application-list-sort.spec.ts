import {
  getApplicationListSortDirectionLabel,
  getStatusSortTransition,
  sortApplicationRecords,
} from '../../client/src/pages/ApplicationList/ApplicationListSort';
import type { ApplicationRecord } from '../../shared/types';

function createRecord(
  company: string,
  favoriteTime?: string,
  updatedAt?: string,
): ApplicationRecord {
  return {
    record_id: company,
    updated_at: updatedAt,
    fields: {
      公司名称: company,
      岗位名称: '产品经理',
      工作地区: [],
      所属行业: '',
      职能方向: [],
      招聘渠道: '',
      收藏时间: favoriteTime,
      流程时间: {},
      当前进度: '收藏',
      下一步安排: '',
      个人备注: '',
      简历标识: '',
    },
  };
}

describe('投递列表收藏时间排序', () => {
  const records: ApplicationRecord[] = [
    createRecord('较早收藏', '2026-09-01T08:00:00Z'),
    createRecord('未记录'),
    createRecord('最近收藏', '2026-09-05T08:00:00Z'),
  ];

  it('默认按收藏时间从新到旧排列，未记录项置底', () => {
    expect(
      sortApplicationRecords(records, 'favorite', 'desc').map(
        (record: ApplicationRecord) => record.fields['公司名称'],
      ),
    ).toEqual(['最近收藏', '较早收藏', '未记录']);
  });

  it('切换方向后按旧到新排列，未记录项仍置底', () => {
    expect(
      sortApplicationRecords(records, 'favorite', 'asc').map(
        (record: ApplicationRecord) => record.fields['公司名称'],
      ),
    ).toEqual(['较早收藏', '最近收藏', '未记录']);
  });

  it('收藏时间相同时使用更新时间稳定排序', () => {
    const tiedRecords: ApplicationRecord[] = [
      createRecord('较早更新', '2026-09-05T08:00:00Z', '2026-09-05T09:00:00Z'),
      createRecord('最近更新', '2026-09-05T08:00:00Z', '2026-09-05T10:00:00Z'),
    ];
    expect(
      sortApplicationRecords(tiedRecords, 'favorite', 'desc').map(
        (record: ApplicationRecord) => record.fields['公司名称'],
      ),
    ).toEqual(['最近更新', '较早更新']);
  });

  it('时间类排序显示新旧方向', () => {
    expect(getApplicationListSortDirectionLabel('favorite', 'desc')).toBe(
      '新 → 旧',
    );
  });
});

describe('收藏筛选与排序联动', () => {
  it('从默认投递时间排序进入收藏时自动切换', () => {
    expect(
      getStatusSortTransition('', '收藏', {
        sortBy: 'applied',
        sortDirection: 'desc',
        autoFavoriteSort: false,
      }),
    ).toEqual({
      sortBy: 'favorite',
      sortDirection: 'desc',
      autoFavoriteSort: true,
    });
  });

  it('用户已选其他排序时不会被收藏筛选覆盖', () => {
    expect(
      getStatusSortTransition('', '收藏', {
        sortBy: 'company',
        sortDirection: 'asc',
        autoFavoriteSort: false,
      }),
    ).toEqual({
      sortBy: 'company',
      sortDirection: 'asc',
      autoFavoriteSort: false,
    });
  });

  it('离开收藏时只恢复系统自动切换的排序', () => {
    expect(
      getStatusSortTransition('收藏', '已投递', {
        sortBy: 'favorite',
        sortDirection: 'desc',
        autoFavoriteSort: true,
      }),
    ).toEqual({
      sortBy: 'applied',
      sortDirection: 'desc',
      autoFavoriteSort: false,
    });
  });
});


