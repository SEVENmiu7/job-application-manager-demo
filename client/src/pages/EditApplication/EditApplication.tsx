import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Send, Loader2 } from 'lucide-react';
import { api } from '@/api';
import { useStats } from '@/hooks/useApplications';
import { useSessionState } from '@/hooks/useSessionState';
import { CompactStepper } from '@/components/page-ui';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LocationMultiSelect } from '@/components/application/LocationMultiSelect';
import { toDatetimeLocalValue, toUtcTimestamp } from '@/lib/application-time';
import {
  STATUS_ORDER,
  INDUSTRY_OPTIONS,
  FUNCTION_OPTIONS,
  CHANNEL_OPTIONS,
  PROCESS_TIME_STAGES,
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

export default function EditApplication() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refetch: refetchStats } = useStats();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showFullProcess, setShowFullProcess] = useState(false);

  const {
    value: form,
    setValue: setForm,
    clearValue: clearForm,
    hasStoredValue,
  } = useSessionState<FormData>(
    `edit-application:${id || 'unknown'}`,
    initialForm,
    false,
  );

  useEffect(() => {
    if (!id) return;
    if (hasStoredValue) {
      setLoading(false);
      return;
    }
    api
      .getApplication(id)
      .then((record) => {
        if (record) {
          const f = record.fields || {};
          setForm({
            公司名称: f['公司名称'] || '',
            岗位名称: f['岗位名称'] || '',
            工作地区: f['工作地区'] || [],
            所属行业: f['所属行业'] || '',
            职能方向: f['职能方向'] || [],
            招聘渠道: f['招聘渠道'] || '',
            收藏时间: toDatetimeLocalValue(f['收藏时间']),
            投递时间: toDatetimeLocalValue(f['投递时间']),
            流程时间: Object.fromEntries(
              PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => [
                stage,
                toDatetimeLocalValue(f['流程时间']?.[stage]),
              ]),
            ) as Record<ApplicationProcessStage, string>,
            当前进度: f['当前进度'] || '收藏',
            下一步安排: f['下一步安排'] || '',
            个人备注: f['个人备注'] || '',
            岗位职责: f['岗位职责'] || '',
            任职要求: f['任职要求'] || '',
            简历标识: f['简历标识'] || '',
          });
        }
      })
      .catch(() => {
        setError('加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hasStoredValue, id, setForm]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (k === '流程时间') {
          fields[k] = Object.fromEntries(
            Object.entries(v as ApplicationProcessTimes)
              .map(([stage, time]) => [stage, toUtcTimestamp(time)])
              .filter(([, time]) => Boolean(time)),
          );
        } else {
          fields[k] =
            (k === '收藏时间' || k === '投递时间') && typeof v === 'string'
              ? toUtcTimestamp(v)
              : v;
        }
      }
      await api.updateApplication(id, fields);
      await refetchStats();
      clearForm();
      navigate('/applications');
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-5">
      <div className="ui-page-header flex items-start gap-3 px-4 py-4 sm:items-center sm:gap-4 sm:px-5 sm:py-5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="返回"
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary">
            投递档案
          </p>
          <h1 className="mt-0.5 text-[28px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            编辑投递
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">更新投递信息与进度</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CompactStepper
        steps={[
          { label: '基本信息' },
          { label: '进度与时间' },
          { label: '补充信息' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection step={1} title="基本信息">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="公司名称 *">
              <input
                type="text"
                value={form.公司名称}
                onChange={(e) => update('公司名称', e.target.value)}
                placeholder="如：腾讯"
                className="form-input"
              />
            </FormField>
            <FormField label="岗位名称 *">
              <input
                type="text"
                value={form.岗位名称}
                onChange={(e) => update('岗位名称', e.target.value)}
                placeholder="如：产品经理"
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
                value={form.所属行业}
                onChange={(v) => update('所属行业', v)}
                options={INDUSTRY_OPTIONS}
              />
            </FormField>
          </div>
          <FormField label="职能方向">
            <div className="flex flex-wrap gap-2">
              {FUNCTION_OPTIONS.map((fn) => (
                <button
                  key={fn}
                  type="button"
                  onClick={() => toggleFunc(fn)}
                  className={`min-h-9 rounded-lg border px-3 text-sm font-medium transition ${
                    form.职能方向.includes(fn)
                      ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                      : 'border-border bg-surface-elevated text-foreground-secondary hover:border-border-strong hover:text-foreground'
                  }`}
                >
                  {fn}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="招聘渠道">
            <Select
              value={form.招聘渠道}
              onChange={(v) => update('招聘渠道', v)}
              options={CHANNEL_OPTIONS}
            />
          </FormField>
        </FormSection>

        <FormSection step={2} title="进度与时间">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FormField label="当前进度">
              <Select
                value={form.当前进度}
                onChange={(v) => update('当前进度', v)}
                options={STATUS_ORDER}
              />
              <p className="mt-1.5 text-xs leading-5 text-foreground-muted">
                各公司流程不同，可直接选择实际节点，不必按顺序推进。
              </p>
            </FormField>
            <FormField label="收藏时间">
              <input
                type="datetime-local"
                value={form.收藏时间}
                onChange={(e) => update('收藏时间', e.target.value)}
                className="form-input"
              />
            </FormField>
            <FormField label="投递时间">
              <input
                type="datetime-local"
                value={form.投递时间}
                onChange={(e) => update('投递时间', e.target.value)}
                className="form-input"
              />
            </FormField>
          </div>
          <FormField label="下一步安排">
            <input
              type="text"
              value={form.下一步安排}
              onChange={(e) => update('下一步安排', e.target.value)}
              placeholder="如：等HR联系"
              className="form-input"
            />
          </FormField>
          <Collapsible open={showFullProcess} onOpenChange={setShowFullProcess}>
            <CollapsibleTrigger className="group flex min-h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-muted px-3.5 text-sm font-semibold text-foreground-secondary transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              展开完整招聘流程（测评、笔试、各轮面试与 Offer 时间）
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FormField label="各节点时间">
                <p className="mb-3 text-xs leading-5 text-foreground-muted">
                  手动填写的时间会作为基准保留；状态推进只会补充尚未记录的当前节点。
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => (
                <label
                  key={stage}
                  className="space-y-1.5 text-xs font-semibold text-foreground-secondary"
                >
                  <span>{stage}</span>
                  <input
                    type="datetime-local"
                    value={form.流程时间[stage]}
                    onChange={(event) =>
                      update('流程时间', {
                        ...form.流程时间,
                        [stage]: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
              ))}
            </div>
              </FormField>
            </CollapsibleContent>
          </Collapsible>
        </FormSection>

        <FormSection step={3} title="补充信息 · 材料与备注">
          <FormField label="简历标识">
            <input
              type="text"
              value={form.简历标识}
              onChange={(e) => update('简历标识', e.target.value)}
              placeholder="如：2025秋-产品-v2"
              className="form-input"
            />
          </FormField>
          <FormField label="个人备注">
            <textarea
              value={form.个人备注}
              onChange={(e) => update('个人备注', e.target.value)}
              placeholder="记录你的判断、联系人、沟通情况、面试感受或提醒事项……"
              rows={4}
              className="form-input resize-y"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField label="岗位职责">
              <textarea
                value={form.岗位职责}
                onChange={(e) => update('岗位职责', e.target.value)}
                placeholder="填写岗位的主要工作内容；岗位采集后会自动填充。"
                rows={7}
                className="form-input resize-y"
              />
            </FormField>
            <FormField label="任职要求">
              <textarea
                value={form.任职要求}
                onChange={(e) => update('任职要求', e.target.value)}
                placeholder="填写学历、经验、技能等要求；岗位采集后会自动填充。"
                rows={7}
                className="form-input resize-y"
              />
            </FormField>
          </div>
        </FormSection>

        <div className="sticky bottom-4 z-20 rounded-xl border border-border bg-surface-elevated/90 px-4 py-3 shadow-[var(--shadow)] backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={saving} size="lg">
              <Send className="w-4 h-4" />
              {saving ? '保存中...' : '保存修改'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate('/applications')}
            >
              取消
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-surface form-section p-4 sm:p-5">
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="form-input"
    >
      <option value="">请选择</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
