import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '@/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CompactStepper,
  PageHeader,
  SegmentedControl,
} from '@/components/page-ui';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useSessionState } from '@/hooks/useSessionState';
import type { Platform } from '@shared/types';
import ScrapingResult from './ScrapingResult';
import {
  STAGE_COPY,
  detectChannel,
  getErrorMessage,
  logPluginFailure,
  logScrapingPerformance,
  normalizeDraft,
  normalizeStream,
  type JobDraft,
  type ProcessingStage,
  type SourceMode,
  type StreamRecord,
} from './ScrapingSupport';

function roundDuration(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function classifyScrapingError(
  error: unknown,
): 'empty_content' | 'plugin_error' {
  const message: string = getErrorMessage(error);
  if (message.includes('没有返回')) return 'empty_content';
  return 'plugin_error';
}

export default function Scraping() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState<boolean>(true);
  const [platformsError, setPlatformsError] = useState<string>('');
  const { value: mode, setValue: setMode } = useSessionState<SourceMode>(
    'scraping:mode',
    'url',
  );
  const { value: url, setValue: setUrl } = useSessionState<string>(
    'scraping:url',
    '',
  );
  const { value: jobText, setValue: setJobText } = useSessionState<string>(
    'scraping:job-text',
    '',
  );
  const {
    value: draft,
    setValue: setDraft,
    clearValue: clearDraft,
  } = useSessionState<JobDraft | null>('scraping:draft', null);
  const [stage, setStage] = useState<ProcessingStage>(draft ? 'ready' : 'idle');
  const [progress, setProgress] = useState<number>(draft ? 100 : 0);
  const [error, setError] = useState<string>('');

  const clearSource = (source: SourceMode): void => {
    if (source === 'url') setUrl('');
    else setJobText('');
    setError('');
  };

  useEffect(() => {
    api
      .getPlatforms()
      .then((data: Platform[]) => setPlatforms(data))
      .catch((loadError: unknown) =>
        setPlatformsError(getErrorMessage(loadError)),
      )
      .finally(() => setPlatformsLoading(false));
  }, []);

  const updateDraft = (key: keyof JobDraft, value: string): void => {
    setDraft((current: JobDraft | null) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  const extractJobInfo = async (sourceText: string): Promise<void> => {
    setStage('extracting');
    setProgress(72);
    try {
      const result: unknown = await capabilityClient
        .load('job-info-extractor')
        .call('textToJson', { job_text: sourceText });
      const nextDraft: JobDraft = normalizeDraft(result);
      if (!nextDraft.companyName && !nextDraft.jobTitle) {
        throw new Error('未识别到公司或岗位名称，请粘贴更完整的招聘信息');
      }
      setDraft(nextDraft);
      setProgress(100);
      setStage('ready');
    } catch (extractError: unknown) {
      logPluginFailure(
        'job-info-extractor',
        'textToJson',
        'unary',
        ['job_text'],
        extractError,
      );
      throw extractError;
    }
  };

  const handleReadUrl = async (): Promise<void> => {
    const normalizedUrl: string = url.trim();
    let hostname: string = '';
    try {
      const parsedUrl: URL = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('请输入以 http:// 或 https:// 开头的链接');
      }
      hostname = parsedUrl.hostname;
    } catch (validationError: unknown) {
      setError(getErrorMessage(validationError));
      return;
    }

    setError('');
    setDraft(null);
    setStage('reading');
    setProgress(18);

    const totalStartedAt: number = performance.now();
    const readStartedAt: number = performance.now();
    let readMs: number = 0;
    let extractMs: number = 0;
    let firstChunkMs: number | null = null;
    let chunkCount: number = 0;
    let pageContent: string = '';
    let failedStage: 'reading' | 'extracting' = 'reading';
    let extractStartedAt: number | null = null;

    try {
      const streamResult: unknown = await capabilityClient
        .load('job-page-reader')
        .callStream('crawlWebPage', { url: normalizedUrl });
      const stream: AsyncIterable<StreamRecord> = normalizeStream(streamResult);
      for await (const chunk of stream) {
        if (firstChunkMs === null) {
          firstChunkMs = roundDuration(readStartedAt);
        }
        chunkCount += 1;
        const content: unknown = chunk.content;
        if (typeof content === 'string') {
          pageContent += content;
          setProgress((current: number) => Math.min(current + 4, 60));
        }
      }
      readMs = roundDuration(readStartedAt);
      if (!pageContent.trim()) {
        throw new Error('页面没有返回可识别的岗位内容');
      }
      failedStage = 'extracting';
      extractStartedAt = performance.now();
      await extractJobInfo(pageContent);
      extractMs = roundDuration(extractStartedAt);
      logScrapingPerformance({
        mode: 'url',
        status: 'success',
        hostname,
        readMs,
        firstChunkMs,
        chunkCount,
        extractMs,
        totalMs: roundDuration(totalStartedAt),
        sourceChars: pageContent.length,
      });
    } catch (processingError: unknown) {
      if (failedStage === 'reading') {
        readMs = roundDuration(readStartedAt);
        logPluginFailure(
          'job-page-reader',
          'crawlWebPage',
          'stream',
          ['url'],
          processingError,
        );
      } else if (extractStartedAt !== null) {
        extractMs = roundDuration(extractStartedAt);
      }
      logScrapingPerformance({
        mode: 'url',
        status: 'failed',
        hostname,
        readMs,
        firstChunkMs,
        chunkCount,
        extractMs,
        totalMs: roundDuration(totalStartedAt),
        sourceChars: pageContent.length,
        failedStage,
        errorType: classifyScrapingError(processingError),
      });
      setError(
        `${getErrorMessage(processingError)}。如果该页面需要登录，请切换到“粘贴岗位文本”。`,
      );
      setStage('idle');
      setProgress(0);
    }
  };

  const handleExtractText = async (): Promise<void> => {
    const normalizedText: string = jobText.trim();
    if (normalizedText.length < 20) {
      setError('请粘贴更完整的岗位描述，至少 20 个字');
      return;
    }
    setError('');
    setDraft(null);
    const extractStartedAt: number = performance.now();
    try {
      await extractJobInfo(normalizedText);
      const extractMs: number = roundDuration(extractStartedAt);
      logScrapingPerformance({
        mode: 'text',
        status: 'success',
        extractMs,
        totalMs: extractMs,
        sourceChars: normalizedText.length,
      });
    } catch (extractError: unknown) {
      const extractMs: number = roundDuration(extractStartedAt);
      logScrapingPerformance({
        mode: 'text',
        status: 'failed',
        extractMs,
        totalMs: extractMs,
        sourceChars: normalizedText.length,
        failedStage: 'extracting',
        errorType: classifyScrapingError(extractError),
      });
      setError(getErrorMessage(extractError));
      setStage('idle');
      setProgress(0);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    if (!draft.companyName.trim() || !draft.jobTitle.trim()) {
      setError('保存前请补全公司名称和岗位名称');
      return;
    }
    setError('');
    setStage('saving');
    setProgress(100);
    const fields: Record<string, unknown> = {
      公司名称: draft.companyName.trim(),
      岗位名称: draft.jobTitle.trim(),
      当前进度: '收藏',
      收藏时间: new Date().toISOString(),
      招聘渠道: mode === 'url' ? detectChannel(url) : '其他',
      岗位职责: draft.responsibilities.trim(),
      任职要求: draft.requirements.trim(),
      个人备注: (draft.personalNote || '').trim(),
      下一步安排: (draft.nextStep || '').trim(),
    };
    if (draft.location) {
      fields['工作地区'] = draft.location
        .split(/[,，、/]/)
        .map((location: string) => location.trim())
        .filter(Boolean);
    }
    if (draft.industry) fields['所属行业'] = draft.industry;
    if (draft.functionDirection) {
      fields['职能方向'] = [draft.functionDirection];
    }

    try {
      await api.createApplication(fields);
      clearDraft();
      navigate('/applications');
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
      setStage('ready');
    }
  };

  const handleReset = (): void => {
    setDraft(null);
    clearDraft();
    setError('');
    setStage('idle');
    setProgress(0);
  };

  const isProcessing: boolean = ['reading', 'extracting', 'saving'].includes(
    stage,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        eyebrow="智能录入"
        title="岗位采集"
        description="读取公开招聘页面，或粘贴岗位文本。识别结果由你确认后再保存。"
      />

      <section className="glass-panel px-4 py-3" aria-label="岗位采集流程">
        <CompactStepper
          activeIndex={
            stage === 'idle'
              ? 0
              : stage === 'ready' || stage === 'saving'
                ? 2
                : 1
          }
          steps={[
            { label: '提供来源', hint: '粘贴链接或文本' },
            { label: '自动识别', hint: '提取岗位信息' },
            { label: '校对保存', hint: '确认后入列表' },
          ]}
        />
      </section>

      <section className="ui-surface p-4 sm:p-5">
        <div className="border-b border-border pb-4">
          <SegmentedControl
            value={mode}
            onChange={(next: SourceMode) => setMode(next)}
            ariaLabel="选择采集来源"
            options={[
              {
                value: 'url',
                label: '读取岗位链接',
                icon: <Globe2 className="size-3.5" />,
              },
              {
                value: 'text',
                label: '粘贴岗位文本',
                icon: <ClipboardPaste className="size-3.5" />,
              },
            ]}
          />
        </div>

        {mode === 'url' ? (
          <div className="space-y-5 pt-5">
            <div className="space-y-2">
              <div className="flex min-h-7 items-center justify-between gap-3">
                <Label htmlFor="job-url">岗位页面链接</Label>
                {url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-foreground-muted"
                    onClick={() => clearSource('url')}
                    disabled={isProcessing}
                    aria-label="清空岗位链接"
                  >
                    <X className="size-3.5" />
                    清空
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="job-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/jobs/123"
                  disabled={isProcessing}
                />
                <Button
                  type="button"
                  onClick={handleReadUrl}
                  disabled={isProcessing || !url.trim()}
                  className="sm:min-w-40"
                  size="lg"
                >
                  {stage === 'reading' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Search />
                  )}
                  读取并识别
                </Button>
              </div>
              <p className="text-xs leading-5 text-foreground-muted">
                适合公司官网等公开页面。需要登录或有访问限制时，请改用粘贴文本。
              </p>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-semibold text-foreground-muted">
                常用招聘平台
              </div>
              {platformsLoading && (
                <div className="text-sm text-foreground-muted">正在加载……</div>
              )}
              {platformsError && (
                <div className="text-sm text-red-600">{platformsError}</div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {platforms.map((platform: Platform) => (
                  <div
                    key={platform.id}
                    className="rounded-lg border border-border bg-surface-elevated p-2.5 transition hover:border-primary/40 hover:bg-surface-elevated/90"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 shrink-0 text-foreground-muted" />
                      <div className="truncate text-[13px] font-semibold text-foreground-secondary">
                        {platform.name}
                      </div>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-foreground-muted">
                      {platform.description}
                    </div>
                    {platform.url && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => setUrl(platform.url)}
                        >
                          选择
                        </Button>
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-7 items-center gap-1 px-1 text-xs font-semibold text-primary hover:text-primary-hover"
                        >
                          打开 <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-5">
            <div className="flex min-h-7 items-center justify-between gap-3">
              <Label htmlFor="job-text">岗位招聘文本</Label>
              {jobText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-foreground-muted"
                  onClick={() => clearSource('text')}
                  disabled={isProcessing}
                  aria-label="清空岗位文本"
                >
                  <X className="size-3.5" />
                  清空
                </Button>
              )}
            </div>
            <Textarea
              id="job-text"
              value={jobText}
              onChange={(event) => setJobText(event.target.value)}
              placeholder="粘贴岗位标题、公司、工作地点、岗位职责和任职要求……"
              className="min-h-48 resize-y"
              disabled={isProcessing}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-foreground-muted">
                已输入 {jobText.trim().length} 个字
              </span>
              <Button
                type="button"
                onClick={handleExtractText}
                disabled={isProcessing || jobText.trim().length < 20}
                size="lg"
              >
                {stage === 'extracting' ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                识别岗位信息
              </Button>
            </div>
          </div>
        )}
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>未能完成处理</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            {mode === 'url' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode('text')}
              >
                改用粘贴文本 <ArrowRight />
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {stage !== 'idle' && (
        <section
          className="rounded-2xl border border-primary/20 bg-primary-soft p-5"
          aria-live="polite"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              {isProcessing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {STAGE_COPY[stage]}
            </div>
            <span className="text-xs font-semibold text-primary">
              {progress}%
            </span>
          </div>
          <Progress value={progress} />
        </section>
      )}

      {draft && (
        <ScrapingResult
          draft={draft}
          stage={stage}
          onUpdate={updateDraft}
          onReset={handleReset}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
