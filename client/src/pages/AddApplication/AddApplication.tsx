import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '@/api';
import { useStats } from '@/hooks/useApplications';
import { useSessionState } from '@/hooks/useSessionState';
import { Button } from '@/components/ui/button';
import { LocationMultiSelect } from '@/components/application/LocationMultiSelect';
import { toUtcTimestamp } from '@/lib/application-time';
import {
  STATUS_ORDER,
  LOCATION_OPTIONS,
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
    <div className="mx-auto max-w-4xl space-y-5">
      {/* 页面标题 */}
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
          <p className="text-xs font-semibold tracking-[0.16em] text-teal-700">
            投递档案
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
            添加投递
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            快捷录入一条新的投递记录
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 基本信息 */}
        <FormSection title="基本信息">
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
                options={LOCATION_OPTIONS}
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
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
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

        {/* 进度管理 */}
        <FormSection title="进度管理">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FormField label="当前进度">
              <Select
                value={form.当前进度}
                onChange={(v) => update('当前进度', v)}
                options={STATUS_ORDER}
              />
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
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
              placeholder="如：等HR联系、等面试通知"
              className="form-input"
            />
          </FormField>
          <FormField label="测评与面试时间">
            <p className="mb-3 text-xs leading-5 text-slate-500">
              只填写实际发生或已经约定的节点，后续可在看板和列表中点按修改。
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROCESS_TIME_STAGES.map((stage: ApplicationProcessStage) => (
                <label
                  key={stage}
                  className="space-y-1.5 text-xs font-semibold text-slate-600"
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
        </FormSection>

        {/* 简历 */}
        <FormSection title="简历">
          <FormField label="简历标识">
            <input
              type="text"
              value={form.简历标识}
              onChange={(e) => update('简历标识', e.target.value)}
              placeholder="如：2025秋-产品-v2"
              className="form-input"
            />
          </FormField>
          <div className="text-xs text-gray-400 mt-1">
            简历文件请在保存后在飞书多维表格中上传附件
          </div>
        </FormSection>

        {/* 补充信息 */}
        <FormSection title="补充信息">
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

        {/* 提交 */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
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
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-surface p-4 sm:p-5">
      <h2 className="mb-4 border-b border-slate-100 pb-3 text-[15px] font-bold text-slate-800">
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
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
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
