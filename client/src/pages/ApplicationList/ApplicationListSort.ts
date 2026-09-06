import { parseApplicationTime } from '@/lib/application-time';
import {
  STATUS_ORDER,
  formatLocations,
  type ApplicationRecord,
} from '@shared/types';

export type ApplicationListSortOption =
  | 'updated'
  | 'favorite'
  | 'applied'
  | 'status'
  | 'company'
  | 'function'
  | 'channel'
  | 'location'
  | 'industry';

export type ApplicationListSortDirection = 'asc' | 'desc';

export interface ApplicationListSortState {
  sortBy: ApplicationListSortOption;
  sortDirection: ApplicationListSortDirection;
  autoFavoriteSort: boolean;
}

export const APPLICATION_LIST_DEFAULT_SORT_DIRECTIONS: Record<
  ApplicationListSortOption,
  ApplicationListSortDirection
> = {
  updated: 'desc',
  favorite: 'desc',
  applied: 'desc',
  status: 'asc',
  company: 'asc',
  function: 'asc',
  channel: 'asc',
  location: 'asc',
  industry: 'asc',
};

function getTimestamp(value?: string): number {
  return parseApplicationTime(value)?.getTime() || 0;
}

export function sortApplicationRecords(
  data: ApplicationRecord[],
  sortBy: ApplicationListSortOption,
  sortDirection: ApplicationListSortDirection,
): ApplicationRecord[] {
  const direction: number = sortDirection === 'asc' ? 1 : -1;
  const compareText = (left?: string, right?: string): number => {
    const leftValue: string = left?.trim() || '';
    const rightValue: string = right?.trim() || '';
    if (!leftValue && !rightValue) return 0;
    if (!leftValue) return 1;
    if (!rightValue) return -1;
    return leftValue.localeCompare(rightValue, 'zh-CN') * direction;
  };
  const compareTime = (left?: string, right?: string): number => {
    const leftValue: number = getTimestamp(left);
    const rightValue: number = getTimestamp(right);
    if (!leftValue && !rightValue) return 0;
    if (!leftValue) return 1;
    if (!rightValue) return -1;
    return (leftValue - rightValue) * direction;
  };
  const compareCompany = (
    left: ApplicationRecord,
    right: ApplicationRecord,
  ): number =>
    compareText(left.fields['公司名称'], right.fields['公司名称']) ||
    compareText(left.fields['岗位名称'], right.fields['岗位名称']);
  const compareUpdatedTime = (
    left: ApplicationRecord,
    right: ApplicationRecord,
  ): number =>
    compareTime(
      left.updated_at || left.created_at,
      right.updated_at || right.created_at,
    );

  return [...data].sort(
    (left: ApplicationRecord, right: ApplicationRecord): number => {
      if (sortBy === 'company') return compareCompany(left, right);
      if (sortBy === 'status') {
        const leftRank: number = STATUS_ORDER.indexOf(
          left.fields['当前进度'] || '收藏',
        );
        const rightRank: number = STATUS_ORDER.indexOf(
          right.fields['当前进度'] || '收藏',
        );
        if (leftRank !== rightRank) return (leftRank - rightRank) * direction;
        return compareCompany(left, right);
      }
      if (sortBy === 'favorite') {
        return (
          compareTime(left.fields['收藏时间'], right.fields['收藏时间']) ||
          compareUpdatedTime(left, right) ||
          compareCompany(left, right)
        );
      }
      if (sortBy === 'applied') {
        return (
          compareTime(left.fields['投递时间'], right.fields['投递时间']) ||
          compareCompany(left, right)
        );
      }
      if (sortBy === 'updated') {
        return compareUpdatedTime(left, right) || compareCompany(left, right);
      }
      if (sortBy === 'function') {
        return (
          compareText(
            left.fields['职能方向']?.[0],
            right.fields['职能方向']?.[0],
          ) ||
          compareText(left.fields['招聘渠道'], right.fields['招聘渠道']) ||
          compareCompany(left, right)
        );
      }
      if (sortBy === 'channel') {
        return (
          compareText(left.fields['招聘渠道'], right.fields['招聘渠道']) ||
          compareText(
            left.fields['职能方向']?.[0],
            right.fields['职能方向']?.[0],
          ) ||
          compareCompany(left, right)
        );
      }
      if (sortBy === 'location') {
        return (
          compareText(
            formatLocations(left.fields['工作地区']),
            formatLocations(right.fields['工作地区']),
          ) ||
          compareText(left.fields['所属行业'], right.fields['所属行业']) ||
          compareCompany(left, right)
        );
      }
      return (
        compareText(left.fields['所属行业'], right.fields['所属行业']) ||
        compareText(
          formatLocations(left.fields['工作地区']),
          formatLocations(right.fields['工作地区']),
        ) ||
        compareCompany(left, right)
      );
    },
  );
}

export function getApplicationListSortDirectionLabel(
  sortBy: ApplicationListSortOption,
  sortDirection: ApplicationListSortDirection,
): string {
  if (['updated', 'favorite', 'applied'].includes(sortBy)) {
    return sortDirection === 'asc' ? '旧 → 新' : '新 → 旧';
  }
  if (sortBy === 'status') {
    return sortDirection === 'asc' ? '前 → 后' : '后 → 前';
  }
  return sortDirection === 'asc' ? 'A → Z' : 'Z → A';
}

export function getStatusSortTransition(
  currentStatus: string,
  nextStatus: string,
  currentSort: ApplicationListSortState,
): ApplicationListSortState {
  const enteringFavorite: boolean =
    nextStatus === '收藏' && currentStatus !== '收藏';
  const leavingFavorite: boolean =
    nextStatus !== '收藏' && currentStatus === '收藏';
  if (enteringFavorite && currentSort.sortBy === 'applied') {
    return {
      sortBy: 'favorite',
      sortDirection: 'desc',
      autoFavoriteSort: true,
    };
  }
  if (leavingFavorite && currentSort.autoFavoriteSort) {
    return {
      sortBy:
        currentSort.sortBy === 'favorite' ? 'applied' : currentSort.sortBy,
      sortDirection:
        currentSort.sortBy === 'favorite' ? 'desc' : currentSort.sortDirection,
      autoFavoriteSort: false,
    };
  }
  return currentSort;
}


