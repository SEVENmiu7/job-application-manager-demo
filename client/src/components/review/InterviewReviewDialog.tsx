import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  MessageSquareQuote,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/application/DateTimePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInterviewReviewMutations } from '@/hooks/useInterviewReviews';
import { toDatetimeLocalValue, toUtcTimestamp } from '@/lib/application-time';
import { cn } from '@/lib/utils';
import type {
  InterviewReview,
  InterviewReviewNextAction,
  InterviewReviewQuestion,
  InterviewReviewSavePayload,
} from '@shared/api.interface';

const FORMAT_OPTIONS: string[] = ['电话', '视频', '现场', '其他'];
const FEELING_LABELS: Record<number, string> = {
  1: '很差',
  2: '偏差',
  3: '一般',
  4: '不错',
  5: '很好',
};

interface InterviewReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  company: string;
  position: string;
  stage: string;
  /** 面试时间（ISO）；补录场景可能为空，弹窗内可填写 */
  interviewTime?: string;
  /** 传入则为编辑该条复盘 */
  review?: InterviewReview | null;
  onSaved: (review: InterviewReview) => void;
}

interface ReviewDraft {
  stage: string;
  interviewTimeLocal: string;
  format: string;
  interviewer: string;
  overallFeeling: number;
  rawNotes: string;
  wentWell: string;
  improvements: string;
  companySignals: string;
  questions: InterviewReviewQuestion[];
  nextActions: InterviewReviewNextAction[];
}

const EMPTY_QUESTION: InterviewReviewQuestion = {
  question: '',
  myAnswer: '',
  problem: '',
  betterApproach: '',
};

const EMPTY_ACTION: InterviewReviewNextAction = {
  content: '',
  dueTime: '',
  done: false,
};

function draftKey(draft: ReviewDraft): string {
  return JSON.stringify([
    draft.stage,
    draft.interviewTimeLocal,
    draft.format,
    draft.interviewer,
    draft.overallFeeling,
    draft.rawNotes,
    draft.wentWell,
    draft.improvements,
    draft.companySignals,
    draft.questions,
    draft.nextActions,
  ]);
}

function buildInitialDraft(
  stage: string,
  interviewTime?: string,
  review?: InterviewReview | null,
): ReviewDraft {
  return {
    stage: review?.stage || stage,
    interviewTimeLocal: toDatetimeLocalValue(
      review?.interviewTime || interviewTime,
      true,
    ),
    format: review?.format || '',
    interviewer: review?.interviewer || '',
    overallFeeling: review?.overallFeeling || 0,
    rawNotes: review?.rawNotes || '',
    wentWell: review?.wentWell || '',
    improvements: review?.improvements || '',
    companySignals: review?.companySignals || '',
    questions: review?.questions?.length
      ? review.questions.map((item: InterviewReviewQuestion) => ({ ...item }))
      : [],
    nextActions: review?.nextActions?.length
      ? review.nextActions.map((item: InterviewReviewNextAction) => ({
          ...item,
          dueTime: toDatetimeLocalValue(item.dueTime, true),
        }))
      : [],
  };
}

