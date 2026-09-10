import type { ReactNode } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SourceMode = 'url' | 'text';
export type ProcessingStage =
  | 'idle'
  | 'reading'
  | 'extracting'
  | 'ready'
  | 'saving';

export interface JobDraft {
  companyName: string;
  jobTitle: string;
  location: string;
  industry: string;
  functionDirection: string;
  salary: string;
  responsibilities: string;
  requirements: string;
  personalNote: string;
  nextStep: string;
}

export type StreamRecord = Record<string, unknown>;

export const STAGE_COPY: Record<ProcessingStage, string> = {
  idle: '',
  reading: '正在读取招聘页面……',
  extracting: '正在识别公司、岗位和职位要求……',
  ready: '已完成识别，请校对后保存。',
  saving: '正在保存到投递列表……',
};

function isAsyncIterable(value: unknown): value is AsyncIterable<StreamRecord> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Symbol.asyncIterator in value;
}

export function normalizeStream(value: unknown): AsyncIterable<StreamRecord> {
  if (isAsyncIterable(value)) {
    return value;
  }
  if (value && typeof value === 'object' && 'output' in value) {
    const output: unknown = value.output;
    if (isAsyncIterable(output)) {
      return output;
    }
  }
  throw new Error('网页读取服务未返回有效内容');
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeDraft(result: unknown): JobDraft {
  if (!result || typeof result !== 'object') {
    throw new Error('岗位识别服务未返回有效结果');
  }
  const record: Record<string, unknown> = Object.fromEntries(
    Object.entries(result),
  );
  return {
    companyName: readString(record.companyName),
    jobTitle: readString(record.jobTitle),
    location: readString(record.location),
    industry: readString(record.industry),
    functionDirection: readString(record.functionDirection),
    salary: readString(record.salary),
    responsibilities: readString(record.responsibilities),
    requirements: readString(record.requirements),
    personalNote: readString(record.personalNote),
    nextStep: readString(record.nextStep),
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return '处理失败，请稍后重试';
}

export function detectChannel(url: string): string {
  if (url.includes('zhipin.com')) return 'Boss';
  if (url.includes('liepin.com')) return '猎聘';
  if (url.includes('nowcoder.com')) return '牛客';
  return url ? '官网' : '其他';
}

export function logPluginFailure(
  pluginInstanceId: string,
  actionKey: string,
  outputMode: 'unary' | 'stream',
  inputKeys: string[],
  error: unknown,
): void {
  logger.error(
    JSON.stringify({
      pluginInstanceId,
      actionKey,
      outputMode,
      inputKeys,
      error: getErrorMessage(error),
    }),
  );
}

export interface ScrapingPerformanceEvent {
  mode: SourceMode;
  status: 'success' | 'failed';
  totalMs: number;
  extractMs: number;
  sourceChars: number;
  hostname?: string;
  readMs?: number;
  firstChunkMs?: number | null;
  chunkCount?: number;
  failedStage?: 'reading' | 'extracting';
  errorType?: 'empty_content' | 'plugin_error';
}

export function logScrapingPerformance(
  performanceEvent: ScrapingPerformanceEvent,
): void {
  try {
    logger.info(
      JSON.stringify({
        event: 'scraping_performance',
        ...performanceEvent,
      }),
    );
  } catch {
    return;
  }
}

interface ResultFieldProps {
  id: string;
  label: string;
  required?: boolean;
  icon?: ReactNode;
  value: string;
  onChange: (value: string) => void;
}

export function ResultField({
  id,
  label,
  required = false,
  icon,
  value,
  onChange,
}: ResultFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {icon && <span className="text-primary [&>svg]:size-4">{icon}</span>}
        {label}
        {required && (
          <span className="text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-required={required}
      />
    </div>
  );
}
