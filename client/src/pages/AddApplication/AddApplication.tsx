import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Paperclip, Send } from 'lucide-react';
import { api } from '@/api';
import { useStats } from '@/hooks/useApplications';
import { useSessionState } from '@/hooks/useSessionState';
import { CompactStepper, PageHeader } from '@/components/page-ui';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LocationMultiSelect } from '@/components/application/LocationMultiSelect';
import { DateTimePicker } from '@/components/application/DateTimePicker';
import { StageTimeChips } from '@/components/application/StageTimeChips';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toUtcTimestamp } from '@/lib/application-time';
import {
  STATUS_ORDER,
  INDUSTRY_OPTIONS,
  FUNCTION_OPTIONS,
  CHANNEL_OPTIONS,
  PROCESS_TIME_STAGES,
  getAdvancedApplicationStatus,
  type ApplicationProcessStage,
  type ApplicationProcessTimes,
} from '../../../../shared/types';

type FormData = {
  公司名称: string;
  岗位名称: string;
  工作地区: string[];
  所属行业: string;
  职能方向: string[];
  招聘渠道: string;
  收藏时间: string;
  投递时间: string;
  流程时间: Record<ApplicationProcessStage, string>;
  当前进度: string;
  下一步安排: string;
  个人备注: string;
  岗位职责: string;
  任职要求: string;
  简历标识: string;
};

const FORM_SECTION_IDS = [
  'application-basic-information',
  'application-progress-and-time',
  'application-additional-information',
] as const;

const initialForm: FormData = {
  公司名称: '',
  岗位名称: '',
  工作地区: [],
  所属行业: '',
  职能方向: [],
  招聘渠道: '',
  收藏时间: '',
  投递时间: '',
  流程时间: Object.fromEntries(
    PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => [stage, '']),
  ) as Record<ApplicationProcessStage, string>,
  当前进度: '收藏',
  下一步安排: '',
  个人备注: '',
  岗位职责: '',
  任职要求: '',
  简历标识: '',
};

