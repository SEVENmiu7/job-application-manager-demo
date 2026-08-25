import {
  BriefcaseBusiness,
  Building2,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ResultField,
  type JobDraft,
  type ProcessingStage,
} from './ScrapingSupport';

interface ScrapingResultProps {
  draft: JobDraft;
  stage: ProcessingStage;
  onUpdate: (key: keyof JobDraft, value: string) => void;
  onReset: () => void;
  onSave: () => void;
}

export default function ScrapingResult({
  draft,
  stage,
  onUpdate,
  onReset,
  onSave,
}: ScrapingResultProps) {
  return (
    <section className="ui-surface space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">校对识别结果</h2>
          <p className="mt-1 text-sm text-slate-500">
            可直接修改。公司名称和岗位名称为必填项。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw />
          重新采集
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResultField
          id="company-name"
          label="公司名称"
          required
          icon={<Building2 />}
          value={draft.companyName}
          onChange={(value: string) => onUpdate('companyName', value)}
        />
        <ResultField
          id="job-title"
          label="岗位名称"
          required
          icon={<BriefcaseBusiness />}
          value={draft.jobTitle}
          onChange={(value: string) => onUpdate('jobTitle', value)}
        />
        <ResultField
          id="location"
          label="工作地区"
          icon={<MapPin />}
          value={draft.location}
          onChange={(value: string) => onUpdate('location', value)}
        />
        <ResultField
          id="salary"
          label="薪资"
          value={draft.salary}
          onChange={(value: string) => onUpdate('salary', value)}
        />
        <ResultField
          id="industry"
          label="所属行业"
          value={draft.industry}
          onChange={(value: string) => onUpdate('industry', value)}
        />
        <ResultField
          id="function-direction"
          label="职能方向"
          value={draft.functionDirection}
          onChange={(value: string) => onUpdate('functionDirection', value)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="responsibilities">岗位职责</Label>
          <Textarea
            id="responsibilities"
            value={draft.responsibilities}
            onChange={(event) =>
              onUpdate('responsibilities', event.target.value)
            }
            className="min-h-36 resize-y"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requirements">任职要求</Label>
          <Textarea
            id="requirements"
            value={draft.requirements}
            onChange={(event) => onUpdate('requirements', event.target.value)}
            className="min-h-36 resize-y"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="personal-note">个人备注</Label>
          <Textarea
            id="personal-note"
            value={draft.personalNote || ''}
            onChange={(event) => onUpdate('personalNote', event.target.value)}
            placeholder="记录岗位判断、联系人、沟通情况或需要留意的信息……"
            className="min-h-28 resize-y"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next-step">下一步安排</Label>
          <Textarea
            id="next-step"
            value={draft.nextStep || ''}
            onChange={(event) => onUpdate('nextStep', event.target.value)}
            placeholder="如：完善简历后投递、联系内推人、准备笔试……"
            className="min-h-28 resize-y"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <Button
          type="button"
          size="lg"
          onClick={onSave}
          disabled={stage === 'saving'}
        >
          {stage === 'saving' ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}
          保存到投递列表
        </Button>
        <span className="text-xs text-gray-500">
          默认进度为“收藏”，保存后可在列表中继续编辑。
        </span>
      </div>
    </section>
  );
}
