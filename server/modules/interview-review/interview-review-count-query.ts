import { BadRequestException } from '@nestjs/common';

const MAX_COUNT_APPLICATION_IDS = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseReviewCountApplicationIds(
  applicationIds?: string,
): string[] {
  const ids: string[] = Array.from(
    new Set(
      (applicationIds || '')
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean),
    ),
  );
  if (ids.length > MAX_COUNT_APPLICATION_IDS) {
    throw new BadRequestException(
      `一次最多查询 ${MAX_COUNT_APPLICATION_IDS} 条投递的复盘数量`,
    );
  }
  if (ids.some((id: string) => !UUID_PATTERN.test(id))) {
    throw new BadRequestException('投递 ID 格式不正确');
  }
  return ids;
}


