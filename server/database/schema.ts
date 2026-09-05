/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { foreignKey, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const interviewReviews = pgTable("interview_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  applicationId: uuid("application_id").notNull(),
  stage: varchar("stage", { length: 64 }).notNull(),
  interviewTime: timestamp("interview_time", { mode: 'string' }),
  format: varchar("format", { length: 32 }),
  interviewer: varchar("interviewer", { length: 255 }),
  overallFeeling: integer("overall_feeling"),
  rawNotes: text("raw_notes"),
  /**
   * @type InterviewReviewQuestion[]
   */
  questions: jsonb("questions"),
  wentWell: text("went_well"),
  improvements: text("improvements"),
  companySignals: text("company_signals"),
  /**
   * @type InterviewReviewNextAction[]
   */
  nextActions: jsonb("next_actions"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_interview_reviews_user_id").on(table.userId),
  index("idx_interview_reviews_application_id").on(table.applicationId),
  foreignKey({
    columns: [table.applicationId],
    foreignColumns: [applications.id],
    name: "interview_reviews_application_id_fkey",
  }).onDelete("cascade"),
]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  location: text("location"),
  industry: varchar("industry", { length: 64 }),
  functions: text("functions"),
  channel: varchar("channel", { length: 64 }),
  favoriteTime: timestamp("favorite_time", { mode: 'string' }),
  applyTime: timestamp("apply_time", { mode: 'string' }),
  status: varchar("status", { length: 64 }).default('收藏'),
  nextStep: varchar("next_step", { length: 255 }),
  notes: text("notes"),
  resumeTag: varchar("resume_tag", { length: 128 }),
  resumeFileId: varchar("resume_file_id", { length: 255 }),
  jobDescription: text("job_description"),
  boardOrder: integer("board_order"),
  jobResponsibilities: text("job_responsibilities"),
  jobRequirements: text("job_requirements"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  processTimes: text("process_times"),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_applications_user_id").on(table.userId),
  index("idx_applications_user_created_at").on(table.userId, table.createdAt),
]);

// table aliases
export const applicationsTable = applications;
export const interviewReviewsTable = interviewReviews;