export default function AddApplication() {
  const navigate = useNavigate();
  const { refetch: refetchStats } = useStats();
  const {
    value: form,
    setValue: setForm,
    clearValue: clearForm,
  } = useSessionState<FormData>('add-application:form', initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState<number>(0);

  useEffect(() => {
    let animationFrame: number | null = null;
    const scrollContainer: HTMLElement | null =
      document.querySelector('.layout-main');

    const updateActiveStep = (): void => {
      animationFrame = null;
      const containerAtBottom: boolean = Boolean(
        scrollContainer &&
        scrollContainer.scrollTop > 0 &&
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 4,
      );
      const windowAtBottom: boolean =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 4;

      if (containerAtBottom || windowAtBottom) {
        setActiveStep(FORM_SECTION_IDS.length - 1);
        return;
      }

      const activationLine: number = Math.min(window.innerHeight * 0.25, 180);
      let nextStep: number = 0;

      FORM_SECTION_IDS.forEach((id: string, index: number) => {
        const section: HTMLElement | null = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= activationLine) {
          nextStep = index;
        }
      });

      setActiveStep((current: number) =>
        current === nextStep ? current : nextStep,
      );
    };

    const scheduleUpdate = (): void => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updateActiveStep);
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scrollContainer?.addEventListener('scroll', scheduleUpdate, {
      passive: true,
    });
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      scrollContainer?.removeEventListener('scroll', scheduleUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleStepClick = (index: number): void => {
    const section: HTMLElement | null = document.getElementById(
      FORM_SECTION_IDS[index],
    );
    if (!section) return;

    setActiveStep(index);
    const reduceMotion: boolean = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    section.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };
  const [showFullProcess, setShowFullProcess] = useState(false);

  const update = (key: keyof FormData, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleFunc = (fn: string) => {
    setForm((f) => ({
      ...f,
      职能方向: f.职能方向.includes(fn)
        ? f.职能方向.filter((x) => x !== fn)
        : [...f.职能方向, fn],
    }));
  };

  const updateProcessTime = (
    stage: ApplicationProcessStage,
    value: string,
  ): void => {
    setForm((current: FormData) => {
      const nextProcessTimes = { ...current.流程时间, [stage]: value };
      return {
        ...current,
        流程时间: nextProcessTimes,
        当前进度: getAdvancedApplicationStatus(
          current.当前进度,
          current.流程时间,
          nextProcessTimes,
        ),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.公司名称.trim()) {
      setError('请填写公司名称');
      return;
    }
    if (!form.岗位名称.trim()) {
      setError('请填写岗位名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // 构造字段（只传非空字段）
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== '' && !(Array.isArray(v) && v.length === 0)) {
          if (k === '流程时间') {
            const processTimes: ApplicationProcessTimes = Object.fromEntries(
              Object.entries(v as ApplicationProcessTimes)
                .map(([stage, time]) => [stage, toUtcTimestamp(time)])
                .filter(([, time]) => Boolean(time)),
            );
            if (Object.keys(processTimes).length > 0) fields[k] = processTimes;
          } else {
            fields[k] =
              (k === '收藏时间' || k === '投递时间') && typeof v === 'string'
                ? toUtcTimestamp(v)
                : v;
          }
        }
      }
      await api.createApplication(fields);
      await refetchStats();
      clearForm();
      navigate('/applications');
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1080px] space-y-5">
      <PageHeader
        eyebrow="投递档案"
        title="添加投递"
        description="记录岗位信息、投递进度与求职材料。"
        leading={
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft className="size-5" />
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="glass-panel px-4 py-3" aria-label="添加投递流程">
        <CompactStepper
          activeIndex={activeStep}
          onStepClick={handleStepClick}
          steps={[
            { label: '基本信息', hint: '填写公司与岗位' },
            { label: '进度与时间', hint: '记录阶段与关键日期' },
            { label: '补充信息', hint: '完善材料与备注' },
          ]}
        />
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 第一步：基本信息 */}
        <FormSection id={FORM_SECTION_IDS[0]} step={1} title="基本信息">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="公司名称 *" required>
              <input
                type="text"
                value={form.公司名称}
                onChange={(e) => update('公司名称', e.target.value)}
                placeholder="如：腾讯、字节跳动"
                className="form-input"
              />
            </FormField>
            <FormField label="岗位名称 *" required>
              <input
                type="text"
                value={form.岗位名称}
                onChange={(e) => update('岗位名称', e.target.value)}
                placeholder="如：产品经理、运营专员"
                className="form-input"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="工作地区">
              <LocationMultiSelect
                value={form.工作地区}
                onChange={(v: string[]) => update('工作地区', v)}
              />
            </FormField>
            <FormField label="所属行业">
              <Select
                value={form.所属行业 || undefined}
                onValueChange={(v: string) => update('所属行业', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="职能方向">
            <div className="flex flex-wrap gap-2">
              {FUNCTION_OPTIONS.map((fn) => (
                <button
                  key={fn}
                  type="button"
                  onClick={() => toggleFunc(fn)}
                  className={`min-h-9 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.职能方向.includes(fn)
                      ? 'border-primary/60 bg-primary-soft font-semibold text-primary shadow-sm'
                      : 'border-border bg-surface-elevated/85 text-foreground-secondary hover:border-border-strong hover:text-foreground'
                  }`}
                >
                  {fn}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="招聘渠道">
            <Select
              value={form.招聘渠道 || undefined}
              onValueChange={(v: string) => update('招聘渠道', v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        {/* 第二步：进度与时间 */}
        <FormSection id={FORM_SECTION_IDS[1]} step={2} title="进度与时间">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FormField label="当前进度">
              <Select
                value={form.当前进度 || undefined}
                onValueChange={(v: string) => update('当前进度', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs leading-5 text-foreground-muted">
                各公司流程不同，可直接选择实际节点，不必按顺序推进。
              </p>
            </FormField>
            <FormField label="收藏时间">
              <DateTimePicker
                value={form.收藏时间}
                onChange={(v: string) => update('收藏时间', v)}
                placeholder="选择收藏时间"
              />
            </FormField>
            <FormField label="投递时间">
              <DateTimePicker
                value={form.投递时间}
                onChange={(v: string) => update('投递时间', v)}
                placeholder="选择投递时间"
              />
            </FormField>
          </div>

          <FormField label="下一步安排">
            <input
              type="text"
              value={form.下一步安排}
              onChange={(e) => update('下一步安排', e.target.value)}
              placeholder="如：等HR联系、等面试通知"
              className="form-input"
            />
          </FormField>

          <Collapsible open={showFullProcess} onOpenChange={setShowFullProcess}>
            <CollapsibleTrigger className="group flex min-h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-muted px-3.5 text-sm font-semibold text-foreground-secondary transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              展开完整招聘流程（测评、笔试、各轮面试与 Offer 时间）
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <FormField label="各节点时间">
                <p className="mb-4 text-xs leading-5 text-foreground-muted">
                  只填写实际发生或已经约定的节点，后续可在看板和列表中点按修改。
                </p>
                <StageTimeChips
                  value={form.流程时间}
                  onChange={updateProcessTime}
                />
              </FormField>
            </CollapsibleContent>
          </Collapsible>
        </FormSection>

        {/* 第三步：补充信息 / 材料与备注 */}
        <FormSection
          id={FORM_SECTION_IDS[2]}
          step={3}
          title="补充信息 · 材料与备注"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="简历标识">
              <input
                type="text"
                value={form.简历标识}
                onChange={(e) => update('简历标识', e.target.value)}
                placeholder="如：2025秋-产品-v2"
                className="form-input"
              />
            </FormField>
            <FormField label="简历附件">
              <div className="flex min-h-10 items-center gap-2 rounded-[10px] border border-dashed border-border-strong bg-surface-muted/60 px-3 py-2 text-xs leading-5 text-foreground-muted">
                <Paperclip className="size-4 shrink-0" />
                保存记录后，可在飞书多维表格中上传简历附件
              </div>
            </FormField>
          </div>

          <FormField label="个人备注">
            <textarea
              value={form.个人备注}
              onChange={(e) => update('个人备注', e.target.value)}
              placeholder="记录你的判断、联系人、沟通情况、面试感受或提醒事项……"
              rows={3}
              className="form-input resize-y"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField label="岗位职责">
              <textarea
                value={form.岗位职责}
                onChange={(e) => update('岗位职责', e.target.value)}
                placeholder="填写岗位的主要工作内容；岗位采集后会自动填充。"
                rows={6}
                className="form-input resize-y"
              />
            </FormField>
            <FormField label="任职要求">
              <textarea
                value={form.任职要求}
                onChange={(e) => update('任职要求', e.target.value)}
                placeholder="填写学历、经验、技能等要求；岗位采集后会自动填充。"
                rows={6}
                className="form-input resize-y"
              />
            </FormField>
          </div>
        </FormSection>

        {/* 提交：sticky 操作栏 */}
        <div className="sticky bottom-4 z-20 rounded-xl border border-border bg-surface-elevated/90 px-4 py-3 shadow-[var(--shadow)] backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={saving} size="lg">
              <Send className="w-4 h-4" />
              {saving ? '保存中...' : '保存投递记录'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate('/applications')}
            >
              取消
            </Button>
            <span className="hidden text-xs text-foreground-muted sm:ml-auto sm:inline">
              带 * 为必填项
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  id,
  step,
  title,
  children,
}: {
  id: string;
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="ui-surface form-section scroll-mt-5 p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-base font-semibold text-foreground">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {step}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground-secondary">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
