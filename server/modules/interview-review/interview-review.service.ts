import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { applications, interviewReviews } from '@server/database/schema';
import {
  parseChinaTimestamp,
  serializeStoredTimestamp,
} from '@server/modules/application/application-time';
import type {
  InterviewReview,
  InterviewReviewNextAction,
  InterviewReviewQuestion,
  InterviewReviewSavePayload,
} from '@shared/api.interface';

type ReviewRow = typeof interviewReviews.$inferSelect;
type NewReview = typeof interviewReviews.$inferInsert;

const REVIEW_FORMATS: string[] = ['电话', '视频', '现场', '其他'];
const MIN_FEELING = 1;
const MAX_FEELING = 5;

function serializeReview(row: ReviewRow): InterviewReview {
  return {
    id: row.id,
    userId: row.userId,
    applicationId: row.applicationId,
    stage: row.stage,
    interviewTime: serializeStoredTimestamp(row.interviewTime),
    format: row.format || undefined,
    interviewer: row.interviewer || undefined,
    overallFeeling: row.overallFeeling ?? undefined,
    rawNotes: row.rawNotes || undefined,
    questions: parseJsonArray<InterviewReviewQuestion>(row.questions),
    wentWell: row.wentWell || undefined,
    improvements: row.improvements || undefined,
    companySignals: row.companySignals || undefined,
    nextActions: parseJsonArray<InterviewReviewNextAction>(row.nextActions),
    createdAt: serializeStoredTimestamp(row.createdAt) || '',
    updatedAt: serializeStoredTimestamp(row.updatedAt) || '',
  };
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

/** uuid 数组的 IN 匹配：显式构造 ARRAY[...]::uuid[]，避免参数绑定歧义 */
function uuidArrayCondition(
  column: typeof applications.id | typeof interviewReviews.applicationId,
  ids: string[],
): SQL {
  const placeholders: SQL[] = ids.map((id: string) => sql`${id}`);
  return sql`${column} = ANY(ARRAY[${sql.join(placeholders, sql`, `)}]::uuid[])`;
}

@Injectable()
export class InterviewReviewService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async listByApplication(
    userId: string,
    applicationId: string,
  ): Promise<InterviewReview[]> {
    const rows: ReviewRow[] = await this.db
      .select()
      .from(interviewReviews)
      .where(
        and(
          eq(interviewReviews.userId, userId),
          eq(interviewReviews.applicationId, applicationId),
        ),
      )
      .orderBy(desc(interviewReviews.interviewTime), desc(interviewReviews.createdAt));
    return rows.map((row: ReviewRow) => serializeReview(row));
  }

  /** 批量统计若干投递的复盘数量（列表页「去复盘/已复盘」标记） */
  async countByApplications(
    userId: string,
    applicationIds: string[],
  ): Promise<Record<string, number>> {
    if (applicationIds.length === 0) return {};
    const ownedRows: { id: string }[] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.userId, userId),
          uuidArrayCondition(applications.id, applicationIds),
        ),
      );
    const ownedIds: string[] = ownedRows.map((row: { id: string }) => row.id);
    if (ownedIds.length === 0) return {};

    const countRows: { applicationId: string; total: number }[] = await this.db
      .select({
        applicationId: interviewReviews.applicationId,
        total: sql<number>`count(*)::int`,
      })
      .from(interviewReviews)
      .where(
        and(
          eq(interviewReviews.userId, userId),
          uuidArrayCondition(interviewReviews.applicationId, ownedIds),
        ),
      )
      .groupBy(interviewReviews.applicationId);

    const result: Record<string, number> = {};
    for (const row of countRows) {
      result[row.applicationId] = Number(row.total) || 0;
    }
    return result;
  }

  async create(
    userId: string,
    applicationId: string,
    payload: InterviewReviewSavePayload,
  ): Promise<InterviewReview> {
    this.validatePayload(payload);
    await this.assertApplicationOwnership(userId, applicationId);
    const now: string = new Date().toISOString();
    const [row]: ReviewRow[] = await this.db
      .insert(interviewReviews)
      .values({
        userId,
        applicationId,
        stage: payload.stage,
        interviewTime: this.normalizeTime(payload.interviewTime) || now,
        format: this.normalizeFormat(payload.format),
        interviewer: payload.interviewer?.trim() || null,
        overallFeeling: this.normalizeFeeling(payload.overallFeeling),
        rawNotes: payload.rawNotes?.trim() || null,
        questions: this.filterQuestions(payload.questions),
        wentWell: payload.wentWell?.trim() || null,
        improvements: payload.improvements?.trim() || null,
        companySignals: payload.companySignals?.trim() || null,
        nextActions: this.filterNextActions(payload.nextActions),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return serializeReview(row);
  }

  async update(
    userId: string,
    reviewId: string,
    payload: InterviewReviewSavePayload,
  ): Promise<InterviewReview> {
    const existing: ReviewRow = await this.assertReviewOwnership(
      userId,
      reviewId,
    );
    this.validatePayload(payload);
    const updates: Partial<NewReview> = {
      stage: payload.stage,
      interviewTime: this.normalizeTime(payload.interviewTime),
      format: this.normalizeFormat(payload.format),
      interviewer: payload.interviewer?.trim() || null,
      overallFeeling: this.normalizeFeeling(payload.overallFeeling),
      rawNotes: payload.rawNotes?.trim() || null,
      questions: this.filterQuestions(payload.questions),
      wentWell: payload.wentWell?.trim() || null,
      improvements: payload.improvements?.trim() || null,
      companySignals: payload.companySignals?.trim() || null,
      nextActions: this.filterNextActions(payload.nextActions),
      updatedAt: new Date().toISOString(),
    };
    const [row]: ReviewRow[] = await this.db
      .update(interviewReviews)
      .set(updates)
      .where(eq(interviewReviews.id, existing.id))
      .returning();
    return serializeReview(row);
  }

  async remove(userId: string, reviewId: string): Promise<boolean> {
    const existing: ReviewRow = await this.assertReviewOwnership(
      userId,
      reviewId,
    );
    await this.db
      .delete(interviewReviews)
      .where(eq(interviewReviews.id, existing.id));
    return true;
  }

  /** 面试轮次必填；速记/优点/改进点/问题记录至少一项 */
  private validatePayload(payload: InterviewReviewSavePayload): void {
    if (!payload.stage?.trim()) {
      throw new BadRequestException('面试轮次不能为空');
    }
    const hasQuestions: boolean = (payload.questions || []).some(
      (item: InterviewReviewQuestion) => item.question?.trim(),
    );
    if (
      !payload.rawNotes?.trim() &&
      !payload.wentWell?.trim() &&
      !payload.improvements?.trim() &&
      !hasQuestions
    ) {
      throw new BadRequestException('请至少填写速记、优点、改进点或问题记录之一');
    }
  }

  /** 校验当前用户对投递的归属，防止跨用户写入 */
  private async assertApplicationOwnership(
    userId: string,
    applicationId: string,
  ): Promise<void> {
    const [row]: { id: string }[] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(eq(applications.id, applicationId), eq(applications.userId, userId)),
      );
    if (!row) throw new NotFoundException('投递记录不存在');
  }

  /** 校验复盘存在且属于当前用户的投递 */
  private async assertReviewOwnership(
    userId: string,
    reviewId: string,
  ): Promise<ReviewRow> {
    const [row]: ReviewRow[] = await this.db
      .select()
      .from(interviewReviews)
      .where(and(eq(interviewReviews.id, reviewId), eq(interviewReviews.userId, userId)));
    if (!row) throw new NotFoundException('复盘记录不存在');
    await this.assertApplicationOwnership(userId, row.applicationId);
    return row;
  }

  private normalizeTime(value?: string): string | null {
    if (!value) return null;
    return parseChinaTimestamp(value);
  }

  private normalizeFormat(value?: string): string | null {
    const normalized: string = value?.trim() || '';
    return REVIEW_FORMATS.includes(normalized) ? normalized : null;
  }

  private normalizeFeeling(value?: number): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const rounded: number = Math.round(value);
    if (rounded < MIN_FEELING || rounded > MAX_FEELING) return null;
    return rounded;
  }

  private filterQuestions(
    questions?: InterviewReviewQuestion[],
  ): InterviewReviewQuestion[] | null {
    const items: InterviewReviewQuestion[] = (questions || [])
      .filter(
        (item: InterviewReviewQuestion) =>
          item && typeof item.question === 'string' && item.question.trim(),
      )
      .map((item: InterviewReviewQuestion) => ({
        question: item.question.trim(),
        myAnswer: (item.myAnswer || '').trim(),
        problem: (item.problem || '').trim(),
        betterApproach: (item.betterApproach || '').trim(),
      }));
    return items.length > 0 ? items : null;
  }

  private filterNextActions(
    nextActions?: InterviewReviewNextAction[],
  ): InterviewReviewNextAction[] | null {
    const items: InterviewReviewNextAction[] = (nextActions || [])
      .filter(
        (item: InterviewReviewNextAction) =>
          item && typeof item.content === 'string' && item.content.trim(),
      )
      .map((item: InterviewReviewNextAction) => ({
        content: item.content.trim(),
        dueTime: item.dueTime ? parseChinaTimestamp(item.dueTime) || undefined : undefined,
        done: Boolean(item.done),
      }));
    return items.length > 0 ? items : null;
  }
}


