import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { applications, interviewReviews } from '@server/database/schema';
import {
  hasEnteredApplicationStage,
  getAdvancedApplicationStatus,
  PROCESS_TIME_STAGES,
  type ApplicationProcessStage,
  type ApplicationProcessTimes,
} from '@shared/types';

import {
  parseChinaTimestamp,
  serializeStoredTimestamp,
} from './application-time';
import {
  DEMO_APPLICATION_SEEDS,
  type DemoApplicationSeed,
} from './demo-applications';

type NewApplication = typeof applications.$inferInsert;

interface ApplicationFilters {
  keyword?: string;
  status?: string;
  industry?: string;
  functionDirection?: string;
  location?: string;
}

@Injectable()
export class ApplicationService {
  private readonly demoSeedTasks: Map<string, Promise<void>> = new Map();

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(userId: string, filters?: ApplicationFilters) {
    await this.ensureDemoData(userId);

    const conditions: SQL[] = [eq(applications.userId, userId)];
    const keyword: string = filters?.keyword?.trim() || '';
    const functionDirection: string = filters?.functionDirection?.trim() || '';

    if (keyword) {
      const keywordCondition: SQL | undefined = or(
        ilike(applications.company, `%${keyword}%`),
        ilike(applications.position, `%${keyword}%`),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    if (filters?.status) {
      conditions.push(eq(applications.status, filters.status));
    }
    if (filters?.industry) {
      conditions.push(eq(applications.industry, filters.industry));
    }
    if (functionDirection) {
      conditions.push(ilike(applications.functions, `%${functionDirection}%`));
    }
    if (filters?.location) {
      conditions.push(ilike(applications.location, `%${filters.location}%`));
    }

    const rows: (typeof applications.$inferSelect & { reviewCount: number })[] =
      await this.db
        .select({
          ...getTableColumns(applications),
          reviewCount: sql<number>`(
            SELECT count(*)::int
            FROM ${interviewReviews}
            WHERE ${interviewReviews.applicationId} = ${applications.id}
              AND ${interviewReviews.userId} = ${userId}
          )`,
        })
        .from(applications)
        .where(and(...conditions))
        .orderBy(desc(applications.updatedAt));

    return rows.map((row) => ({
      record_id: row.id,
      review_count: Number(row.reviewCount) || 0,
      fields: {
        公司名称: row.company,
        岗位名称: row.position,
        工作地区: this.parseLocations(row.location),
        所属行业: row.industry || '',
        职能方向: this.parseFunctions(row.functions),
        招聘渠道: row.channel || '',
        收藏时间: serializeStoredTimestamp(row.favoriteTime),
        投递时间: serializeStoredTimestamp(row.applyTime),
        流程时间: this.parseProcessTimes(row.processTimes),
        当前进度: row.status,
        下一步安排: row.nextStep || '',
        个人备注: row.notes || '',
        岗位职责: row.jobResponsibilities || '',
        任职要求: row.jobRequirements || '',
        看板顺序: row.boardOrder,
        简历标识: row.resumeTag || '',
      },
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }));
  }

  async listBoard(userId: string) {
    const selectRows = () =>
      this.db
        .select({
          id: applications.id,
          company: applications.company,
          position: applications.position,
          location: applications.location,
          industry: applications.industry,
          applyTime: applications.applyTime,
          processTimes: applications.processTimes,
          status: applications.status,
          nextStep: applications.nextStep,
          boardOrder: applications.boardOrder,
          createdAt: applications.createdAt,
          updatedAt: applications.updatedAt,
          reviewCount: sql<number>`(
            SELECT count(*)::int
            FROM ${interviewReviews}
            WHERE ${interviewReviews.applicationId} = ${applications.id}
              AND ${interviewReviews.userId} = ${userId}
          )`,
        })
        .from(applications)
        .where(eq(applications.userId, userId))
        .orderBy(desc(applications.updatedAt));

    let rows = await selectRows();
    if (rows.length === 0) {
      await this.ensureDemoData(userId);
      rows = await selectRows();
    }

    return rows.map((row) => ({
      record_id: row.id,
      review_count: Number(row.reviewCount) || 0,
      fields: {
        公司名称: row.company,
        岗位名称: row.position,
        工作地区: this.parseLocations(row.location),
        所属行业: row.industry || '',
        职能方向: [],
        招聘渠道: '',
        投递时间: serializeStoredTimestamp(row.applyTime),
        流程时间: this.parseProcessTimes(row.processTimes),
        当前进度: row.status || '收藏',
        下一步安排: row.nextStep || '',
        个人备注: '',
        看板顺序: row.boardOrder,
        简历标识: '',
      },
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }));
  }

  async get(userId: string, id: string) {
    const [row]: (typeof applications.$inferSelect)[] = await this.db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)));

