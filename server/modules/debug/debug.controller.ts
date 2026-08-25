import { Controller, Get, Req, Inject } from '@nestjs/common';
import type { Request } from 'express';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { sql } from 'drizzle-orm';

@Controller('api/debug')
export class DebugController {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  @Get('headers')
  getHeaders(@Req() req: Request) {
    return {
      userContext: (req as any).userContext,
      userId: (req as any).userId,
      userToken: req.headers['x-user-token'],
    };
  }

  @Get('db')
  async checkDb() {
    try {
      const res: any = await this.db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'applications'
        ) AS table_exists
      `);
      const rows = (res as any).rows ?? res;
      return { ok: true, result: rows };
    } catch (e: any) {
      return { ok: false, error: e?.message };
    }
  }
}
