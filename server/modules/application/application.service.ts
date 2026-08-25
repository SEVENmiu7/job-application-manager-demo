import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { applications } from '@server/database/schema';
import { hasEnteredApplicationStage } from '@shared/types';

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
      conditions.push(eq(applications.location, filters.location));
    }

    const rows: (typeof applications.$inferSelect)[] = await this.db
      .select()
      .from(applications)
      .where(and(...conditions))
      .orderBy(desc(applications.updatedAt));

    return rows.map((row: typeof applications.$inferSelect) => ({
      record_id: row.id,
      fields: {
        公司名称: row.company,
        岗位名称: row.position,
        工作地区: row.location || '',
        所属行业: row.industry || '',
        职能方向: this.parseFunctions(row.functions),
        招聘渠道: row.channel || '',
        收藏时间: row.favoriteTime || undefined,
        投递时间: row.applyTime || undefined,
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
        工作地区: row.location || '',
        所属行业: row.industry || '',
        职能方向: this.parseFunctions(row.functions),
        招聘渠道: row.channel || '',
        收藏时间: row.favoriteTime || undefined,
        投递时间: row.applyTime || undefined,
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
    const status: string = this.getString(fields, '当前进度') || '收藏';
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
        location: this.getNullableString(fields, '工作地区'),
        industry: this.getNullableString(fields, '所属行业'),
        functions: this.getStringArrayJson(fields, '职能方向'),
        channel: this.getNullableString(fields, '招聘渠道'),
        favoriteTime: this.getNullableTimestamp(fields, '收藏时间'),
        applyTime:
          applyTime ||
          (hasEnteredApplicationStage(status) ? now : null),
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
    if ('公司名称' in fields)
      updates.company = this.getString(fields, '公司名称');
    if ('岗位名称' in fields)
      updates.position = this.getString(fields, '岗位名称');
    if ('工作地区' in fields)
      updates.location = this.getNullableString(fields, '工作地区');
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
    if ('当前进度' in fields)
      updates.status = this.getNullableString(fields, '当前进度');
    if (
      '当前进度' in fields &&
      !('投递时间' in fields) &&
      hasEnteredApplicationStage(this.getNullableString(fields, '当前进度'))
    ) {
      const [current]: { applyTime: string | null }[] = await this.db
        .select({ applyTime: applications.applyTime })
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)));
      if (current && !current.applyTime) {
        updates.applyTime = new Date().toISOString();
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
    updates.updatedAt = new Date().toISOString();

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
    const rows = await this.list(userId);
    const total: number = rows.length;
    const statusCount: Record<string, number> = {};

    for (const row of rows) {
      const status: string = row.fields['当前进度'] || '收藏';
      statusCount[status] = (statusCount[status] || 0) + 1;
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
        location: seed.location,
        industry: seed.industry,
        functions: JSON.stringify(seed.functions),
        channel: seed.channel,
        favoriteTime: seed.favoriteTime,
        applyTime: seed.applyTime,
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
    return value ? new Date(value).toISOString() : null;
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
}