    if (!row) return null;
    return {
      record_id: row.id,
      fields: {
        公司名称: row.company,
        岗位名称: row.position,
        工作地区: this.parseLocations(row.location),
        所属行业: row.industry || '',
        职能方向: this.parseFunctions(row.functions),
        招聘渠道: row.channel || '',
        收藏时间: serializeStoredTimestamp(row.favoriteTime),
        投递时间: serializeStoredTimestamp(row.applyTime),
        流程时间: this.parseProcessTimes(row.processTimes),
        当前进度: row.status,
        下一步安排: row.nextStep || '',
        个人备注: row.notes || '',
        岗位职责: row.jobResponsibilities || '',
        任职要求: row.jobRequirements || '',
        看板顺序: row.boardOrder,
        简历标识: row.resumeTag || '',
      },
    };
  }

  async create(userId: string, fields: Record<string, unknown>) {
    const now: string = new Date().toISOString();
    const requestedStatus: string =
      this.getString(fields, '当前进度') || '收藏';
    const status: string = getAdvancedApplicationStatus(
      requestedStatus,
      {},
      this.getProcessTimes(fields),
    );
    const applyTime: string | null = this.getNullableTimestamp(
      fields,
      '投递时间',
    );
    const [row]: (typeof applications.$inferSelect)[] = await this.db
      .insert(applications)
      .values({
        userId,
        company: this.getString(fields, '公司名称'),
        position: this.getString(fields, '岗位名称'),
        location: this.getStringArrayJson(fields, '工作地区'),
        industry: this.getNullableString(fields, '所属行业'),
        functions: this.getStringArrayJson(fields, '职能方向'),
        channel: this.getNullableString(fields, '招聘渠道'),
        favoriteTime: this.getNullableTimestamp(fields, '收藏时间'),
        applyTime:
          applyTime || (hasEnteredApplicationStage(status) ? now : null),
        processTimes: this.getProcessTimesJson(fields, status, now),
        status,
        nextStep: this.getNullableString(fields, '下一步安排'),
        notes: this.getNullableString(fields, '个人备注'),
        jobResponsibilities: this.getNullableString(fields, '岗位职责'),
        jobRequirements: this.getNullableString(fields, '任职要求'),
        boardOrder: this.getNullableNumber(fields, '看板顺序'),
        resumeTag: this.getNullableString(fields, '简历标识'),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return { record_id: row.id };
  }

  async update(userId: string, id: string, fields: Record<string, unknown>) {
    const updates: Partial<NewApplication> = {};
    const now: string = new Date().toISOString();
    if ('公司名称' in fields)
      updates.company = this.getString(fields, '公司名称');
    if ('岗位名称' in fields)
      updates.position = this.getString(fields, '岗位名称');
    if ('工作地区' in fields)
      updates.location = this.getStringArrayJson(fields, '工作地区');
    if ('所属行业' in fields)
      updates.industry = this.getNullableString(fields, '所属行业');
    if ('职能方向' in fields)
      updates.functions = this.getStringArrayJson(fields, '职能方向');
    if ('招聘渠道' in fields)
      updates.channel = this.getNullableString(fields, '招聘渠道');
    if ('收藏时间' in fields)
      updates.favoriteTime = this.getNullableTimestamp(fields, '收藏时间');
    if ('投递时间' in fields)
      updates.applyTime = this.getNullableTimestamp(fields, '投递时间');
    if ('流程时间' in fields) {
      const nextProcessTimes: ApplicationProcessTimes =
        this.getProcessTimes(fields);
      const requestedStatus: string | null =
        '当前进度' in fields
          ? this.getNullableString(fields, '当前进度')
          : null;
      if (requestedStatus) {
        const synchronizedStatus: string = getAdvancedApplicationStatus(
          requestedStatus,
          {},
          nextProcessTimes,
        );
        updates.status = synchronizedStatus;
        updates.processTimes = this.getProcessTimesJson(
          fields,
          synchronizedStatus,
          now,
        );
      } else {
        updates.processTimes = this.getProcessTimesJson(fields);
        const [current]: {
          processTimes: string | null;
          status: string | null;
        }[] = await this.db
          .select({
            processTimes: applications.processTimes,
            status: applications.status,
          })
          .from(applications)
          .where(and(eq(applications.id, id), eq(applications.userId, userId)));
        if (current) {
          const currentStatus: string = current.status || '收藏';
          const advancedStatus: string = getAdvancedApplicationStatus(
            currentStatus,
            this.parseProcessTimes(current.processTimes),
            this.getProcessTimes(fields),
          );
          if (advancedStatus !== currentStatus) updates.status = advancedStatus;
        }
      }
    }
    if ('当前进度' in fields && !('流程时间' in fields))
      updates.status = this.getNullableString(fields, '当前进度');
    if (
      '当前进度' in fields &&
      !('投递时间' in fields) &&
      hasEnteredApplicationStage(
        typeof updates.status === 'string'
          ? updates.status
          : this.getNullableString(fields, '当前进度'),
      )
    ) {
      const [current]: { applyTime: string | null }[] = await this.db
        .select({ applyTime: applications.applyTime })
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)));
      if (current && !current.applyTime) {
        updates.applyTime = now;
      }
    }
    if (
      '当前进度' in fields &&
      !('流程时间' in fields) &&
      PROCESS_TIME_STAGES.includes(
        this.getNullableString(fields, '当前进度') as ApplicationProcessStage,
      )
    ) {
      const nextStatus = this.getNullableString(
        fields,
        '当前进度',
      ) as ApplicationProcessStage;
      const [current]: { processTimes: string | null }[] = await this.db
        .select({ processTimes: applications.processTimes })
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)));
      const processTimes: ApplicationProcessTimes = this.parseProcessTimes(
        current?.processTimes || null,
      );
      if (!processTimes[nextStatus]) {
        processTimes[nextStatus] = now;
        updates.processTimes = JSON.stringify(processTimes);
      }
    }
    if ('下一步安排' in fields)
      updates.nextStep = this.getNullableString(fields, '下一步安排');
    if ('个人备注' in fields)
      updates.notes = this.getNullableString(fields, '个人备注');
    if ('岗位职责' in fields)
      updates.jobResponsibilities = this.getNullableString(fields, '岗位职责');
    if ('任职要求' in fields)
      updates.jobRequirements = this.getNullableString(fields, '任职要求');
    if ('看板顺序' in fields)
      updates.boardOrder = this.getNullableNumber(fields, '看板顺序');
    if ('简历标识' in fields)
      updates.resumeTag = this.getNullableString(fields, '简历标识');
    updates.updatedAt = now;

    const [row]: (typeof applications.$inferSelect)[] = await this.db
      .update(applications)
      .set(updates)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .returning();

    if (!row) throw new NotFoundException('投递记录不存在');
    return { record_id: row.id };
  }

  async delete(userId: string, id: string) {
    const [row]: (typeof applications.$inferSelect)[] = await this.db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .returning();

    if (!row) throw new NotFoundException('投递记录不存在');
    return true;
  }

  async stats(userId: string) {
    const selectRows = () =>
      this.db
        .select({ status: applications.status, count: count() })
        .from(applications)
        .where(eq(applications.userId, userId))
        .groupBy(applications.status);
    let rows: { status: string | null; count: number }[] = await selectRows();
    if (rows.length === 0) {
      await this.ensureDemoData(userId);
      rows = await selectRows();
    }
    const total: number = rows.reduce(
      (sum: number, row: { count: number }) => sum + row.count,
      0,
    );
    const statusCount: Record<string, number> = {};

    for (const row of rows) {
      const status: string = row.status || '收藏';
      statusCount[status] = (statusCount[status] || 0) + row.count;
    }

    const statusOrder: string[] = [
      '收藏',
      '准备中',
      '已投递',
      '测评',
      '笔试',
      'AI面试',
      '一面',
      '二面',
      '三面',
      'HR面',
      '谈Offer',
      '已Offer',
      '已拒绝',
    ];
    const pipeline = statusOrder.map((status: string) => ({
      status,
      count: statusCount[status] || 0,
    }));

    return { total, pipeline, statusCount };
  }

  private async ensureDemoData(userId: string): Promise<void> {
    const runningTask: Promise<void> | undefined =
      this.demoSeedTasks.get(userId);
    if (runningTask) {
      await runningTask;
      return;
    }

    const seedTask: Promise<void> = this.seedDemoDataIfEmpty(userId);
    this.demoSeedTasks.set(userId, seedTask);
    try {
      await seedTask;
    } finally {
      this.demoSeedTasks.delete(userId);
    }
  }

  private async seedDemoDataIfEmpty(userId: string): Promise<void> {
    const existingRows: { id: string }[] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.userId, userId))
      .limit(1);
    if (existingRows.length > 0) return;

    const records: NewApplication[] = DEMO_APPLICATION_SEEDS.map(
      (seed: DemoApplicationSeed): NewApplication => ({
        userId,
        company: seed.company,
        position: seed.position,
        location: JSON.stringify(seed.location),
        industry: seed.industry,
        functions: JSON.stringify(seed.functions),
        channel: seed.channel,
        favoriteTime: seed.favoriteTime,
        applyTime: seed.applyTime,
        processTimes:
          Object.keys(seed.processTimes).length > 0
            ? JSON.stringify(seed.processTimes)
            : null,
        status: seed.status,
        nextStep: seed.nextStep,
        notes: seed.notes,
        resumeTag: seed.resumeTag,
        boardOrder: seed.boardOrder,
        jobResponsibilities: seed.jobResponsibilities,
        jobRequirements: seed.jobRequirements,
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
      }),
    );
    await this.db.insert(applications).values(records);
  }

  private parseFunctions(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (item: unknown): item is string => typeof item === 'string',
          )
        : [];
    } catch {
      return [];
    }
  }

  private parseLocations(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item: unknown): item is string => typeof item === 'string',
        );
      }
    } catch {
      // 兼容升级前保存的单值与分隔字符串。
    }
    return value
      .split(/[,，、/]/)
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  private parseProcessTimes(value: string | null): ApplicationProcessTimes {
    if (!value) return {};
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([stage, time]: [string, unknown]) =>
            PROCESS_TIME_STAGES.includes(stage as ApplicationProcessStage) &&
            typeof time === 'string' &&
            Boolean(time),
        ),
      ) as ApplicationProcessTimes;
    } catch {
      return {};
    }
  }

  private getString(fields: Record<string, unknown>, key: string): string {
    const value: unknown = fields[key];
    return typeof value === 'string' ? value : '';
  }

  private getNullableString(
    fields: Record<string, unknown>,
    key: string,
  ): string | null {
    const value: string = this.getString(fields, key);
    return value || null;
  }

  private getNullableTimestamp(
    fields: Record<string, unknown>,
    key: string,
  ): string | null {
    const value: string = this.getString(fields, key);
    return value ? parseChinaTimestamp(value) : null;
  }

  private getNullableNumber(
    fields: Record<string, unknown>,
    key: string,
  ): number | null {
    const value: unknown = fields[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private getStringArrayJson(
    fields: Record<string, unknown>,
    key: string,
  ): string | null {
    const value: unknown = fields[key];
    if (!Array.isArray(value)) return null;
    const strings: string[] = value.filter(
      (item: unknown): item is string => typeof item === 'string',
    );
    return strings.length > 0 ? JSON.stringify(strings) : null;
  }

  private getProcessTimes(
    fields: Record<string, unknown>,
  ): ApplicationProcessTimes {
    const value: unknown = fields['流程时间'];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const processTimes: ApplicationProcessTimes = {};
    for (const stage of PROCESS_TIME_STAGES) {
      const time: unknown = (value as Record<string, unknown>)[stage];
      if (typeof time === 'string' && time) {
        const normalizedTime: string | null = parseChinaTimestamp(time);
        if (normalizedTime) processTimes[stage] = normalizedTime;
      }
    }
    return processTimes;
  }

  private getProcessTimesJson(
    fields: Record<string, unknown>,
    status?: string,
    fallbackTime?: string,
  ): string | null {
    const processTimes: ApplicationProcessTimes = this.getProcessTimes(fields);
    if (
      status &&
      fallbackTime &&
      PROCESS_TIME_STAGES.includes(status as ApplicationProcessStage) &&
      !processTimes[status as ApplicationProcessStage]
    ) {
      processTimes[status as ApplicationProcessStage] = fallbackTime;
    }
    return Object.keys(processTimes).length > 0
      ? JSON.stringify(processTimes)
      : null;
  }
}
