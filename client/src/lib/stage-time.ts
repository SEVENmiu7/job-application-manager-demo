import {
  parseApplicationTime,
  formatApplicationTime,
} from '@/lib/application-time';
import {
  PROCESS_TIME_STAGES,
  type ApplicationProcessStage,
  type ApplicationProcessTimes,
} from '@shared/types';

/** 时间列取值所需的投递字段（来自 ApplicationRecord.fields 的子集） */
export interface StageTimeFields {
  当前进度?: string;
  投递时间?: string;
  收藏时间?: string;
  流程时间?: ApplicationProcessTimes;
}

export interface StageTimeDisplay {
  /** 第一行节点名，如「AI面试」「已投递」「收藏」 */
  stage: string;
  /** 第一行时间文本；missing 时为 undefined，由调用方显示「未记录」 */
  time?: string;
  /** 应显示的时间不存在（未记录/补录） */
  missing: boolean;
  /** 时间值的时间戳（无有效时间时为 0），可用于排序 */
  timestamp: number;
  /** 最近节点属于面试环节，可发起复盘 */
  reviewable: boolean;
  /** 节点时间的原始 ISO 串（复盘上下文使用） */
  rawTime?: string;
}

const INTERVIEW_REVIEW_STAGES: ApplicationProcessStage[] = [
  'AI面试',
  '一面',
  '二面',
  '三面',
  'HR面',
];

/** 找到已记录时间的最近一场面试（用于发起复盘的上下文） */
export function getLatestInterviewStage(
  fields: StageTimeFields,
): { stage: ApplicationProcessStage; time?: string } | null {
  const processTimes: ApplicationProcessTimes = fields['流程时间'] || {};
  let best: { stage: ApplicationProcessStage; time?: string; ts: number } | null =
    null;
  for (const stage of INTERVIEW_REVIEW_STAGES) {
    const time: string | undefined = processTimes[stage];
    if (!isValidTime(time)) continue;
    const ts: number = toTimestamp(time);
    if (!best || ts > best.ts) best = { stage, time, ts };
  }
  if (best) return { stage: best.stage, time: best.time };
  // 尚未记录时间时，若当前进度本身是面试节点，也可作为复盘轮次
  const status: string = fields['当前进度'] || '';
  if (INTERVIEW_REVIEW_STAGES.includes(status as ApplicationProcessStage)) {
    return { stage: status as ApplicationProcessStage };
  }
  return null;
}

function isValidTime(value?: string | null): value is string {
  return Boolean(value && parseApplicationTime(value));
}

function toTimestamp(value: string): number {
  return parseApplicationTime(value)?.getTime() || 0;
}

function buildDisplay(
  stage: string,
  rawTime?: string,
  missing = false,
): StageTimeDisplay {
  const hasTime: boolean = isValidTime(rawTime);
  return {
    stage,
    time: hasTime ? formatApplicationTime(rawTime) : undefined,
    missing: missing || !hasTime,
    timestamp: hasTime ? toTimestamp(rawTime) : 0,
    reviewable: INTERVIEW_REVIEW_STAGES.includes(
      stage as ApplicationProcessStage,
    ),
    rawTime: hasTime ? rawTime : undefined,
  };
}

/** 流程时间中「实际时间最近」的一条（按真实时间戳，而非阶段顺序） */
function findLatestProcessTime(
  processTimes: ApplicationProcessTimes,
): ApplicationProcessStage | undefined {
  let latestStage: ApplicationProcessStage | undefined;
  let latestTimestamp = -1;
  for (const stage of PROCESS_TIME_STAGES) {
    const time: string | undefined = processTimes[stage];
    if (!isValidTime(time)) continue;
    const timestamp: number = toTimestamp(time);
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      latestStage = stage;
    }
  }
  return latestStage;
}

/**
 * 时间列统一取值规则：
 * 1. 当前进度为流程节点且已记录时间 → 显示该节点与时间；
 * 2. 当前进度为流程节点但时间为空 → 显示「当前节点 · 未记录」（missing，允许补录）；
 * 3. 已投递 → 第一行显示「已投递 · 投递时间」；
 * 4. 收藏/准备中 → 使用收藏时间；
 * 5. 已拒绝（无独立拒绝时间字段）→ 最近一条真实流程时间，回退投递时间；
 * 6. 其他无法映射 → 最近流程时间 → 投递时间 → 收藏时间；
 * 无任何有效时间时 timestamp 为 0 且 missing 为 true。
 */
export function getCurrentStageTime(fields: StageTimeFields): StageTimeDisplay {
  const status: string = fields['当前进度'] || '收藏';
  const processTimes: ApplicationProcessTimes = fields['流程时间'] || {};
  const applyTime: string | undefined = fields['投递时间'] || undefined;
  const favoriteTime: string | undefined = fields['收藏时间'] || undefined;

  const isProcessStage: boolean = PROCESS_TIME_STAGES.includes(
    status as ApplicationProcessStage,
  );

  if (isProcessStage && isValidTime(processTimes[status])) {
    return buildDisplay(status, processTimes[status]);
  }
  if (isProcessStage) {
    // 规则 2：不得用其他时间冒充当前节点时间
    return buildDisplay(status, undefined, true);
  }

  if (status === '已投递') {
    return isValidTime(applyTime)
      ? buildDisplay('已投递', applyTime)
      : buildDisplay('已投递', undefined, true);
  }

  if (status === '收藏' || status === '准备中') {
    return isValidTime(favoriteTime)
      ? buildDisplay('收藏', favoriteTime)
      : buildDisplay('收藏', undefined, true);
  }

  const latestStage: ApplicationProcessStage | undefined =
    findLatestProcessTime(processTimes);
  if (latestStage) {
    return buildDisplay(latestStage, processTimes[latestStage]);
  }

  if (isValidTime(applyTime)) return buildDisplay(status, applyTime);
  if (isValidTime(favoriteTime)) return buildDisplay(status, favoriteTime);
  return buildDisplay(status, undefined, true);
}


