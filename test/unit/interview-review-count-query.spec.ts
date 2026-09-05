import { BadRequestException } from '@nestjs/common';

import { parseReviewCountApplicationIds } from '@server/modules/interview-review/interview-review-count-query';

describe('parseReviewCountApplicationIds', () => {
  it('去重后再查询，避免重复参数放大数据库负载', () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    expect(parseReviewCountApplicationIds(`${id},${id}`)).toEqual([id]);
  });

  it('拒绝非法 UUID，避免数据库类型转换异常', () => {
    expect(() => parseReviewCountApplicationIds('not-a-uuid')).toThrow(
      BadRequestException,
    );
  });

  it('拒绝超过上限的批量查询', () => {
    const ids = Array.from(
      { length: 201 },
      (_, index: number) =>
        `aaaaaaaa-aaaa-4aaa-8aaa-${index.toString(16).padStart(12, '0')}`,
    );

    expect(() => parseReviewCountApplicationIds(ids.join(','))).toThrow(
      BadRequestException,
    );
  });
});


