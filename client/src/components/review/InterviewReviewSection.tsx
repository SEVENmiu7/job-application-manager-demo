import { useEffect, useState } from 'react';
import { CalendarClock, PenLine, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import {
  useInterviewReviewMutations,
  useInterviewReviews,
} from '@/hooks/useInterviewReviews';
import { formatApplicationTime } from '@/lib/application-time';
import type { InterviewReview } from '@shared/api.interface';

interface InterviewReviewSectionProps {
  applicationId: string;
  /** 外部（时间列等）已触发过刷新时可用 key 变化强制重取 */
  refreshKey?: number;
  onEdit: (review: InterviewReview) => void;
  onStart: () => void;
}

function buildSummaryLine(review: InterviewReview): string {
  const source: string =
    review.wentWell?.trim() ||
    review.improvements?.trim() ||
    review.rawNotes?.trim() ||
    '';
  const line: string = source.replace(/\s+/g, ' ').trim();
  return line.length > 64 ? `${line.slice(0, 64)}…` : line;
}

function feelingLabel(feeling?: number): string {
  const labels: Record<number, string> = {
    1: '很差',
    2: '偏差',
    3: '一般',
    4: '不错',
    5: '很好',
  };
  return feeling ? (labels[feeling] || `${feeling}/5`) : '未记录感受';
}

/** 资料抽屉「面试复盘」区块：位于招聘流程之后、个人备注之前 */
export function InterviewReviewSection({
  applicationId,
  refreshKey,
  onEdit,
  onStart,
}: InterviewReviewSectionProps) {
  const { reviews, loading, refetch } = useInterviewReviews(applicationId);
  const { deleteReview } = useInterviewReviewMutations();
  const [deleteTarget, setDeleteTarget] = useState<InterviewReview | null>(
    null,
  );
  const [deleting, setDeleting] = useState<boolean>(false);

  // refreshKey 变化（如保存成功后）同步刷新列表
  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReview(deleteTarget.id);
      toast.success('复盘已删除');
      setDeleteTarget(null);
      refetch();
    } catch (caughtError: unknown) {
      const message: string =
        caughtError instanceof Error ? caughtError.message : '未知错误';
      toast.error(`删除失败：${message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface-elevated/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground ">
          面试复盘
        </p>
        {!loading && reviews.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStart}
            className="text-foreground-muted"
          >
            <Plus />
            新增复盘
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">正在加载复盘记录…</p>
      ) : reviews.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 ">
          <p className="text-xs text-muted-foreground">
            还没有复盘记录。面试结束后花两分钟复盘，进步更快。
          </p>
          <Button type="button" size="sm" onClick={onStart}>
            开始第一次复盘
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {reviews.map((review: InterviewReview) => {
            const totalActions: number = review.nextActions.length;
            const doneActions: number = review.nextActions.filter(
              (action) => action.done,
            ).length;
            return (
              <article
                key={review.id}
                className="rounded-lg border border-border bg-surface px-3 py-2.5 "
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                    {review.stage}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarClock className="size-3" />
                    {formatApplicationTime(review.interviewTime)}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    感受：{feelingLabel(review.overallFeeling)}
                  </span>
                </div>
                {buildSummaryLine(review) && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-foreground-secondary ">
                    {buildSummaryLine(review)}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {totalActions > 0
                      ? `下一步行动 ${doneActions}/${totalActions} 已完成`
                      : '暂无下一步行动'}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onEdit(review)}
                    >
                      <PenLine />
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(review)}
                      aria-label="删除复盘"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条复盘记录？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.stage || ''} ·{' '}
              {formatApplicationTime(deleteTarget?.interviewTime)}」的复盘，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