export function InterviewReviewDialog({
  open,
  onOpenChange,
  applicationId,
  company,
  position,
  stage,
  interviewTime,
  review,
  onSaved,
}: InterviewReviewDialogProps) {
  const { saving, createReview, updateReview } = useInterviewReviewMutations();
  const [draft, setDraft] = useState<ReviewDraft>(() =>
    buildInitialDraft(stage, interviewTime, review),
  );
  const [expanded, setExpanded] = useState<boolean>(false);
  const [confirmClose, setConfirmClose] = useState<boolean>(false);
  const initialKey: string = useMemo(
    () => draftKey(buildInitialDraft(stage, interviewTime, review)),
    [stage, interviewTime, review],
  );
  const dirty: boolean = draftKey(draft) !== initialKey;

  useEffect(() => {
    if (open) {
      setDraft(buildInitialDraft(stage, interviewTime, review));
      setExpanded(false);
      setConfirmClose(false);
    }

  }, [open]);

  const attemptClose = () => {
    if (dirty && !saving) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  };

  const hasContent: boolean = Boolean(
    draft.rawNotes.trim() ||
      draft.wentWell.trim() ||
      draft.improvements.trim() ||
      draft.questions.some((item: InterviewReviewQuestion) => item.question.trim()),
  );
  const canSave: boolean =
    Boolean(draft.stage.trim()) &&
    Boolean(draft.interviewTimeLocal) &&
    hasContent &&
    !saving;

  const toPayload = (): InterviewReviewSavePayload => ({
    stage: draft.stage.trim(),
    interviewTime: toUtcTimestamp(draft.interviewTimeLocal),
    format: draft.format,
    interviewer: draft.interviewer.trim(),
    overallFeeling: draft.overallFeeling || undefined,
    rawNotes: draft.rawNotes.trim(),
    questions: draft.questions,
    wentWell: draft.wentWell.trim(),
    improvements: draft.improvements.trim(),
    companySignals: draft.companySignals.trim(),
    nextActions: draft.nextActions.map((item: InterviewReviewNextAction) => ({
      ...item,
      dueTime: item.dueTime ? toUtcTimestamp(item.dueTime) : '',
    })),
  });

  const handleSave = async () => {
    if (!canSave) return;
    try {
      const savedReview: InterviewReview | null = review
        ? await updateReview(review.id, toPayload())
        : await createReview(applicationId, toPayload());
      if (!savedReview) {
        toast.error('复盘保存失败');
        return;
      }
      toast.success(review ? '复盘已更新' : '复盘已保存');
      onSaved(savedReview);
      onOpenChange(false);
    } catch (caughtError: unknown) {
      const message: string =
        caughtError instanceof Error ? caughtError.message : '未知错误';
      toast.error(`复盘保存失败：${message}`);
    }
  };

  const updateDraft = (patch: Partial<ReviewDraft>) =>
    setDraft((current: ReviewDraft) => ({ ...current, ...patch }));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next: boolean) => {
          if (!next) attemptClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent className="grid max-h-[85vh] w-[94vw] grid-rows-[auto_1fr] gap-0 overflow-hidden p-0 sm:max-w-[820px] max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-5 pr-14 text-left">
            <DialogTitle className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold">
              <span className="truncate">{company || '未命名公司'}</span>
              <span className="truncate text-sm font-medium text-muted-foreground">
                {position || '未命名岗位'}
              </span>
            </DialogTitle>
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[13px] font-bold text-primary">
                {draft.stage || stage}
              </span>
              <span className="text-muted-foreground">面试时间</span>
              <DateTimePicker
                size="sm"
                value={draft.interviewTimeLocal}
                disabled={saving}
                onChange={(next: string) =>
                  updateDraft({ interviewTimeLocal: next })
                }
                placeholder="选择面试时间"
                className="w-56"
              />
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-6 py-4">
            <section aria-label="快速复盘" className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  整体感受
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    仅代表你的主观感受（1-5）
                  </span>
                </p>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((score: number) => (
                    <button
                      key={score}
                      type="button"
                      disabled={saving}
                      onClick={() => updateDraft({ overallFeeling: score })}
                      aria-pressed={draft.overallFeeling === score}
                      className={cn(
                        'flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        draft.overallFeeling === score
                          ? 'border-primary/60 bg-primary/10 font-bold text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {score}
                      <span className="hidden text-xs lg:inline">
                        {FEELING_LABELS[score]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <DraftField label="原始速记">
                <Textarea
                  value={draft.rawNotes}
                  disabled={saving}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    updateDraft({ rawNotes: event.target.value })
                  }
                  placeholder="现场想到什么记什么，事后可再整理"
                  className="min-h-20 leading-6"
                />
              </DraftField>

              <DraftField label="做得好的地方">
                <Textarea
                  value={draft.wentWell}
                  disabled={saving}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    updateDraft({ wentWell: event.target.value })
                  }
                  placeholder="哪些回答或表现是有效的"
                  className="min-h-16 leading-6"
                />
              </DraftField>

              <DraftField label="需要改进的地方">
                <Textarea
                  value={draft.improvements}
                  disabled={saving}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    updateDraft({ improvements: event.target.value })
                  }
                  placeholder="哪些问题没答好、哪些表达可以优化"
                  className="min-h-16 leading-6"
                />
              </DraftField>

              <DraftField label="下一步行动">
                <div className="space-y-2">
                  {draft.nextActions.map(
                    (action: InterviewReviewNextAction, index: number) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2.5 py-2"
                      >
                        <Checkbox
                          checked={action.done}
                          disabled={saving}
                          onCheckedChange={(checked: boolean) =>
                            updateDraft({
                              nextActions: draft.nextActions.map(
                                (item: InterviewReviewNextAction, i: number) =>
                                  i === index ? { ...item, done: checked } : item,
                              ),
                            })
                          }
                          aria-label={`行动 ${index + 1} 是否完成`}
                        />
                        <Input
                          value={action.content}
                          disabled={saving}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>,
                          ) =>
                            updateDraft({
                              nextActions: draft.nextActions.map(
                                (item: InterviewReviewNextAction, i: number) =>
                                  i === index
                                    ? { ...item, content: event.target.value }
                                    : item,
                              ),
                            })
                          }
                          placeholder="行动内容，如：补一篇系统设计笔记"
                          className="h-8 min-w-0 flex-1 text-[13px]"
                        />
                        <DateTimePicker
                          size="sm"
                          value={action.dueTime || ''}
                          disabled={saving}
                          onChange={(next: string) =>
                            updateDraft({
                              nextActions: draft.nextActions.map(
                                (item: InterviewReviewNextAction, i: number) =>
                                  i === index
                                    ? { ...item, dueTime: next }
                                    : item,
                              ),
                            })
                          }
                          placeholder="截止时间"
                          className="w-48"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          disabled={saving}
                          onClick={() =>
                            updateDraft({
                              nextActions: draft.nextActions.filter(
                                (_: InterviewReviewNextAction, i: number) =>
                                  i !== index,
                              ),
                            })
                          }
                          aria-label="删除该行动"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      updateDraft({
                        nextActions: [
                          ...draft.nextActions,
                          { ...EMPTY_ACTION },
                        ],
                      })
                    }
                  >
                    <Plus />
                    添加行动
                  </Button>
                </div>
              </DraftField>
            </section>

            <section aria-label="详细内容" className="mt-5">
              <button
                type="button"
                onClick={() => setExpanded((value: boolean) => !value)}
                className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={expanded}
              >
                {expanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                详细内容（面试形式、面试官、问题记录）
              </button>

              {expanded && (
                <div className="mt-3 space-y-4 rounded-xl border border-border bg-surface/60 p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DraftField label="面试形式">
                      <Select
                        value={draft.format}
                        onValueChange={(value: string) =>
                          updateDraft({ format: value })
                        }
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="选择面试形式" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMAT_OPTIONS.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </DraftField>
                    <DraftField label="面试官或部门">
                      <Input
                        value={draft.interviewer}
                        disabled={saving}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ) => updateDraft({ interviewer: event.target.value })}
                        placeholder="如：张工（技术团队）"
                        className="h-9"
                      />
                    </DraftField>
                  </div>

                  <DraftField label="对岗位、团队和公司的新判断">
                    <Textarea
                      value={draft.companySignals}
                      disabled={saving}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>,
                      ) => updateDraft({ companySignals: event.target.value })}
                      placeholder="这轮交流后对团队节奏、技术栈、氛围的新认识"
                      className="min-h-16 leading-6"
                    />
                  </DraftField>

                  <DraftField label="问题记录">
                    <div className="space-y-3">
                      {draft.questions.map(
                        (
                          item: InterviewReviewQuestion,
                          index: number,
                        ) => (
                          <div
                            key={index}
                            className="space-y-2 rounded-lg border border-border p-2.5"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquareQuote className="mt-2 size-4 shrink-0 text-primary" />
                              <Input
                                value={item.question}
                                disabled={saving}
                                onChange={(
                                  event: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  updateDraft({
                                    questions: draft.questions.map(
                                      (q: InterviewReviewQuestion, i: number) =>
                                        i === index
                                          ? { ...q, question: event.target.value }
                                          : q,
                                    ),
                                  })
                                }
                                placeholder="面试问题"
                                className="h-9"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                disabled={saving}
                                onClick={() =>
                                  updateDraft({
                                    questions: draft.questions.filter(
                                      (
                                        _: InterviewReviewQuestion,
                                        i: number,
                                      ) => i !== index,
                                    ),
                                  })
                                }
                                aria-label="删除该问题"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-3">
                              <QuestionInput
                                label="我的回答要点"
                                value={item.myAnswer}
                                disabled={saving}
                                onChange={(value: string) =>
                                  updateDraft({
                                    questions: draft.questions.map(
                                      (
                                        q: InterviewReviewQuestion,
                                        i: number,
                                      ) =>
                                        i === index
                                          ? { ...q, myAnswer: value }
                                          : q,
                                    ),
                                  })
                                }
                              />
                              <QuestionInput
                                label="暴露的问题"
                                value={item.problem}
                                disabled={saving}
                                onChange={(value: string) =>
                                  updateDraft({
                                    questions: draft.questions.map(
                                      (
                                        q: InterviewReviewQuestion,
                                        i: number,
                                      ) =>
                                        i === index
                                          ? { ...q, problem: value }
                                          : q,
                                    ),
                                  })
                                }
                              />
                              <QuestionInput
                                label="更好的回答思路"
                                value={item.betterApproach}
                                disabled={saving}
                                onChange={(value: string) =>
                                  updateDraft({
                                    questions: draft.questions.map(
                                      (
                                        q: InterviewReviewQuestion,
                                        i: number,
                                      ) =>
                                        i === index
                                          ? { ...q, betterApproach: value }
                                          : q,
                                    ),
                                  })
                                }
                              />
                            </div>
                          </div>
                        ),
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          updateDraft({
                            questions: [
                              ...draft.questions,
                              { ...EMPTY_QUESTION },
                            ],
                          })
                        }
                      >
                        <Plus />
                        添加问题
                      </Button>
                    </div>
                  </DraftField>
                </div>
              )}
            </section>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-elevated px-6 py-3 max-sm:sticky max-sm:bottom-0">
            <p className="text-xs text-muted-foreground">
              {dirty && !saving ? '有未保存的修改' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={attemptClose}
              >
                取消
              </Button>
              <Button type="button" disabled={!canSave} onClick={() => void handleSave()}>
                {saving && <LoaderCircle className="animate-spin" />}
                {review ? '保存修改' : '保存复盘'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmClose}
        onOpenChange={(open: boolean) => !open && setConfirmClose(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的复盘内容？</AlertDialogTitle>
            <AlertDialogDescription>
              本次复盘已有修改尚未保存，关闭后将丢失这些内容。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              放弃修改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DraftField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-foreground">{label}</p>
      {children}
    </div>
  );
}

function QuestionInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        className="min-h-14 text-[13px] leading-5"
      />
    </label>
  );
}
