import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarClock,
  CheckCircle2,
  CircleX,
  ExternalLink,
  GripVertical,
  LayoutGrid,
  List,
  MapPin,
  NotebookPen,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Target,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api';
import { InlineFieldEditor } from '@/components/application/InlineFieldEditor';
import { InlineDateTimeEditor } from '@/components/application/InlineDateTimeEditor';
import { ApplicationProcessTimeline } from '@/components/application/ApplicationProcessTimeline';
import {
  PageHeader,
  SegmentedControl,
  StatTintCard,
} from '@/components/page-ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApplications } from '@/hooks/useApplications';
import { useSessionState } from '@/hooks/useSessionState';
import {
  getApplicationStatusTheme,
  type ApplicationStatusTheme,
} from '@/lib/application-theme';
import {
  formatApplicationTime,
  formatRelativeApplicationTime,
  parseApplicationTime,
} from '@/lib/application-time';
import { getCurrentStageTime, getLatestInterviewStage } from '@/lib/stage-time';
import { cn } from '@/lib/utils';
import type {
  ApplicationProcessStage,
  ApplicationRecord,
  StatusGroup,
} from '../../../../shared/types';
import type { InterviewReview } from '@shared/api.interface';
import {
  StageColumnControls,
  type StageSortKey,
  type StageViewSettings,
} from './StageColumnControls';
import {
  formatLocations,
  hasEnteredApplicationStage,
  STATUS_GROUPS,
  STATUS_ORDER,
} from '../../../../shared/types';

const GROUP_PREFIX = 'group:';
const BOARD_ORDER_STEP = 1000;
const MAX_PINNED_PER_GROUP = 3;
const DEFAULT_STAGE_VIEW_SETTINGS: StageViewSettings = {
  pinnedOnly: false,
  sortKey: 'manual',
};
const STAGE_SORT_KEYS: StageSortKey[] = [
  'manual',
  'applied-desc',
  'applied-asc',
  'stage-desc',
  'stage-asc',
  'company-desc',
  'company-asc',
];

const InterviewReviewDialog = lazy(() =>
  import('@/components/review/InterviewReviewDialog').then((module) => ({
    default: module.InterviewReviewDialog,
  })),
);

interface PendingStageMove {
  application: ApplicationRecord;
  targetGroup: StatusGroup;
}

interface ReviewDialogState {
  applicationId: string;
  company: string;
  position: string;
  stage: string;
  interviewTime?: string;
  review?: InterviewReview | null;
}

// 列语义色：准备=Slate 已投递=Blue 测评=Purple 面试=Cyan 结果=Green
// 列背景只使用低透明度 tint
const STAGE_STYLES: Record<
  string,
  { dot: string; line: string; soft: string; column: string }
> = {
  prepare: {
    dot: 'bg-surface-muted',
    line: 'bg-surface-muted',
    soft: 'bg-surface-muted text-foreground-secondary',
    column: 'bg-surface-muted',
  },
  apply: {
    dot: 'bg-blue-500',
    line: 'bg-blue-400',
    soft: 'bg-blue-50 text-blue-700',
    column: 'bg-blue-50/60',
  },
  assessment: {
    dot: 'bg-purple-500',
    line: 'bg-purple-400',
    soft: 'bg-purple-50 text-purple-700',
    column: 'bg-purple-50/60',
  },
  interview: {
    dot: 'bg-cyan-500',
    line: 'bg-cyan-400',
    soft: 'bg-cyan-50 text-cyan-700',
    column: 'bg-cyan-50/55',
  },
  result: {
    dot: 'bg-emerald-500',
    line: 'bg-emerald-400',
    soft: 'bg-emerald-50 text-emerald-700',
    column: 'bg-emerald-50/60',
  },
};

const boardCollisionDetection: CollisionDetection = (args) => {
  const droppableContainers = args.droppableContainers.filter(
    (container) => container.id !== args.active.id,
  );
  const pointerCollisions = pointerWithin({ ...args, droppableContainers });
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCorners({ ...args, droppableContainers });
};

function getApplicationStatus(application: ApplicationRecord): string {
  return application.fields['当前进度'] || '收藏';
}

function getStatusGroup(status: string): StatusGroup {
  return (
    STATUS_GROUPS.find((group: StatusGroup) =>
      group.statuses.includes(status),
    ) || STATUS_GROUPS[0]
  );
}

function isPinned(application: ApplicationRecord): boolean {
  return (application.fields['看板顺序'] ?? 0) < 0;
}

function getOrderedGroup(
  applications: ApplicationRecord[],
  group: StatusGroup,
): ApplicationRecord[] {
  return applications
    .filter((application: ApplicationRecord) =>
      group.statuses.includes(getApplicationStatus(application)),
    )
    .sort((left: ApplicationRecord, right: ApplicationRecord) => {
      if (isPinned(left) !== isPinned(right)) return isPinned(left) ? -1 : 1;
      const leftOrder: number =
        left.fields['看板顺序'] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder: number =
        right.fields['看板顺序'] ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return (right.updated_at || right.created_at || '').localeCompare(
        left.updated_at || left.created_at || '',
      );
    });
}

function getApplicationTimestamp(
  application: ApplicationRecord,
  sortKey: StageSortKey,
): number {
  if (sortKey.startsWith('applied-')) {
    return parseApplicationTime(application.fields['投递时间'])?.getTime() || 0;
  }
  return getCurrentStageTime(application.fields).timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStageSortKey(value: unknown): value is StageSortKey {
  return (
    typeof value === 'string' &&
    STAGE_SORT_KEYS.some((sortKey: StageSortKey) => sortKey === value)
  );
}

function getStageViewSettings(
  storedSettings: unknown,
  groupKey: string,
): StageViewSettings {
  if (!isRecord(storedSettings)) return DEFAULT_STAGE_VIEW_SETTINGS;
  const groupSettings: unknown = storedSettings[groupKey];
  if (!isRecord(groupSettings)) return DEFAULT_STAGE_VIEW_SETTINGS;
  return {
    pinnedOnly: groupSettings.pinnedOnly === true,
    sortKey: isStageSortKey(groupSettings.sortKey)
      ? groupSettings.sortKey
      : 'manual',
  };
}

function sortStageApplications(
  applications: ApplicationRecord[],
  sortKey: StageSortKey,
): ApplicationRecord[] {
  if (sortKey === 'manual') return applications;
  return [...applications].sort(
    (left: ApplicationRecord, right: ApplicationRecord) => {
      if (isPinned(left) !== isPinned(right)) return isPinned(left) ? -1 : 1;
      if (sortKey.startsWith('company-')) {
        const difference: number = (
          left.fields['公司名称'] || ''
        ).localeCompare(right.fields['公司名称'] || '', 'zh-CN');
        return sortKey === 'company-asc' ? difference : -difference;
      }
      const leftTimestamp: number = getApplicationTimestamp(left, sortKey);
      const rightTimestamp: number = getApplicationTimestamp(right, sortKey);
      if (leftTimestamp === 0 && rightTimestamp !== 0) return 1;
      if (rightTimestamp === 0 && leftTimestamp !== 0) return -1;
      const difference: number = leftTimestamp - rightTimestamp;
      return sortKey.endsWith('-asc') ? difference : -difference;
    },
  );
}

function normalizeGroupOrder(
  applications: ApplicationRecord[],
): ApplicationRecord[] {
  const pinned: ApplicationRecord[] = applications.filter(isPinned);
  const regular: ApplicationRecord[] = applications.filter(
    (application: ApplicationRecord) => !isPinned(application),
  );
  return [
    ...pinned.map((application: ApplicationRecord, index: number) => ({
      ...application,
      fields: {
        ...application.fields,
        看板顺序: -(pinned.length - index) * BOARD_ORDER_STEP,
      },
    })),
    ...regular.map((application: ApplicationRecord, index: number) => ({
      ...application,
      fields: {
        ...application.fields,
        看板顺序: (index + 1) * BOARD_ORDER_STEP,
      },
    })),
  ];
}

function mergeApplicationChanges(
  applications: ApplicationRecord[],
  changedApplications: ApplicationRecord[],
): ApplicationRecord[] {
  const changedById: Map<string, ApplicationRecord> = new Map(
    changedApplications
      .filter((application: ApplicationRecord) => application.record_id)
      .map((application: ApplicationRecord) => [
        application.record_id || '',
        application,
      ]),
  );
  return applications.map(
    (application: ApplicationRecord) =>
      changedById.get(application.record_id || '') || application,
  );
}

function LiveUpdateTime({ value }: { value?: string }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer: ReturnType<typeof setInterval> = setInterval(
      () => setNow(Date.now()),
      30_000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <time className="truncate text-foreground-secondary">
      {formatRelativeApplicationTime(value, now)}
    </time>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApplications();
  const [records, setRecords] = useState<ApplicationRecord[] | null>(null);
  const { value: keyword, setValue: setKeyword } = useSessionState<string>(
    'dashboard:keyword',
    '',
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingStageMove, setPendingStageMove] =
    useState<PendingStageMove | null>(null);
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(
    null,
  );
  const { value: stageViewSettings, setValue: setStageViewSettings } =
    useSessionState<unknown>('dashboard:stage-view-settings', {});
  useEffect(() => {
    setRecords(data);
  }, [data]);

  const applications: ApplicationRecord[] = records ?? data;
  const normalizedKeyword: string = keyword.trim().toLocaleLowerCase('zh-CN');
  const visibleApplications: ApplicationRecord[] = useMemo(() => {
    if (!normalizedKeyword) return applications;
    return applications.filter((item: ApplicationRecord) =>
      [
        item.fields['公司名称'],
        item.fields['岗位名称'],
        formatLocations(item.fields['工作地区']),
        item.fields['所属行业'],
      ].some((value: string) =>
        (value || '').toLocaleLowerCase('zh-CN').includes(normalizedKeyword),
      ),
    );
  }, [applications, normalizedKeyword]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const counts: Record<string, number> = useMemo(
    () =>
      applications.reduce(
        (result: Record<string, number>, item: ApplicationRecord) => {
          const status: string = getApplicationStatus(item);
          result[status] = (result[status] || 0) + 1;
          return result;
        },
        {},
      ),
    [applications],
  );
  const inProgress: number = [
    '测评',
    '笔试',
    'AI面试',
    '一面',
    '二面',
    '三面',
    'HR面',
  ].reduce((sum: number, status: string) => sum + (counts[status] || 0), 0);
  const reviewCounts: Record<string, number> = useMemo(
    () =>
      Object.fromEntries(
        applications
          .filter((item: ApplicationRecord) => Boolean(item.record_id))
          .map((item: ApplicationRecord) => [
            item.record_id || '',
            item.review_count || 0,
          ]),
      ),
    [applications],
  );

  const openReviewFor = async (
    application: ApplicationRecord,
    stage: string,
  ): Promise<void> => {
    const recordId: string | undefined = application.record_id;
    if (!recordId) return;
    let matched: InterviewReview | null = null;
    try {
      const reviews: InterviewReview[] =
        await api.listInterviewReviews(recordId);
      matched =
        reviews.find((review: InterviewReview) => review.stage === stage) ||
        null;
    } catch {
      matched = null;
    }
    setReviewDialog({
      applicationId: recordId,
      company: application.fields['公司名称'] || '',
      position: application.fields['岗位名称'] || '',
      stage,
      interviewTime:
        application.fields['流程时间']?.[stage as ApplicationProcessStage],
      review: matched,
    });
  };

  const activeApplication: ApplicationRecord | undefined = applications.find(
    (item: ApplicationRecord) => item.record_id === activeId,
  );

  const updateStageViewSettings = (
    groupKey: string,
    settings: StageViewSettings,
  ): void => {
    setStageViewSettings((current: unknown) => {
      const normalizedCurrent: Record<string, unknown> = isRecord(current)
        ? current
        : {};
      return {
        ...normalizedCurrent,
        [groupKey]: settings,
      };
    });
  };

  const refreshBoard = () => {
    setRecords(null);
    refetch();
    toast.success('看板已刷新');
  };

  const clearSearch = (): void => {
    setKeyword('');
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const persistChanges = async (
    recordId: string,
    previousApplications: ApplicationRecord[],
    nextApplications: ApplicationRecord[],
    changedApplications: ApplicationRecord[],
    successMessage: string,
  ): Promise<void> => {
    const optimisticUpdatedAt: string = new Date().toISOString();
    const optimisticApplications: ApplicationRecord[] = nextApplications.map(
      (application: ApplicationRecord) =>
        application.record_id === recordId
          ? { ...application, updated_at: optimisticUpdatedAt }
          : application,
    );
    setRecords(optimisticApplications);
    setSavingId(recordId);
    try {
      const previousById: Map<string, ApplicationRecord> = new Map(
        previousApplications.map((application: ApplicationRecord) => [
          application.record_id || '',
          application,
        ]),
      );
      await Promise.all(
        changedApplications.flatMap((application: ApplicationRecord) => {
          const previous: ApplicationRecord | undefined = previousById.get(
            application.record_id || '',
          );
          const changedFields: Partial<ApplicationRecord['fields']> = {};
          if (
            !previous ||
            getApplicationStatus(previous) !== getApplicationStatus(application)
          ) {
            changedFields['当前进度'] = getApplicationStatus(application);
          }
          if (
            !previous ||
            previous.fields['看板顺序'] !== application.fields['看板顺序']
          ) {
            changedFields['看板顺序'] = application.fields['看板顺序'];
          }
          if (
            !previous ||
            previous.fields['投递时间'] !== application.fields['投递时间']
          ) {
            changedFields['投递时间'] = application.fields['投递时间'];
          }
          return Object.keys(changedFields).length > 0
            ? [
                api.updateApplication(
                  application.record_id || '',
                  changedFields,
                ),
              ]
            : [];
        }),
      );
      try {
        const refreshedApplications: ApplicationRecord[] =
          await api.listApplications();
        setRecords(refreshedApplications);
      } catch {
        // 保存已经成功；回读失败时保留即时更新后的本地数据。
      }
      toast.success(successMessage);
    } catch (caughtError: unknown) {
      setRecords(previousApplications);
      const message: string =
        caughtError instanceof Error ? caughtError.message : '未知错误';
      toast.error(`看板更新失败：${message}`);
    } finally {
      setSavingId(null);
    }
  };

  const changeApplicationStatus = async (
    application: ApplicationRecord,
    nextStatus: string,
  ): Promise<void> => {
    const recordId: string | undefined = application.record_id;
    const previousStatus: string = getApplicationStatus(application);
    if (!recordId || previousStatus === nextStatus || savingId) return;

    const sourceGroup: StatusGroup = getStatusGroup(previousStatus);
    const targetGroup: StatusGroup = getStatusGroup(nextStatus);
    const sourceApplications: ApplicationRecord[] = getOrderedGroup(
      applications,
      sourceGroup,
    ).filter((item: ApplicationRecord) => item.record_id !== recordId);
    const shouldSetApplyTime: boolean =
      !application.fields['投递时间'] && hasEnteredApplicationStage(nextStatus);
    const movedApplication: ApplicationRecord = {
      ...application,
      fields: {
        ...application.fields,
        当前进度: nextStatus,
        ...(shouldSetApplyTime ? { 投递时间: new Date().toISOString() } : {}),
        看板顺序: Number.MAX_SAFE_INTEGER,
      },
    };
    const targetApplications: ApplicationRecord[] =
      sourceGroup.key === targetGroup.key
        ? [...sourceApplications, movedApplication]
        : [...getOrderedGroup(applications, targetGroup), movedApplication];
    const normalizedSource: ApplicationRecord[] =
      sourceGroup.key === targetGroup.key
        ? []
        : normalizeGroupOrder(sourceApplications);
    const normalizedTarget: ApplicationRecord[] =
      normalizeGroupOrder(targetApplications);
    const changedApplications: ApplicationRecord[] = [
      ...normalizedSource,
      ...normalizedTarget,
    ];
    const nextApplications: ApplicationRecord[] = mergeApplicationChanges(
      applications,
      changedApplications,
    );
    await persistChanges(
      recordId,
      applications,
      nextApplications,
      changedApplications,
      shouldSetApplyTime
        ? `已推进至${nextStatus}，投递时间已自动记为现在`
        : `已推进至${nextStatus}`,
    );
    // 非阻断提示：记录面试节点后提醒复盘，不打断保存
    if (['AI面试', '一面', '二面', '三面', 'HR面'].includes(nextStatus)) {
      toast.message(`已记录${nextStatus}`, {
        description: '可以花两分钟复盘这场面试',
        action: {
          label: '去复盘',
          onClick: () => void openReviewFor(application, nextStatus),
        },
      });
    }
  };

  const quickUpdateApplication = async (
    application: ApplicationRecord,
    fields: Partial<ApplicationRecord['fields']>,
  ): Promise<boolean> => {
    const recordId: string | undefined = application.record_id;
    if (!recordId || savingId) return false;
    const previousApplications: ApplicationRecord[] = applications;
    const changedApplication: ApplicationRecord = {
      ...application,
      updated_at: new Date().toISOString(),
      fields: { ...application.fields, ...fields },
    };
    setRecords(
      applications.map((item: ApplicationRecord) =>
        item.record_id === recordId ? changedApplication : item,
      ),
    );
    setSavingId(recordId);
    try {
      await api.updateApplication(recordId, fields);
      try {
        const refreshedApplications: ApplicationRecord[] =
          await api.listApplications();
        setRecords(refreshedApplications);
      } catch {
        // 保存已经成功；回读失败时保留即时更新后的本地数据。
      }
      toast.success('修改已保存');
      return true;
    } catch (caughtError: unknown) {
      setRecords(previousApplications);
      const message: string =
        caughtError instanceof Error ? caughtError.message : '未知错误';
      toast.error(`保存失败：${message}`);
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const togglePin = async (application: ApplicationRecord): Promise<void> => {
    const recordId: string | undefined = application.record_id;
    if (!recordId || savingId) return;
    const group: StatusGroup = getStatusGroup(
      getApplicationStatus(application),
    );
    const orderedApplications: ApplicationRecord[] = getOrderedGroup(
      applications,
      group,
    );
    const currentlyPinned: boolean = isPinned(application);
    const pinnedCount: number = orderedApplications.filter(isPinned).length;
    if (!currentlyPinned && pinnedCount >= MAX_PINNED_PER_GROUP) {
      toast.error(`每个阶段最多标记 ${MAX_PINNED_PER_GROUP} 条重点投递`);
      return;
    }

    const nextOrderedApplications: ApplicationRecord[] =
      orderedApplications.map((item: ApplicationRecord) =>
        item.record_id === recordId
          ? {
              ...item,
              fields: {
                ...item.fields,
                看板顺序: currentlyPinned
                  ? Number.MAX_SAFE_INTEGER
                  : -BOARD_ORDER_STEP,
              },
            }
          : item,
      );
    const normalized: ApplicationRecord[] = normalizeGroupOrder(
      nextOrderedApplications,
    );
    const nextApplications: ApplicationRecord[] = mergeApplicationChanges(
      applications,
      normalized,
    );
    await persistChanges(
      recordId,
      applications,
      nextApplications,
      normalized,
      currentlyPinned ? '已取消重点标记' : '已标为重点',
    );
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    setActiveId(null);
    if (!over || savingId) return;
    const application: ApplicationRecord | undefined = applications.find(
      (item: ApplicationRecord) => item.record_id === String(active.id),
    );
    if (!application) return;

    const overId: string = String(over.id);
    const overApplication: ApplicationRecord | undefined = applications.find(
      (item: ApplicationRecord) => item.record_id === overId,
    );
    const sourceGroup: StatusGroup = getStatusGroup(
      getApplicationStatus(application),
    );
    const targetGroup: StatusGroup = overId.startsWith(GROUP_PREFIX)
      ? STATUS_GROUPS.find(
          (group: StatusGroup) =>
            group.key === overId.slice(GROUP_PREFIX.length),
        ) || sourceGroup
      : overApplication
        ? getStatusGroup(getApplicationStatus(overApplication))
        : sourceGroup;

    if (sourceGroup.key !== targetGroup.key) {
      if (targetGroup.statuses.length === 1) {
        void changeApplicationStatus(application, targetGroup.statuses[0]);
      } else {
        setPendingStageMove({ application, targetGroup });
      }
      return;
    }

    if (!overApplication || overApplication.record_id === application.record_id)
      return;
    if (isPinned(application) !== isPinned(overApplication)) return;
    const groupApplications: ApplicationRecord[] = getOrderedGroup(
      applications,
      sourceGroup,
    );
    const sourceIndex: number = groupApplications.findIndex(
      (item: ApplicationRecord) => item.record_id === application.record_id,
    );
    const targetIndex: number = groupApplications.findIndex(
      (item: ApplicationRecord) => item.record_id === overApplication.record_id,
    );
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex)
      return;
    const normalized: ApplicationRecord[] = normalizeGroupOrder(
      arrayMove(groupApplications, sourceIndex, targetIndex),
    );
    const nextApplications: ApplicationRecord[] = mergeApplicationChanges(
      applications,
      normalized,
    );
    void persistChanges(
      application.record_id || '',
      applications,
      nextApplications,
      normalized,
      '优先顺序已更新',
    );
  };

  if (loading && applications.length === 0) return <BoardSkeleton />;

  if (error && applications.length === 0) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
        <CircleX className="mx-auto size-10 text-rose-500" />
        <h1 className="mt-4 text-xl font-bold text-rose-950">看板加载失败</h1>
        <p className="mt-2 text-sm text-rose-700">{error}</p>
        <Button className="mt-5" onClick={refreshBoard}>
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="招聘流程总览"
        title="投递看板"
        description="一屏掌握全部进展，拖动卡片调整阶段与跟进优先级。"
        actions={
          <Button asChild>
            <Link to="/applications/new">
              <Plus />
              添加投递
            </Link>
          </Button>
        }
      />

      <section
        className="flex flex-wrap items-stretch gap-2"
        aria-label="投递统计"
      >
        <StatTintCard
          label="全部"
          value={applications.length}
          icon={<Target />}
          tone="slate"
        />
        <StatTintCard
          label="已投递"
          value={counts['已投递'] || 0}
          icon={<Send />}
          tone="blue"
        />
        <StatTintCard
          label="推进中"
          value={inProgress}
          icon={<CalendarClock />}
          tone="purple"
        />
        <StatTintCard
          label="Offer"
          value={counts['已Offer'] || 0}
          icon={<CheckCircle2 />}
          tone="green"
        />
        <StatTintCard
          label="拒绝"
          value={counts['已拒绝'] || 0}
          icon={<CircleX />}
          tone="red"
        />
      </section>

      <section className="glass-toolbar flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            ref={searchInputRef}
            value={keyword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setKeyword(event.target.value)
            }
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Escape' && keyword) {
                event.preventDefault();
                clearSearch();
              }
            }}
            placeholder="搜索公司、岗位、地区或行业"
            className="h-10 border-border bg-surface-elevated/70 pl-9 pr-11 shadow-none"
          />
          {keyword && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 text-foreground-muted shadow-none hover:bg-transparent hover:text-foreground-secondary"
              onClick={clearSearch}
              aria-label="清除搜索内容"
              title="清除搜索（Esc）"
            >
              <X />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-foreground-muted" aria-live="polite">
            {normalizedKeyword
              ? `找到 ${visibleApplications.length} 条`
              : '每列最多标记 3 条重点，重点投递优先排列'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshBoard}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            刷新
          </Button>
          <SegmentedControl
            value="board"
            onChange={(value: 'board' | 'list') => {
              if (value === 'list') navigate('/applications');
            }}
            ariaLabel="切换视图"
            options={[
              {
                value: 'board',
                label: '看板',
                icon: <LayoutGrid className="size-3.5" />,
              },
              {
                value: 'list',
                label: '列表',
                icon: <List className="size-3.5" />,
              },
            ]}
          />
        </div>
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={boardCollisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <section className="overflow-x-auto rounded-2xl border border-border bg-surface-elevated/40 p-3 shadow-[var(--shadow)] backdrop-blur-sm [scrollbar-color:var(--scrollbar)_transparent] [scrollbar-width:thin]">
          <div className="grid min-w-[1120px] grid-cols-5 gap-2.5">
            {STATUS_GROUPS.map((group: StatusGroup) => {
              const settings: StageViewSettings = getStageViewSettings(
                stageViewSettings,
                group.key,
              );
              const orderedApplications: ApplicationRecord[] = getOrderedGroup(
                visibleApplications,
                group,
              );
              const filteredApplications: ApplicationRecord[] =
                settings.pinnedOnly
                  ? orderedApplications.filter(isPinned)
                  : orderedApplications;
              return (
                <StageColumn
                  key={group.key}
                  group={group}
                  applications={sortStageApplications(
                    filteredApplications,
                    settings.sortKey,
                  )}
                  totalCount={group.statuses.reduce(
                    (sum: number, status: string) =>
                      sum + (counts[status] || 0),
                    0,
                  )}
                  settings={settings}
                  onSettingsChange={(nextSettings: StageViewSettings) =>
                    updateStageViewSettings(group.key, nextSettings)
                  }
                  savingId={savingId}
                  onMove={changeApplicationStatus}
                  onTogglePin={togglePin}
                  onUpdate={quickUpdateApplication}
                  reviewCounts={reviewCounts}
                  onOpenReview={(
                    application: ApplicationRecord,
                    stage: string,
                  ) => void openReviewFor(application, stage)}
                />
              );
            })}
          </div>
        </section>

        <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
          {activeApplication ? (
            <div className="w-[236px] rotate-1 opacity-95">
              <ApplicationCard
                application={activeApplication}
                overlay
                onMove={changeApplicationStatus}
                onTogglePin={togglePin}
                onUpdate={quickUpdateApplication}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {applications.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border-strong bg-surface-elevated/60 px-6 py-12 text-center backdrop-blur-sm">
          <Target className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold text-foreground">
            从第一张卡片开始
          </h2>
          <p className="mt-2 text-sm text-foreground-secondary">
            添加投递后，就能在这里拖动卡片推进求职进度。
          </p>
          <Button asChild className="mt-5">
            <Link to="/applications/new">
              <Plus />
              添加第一条投递
            </Link>
          </Button>
        </section>
      )}

      <Dialog
        open={Boolean(pendingStageMove)}
        onOpenChange={(open: boolean) => !open && setPendingStageMove(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择具体进度</DialogTitle>
            <DialogDescription>
              {`“${
                pendingStageMove?.application.fields['公司名称'] || '该投递'
              }”将移动到`}
              {pendingStageMove?.targetGroup.label}阶段，请选择准确节点。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            {pendingStageMove?.targetGroup.statuses.map((status: string) => (
              <Button
                key={status}
                variant="outline"
                className="h-11 justify-start"
                onClick={() => {
                  if (pendingStageMove) {
                    void changeApplicationStatus(
                      pendingStageMove.application,
                      status,
                    );
                  }
                  setPendingStageMove(null);
                }}
              >
                <span
                  className={`size-2 rounded-full ${getApplicationStatusTheme(status).dot}`}
                />
                {status}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingStageMove(null)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewDialog && (
        <Suspense fallback={null}>
          <InterviewReviewDialog
            open={Boolean(reviewDialog)}
            onOpenChange={(open: boolean) => {
              if (!open) setReviewDialog(null);
            }}
            applicationId={reviewDialog.applicationId}
            company={reviewDialog.company}
            position={reviewDialog.position}
            stage={reviewDialog.stage}
            interviewTime={reviewDialog.interviewTime}
            review={reviewDialog.review}
            onSaved={() => undefined}
          />
        </Suspense>
      )}
    </div>
  );
}

function StageColumn({
  group,
  applications,
  totalCount,
  settings,
  onSettingsChange,
  savingId,
  onMove,
  onTogglePin,
  onUpdate,
  reviewCounts,
  onOpenReview,
}: {
  group: StatusGroup;
  applications: ApplicationRecord[];
  totalCount: number;
  settings: StageViewSettings;
  onSettingsChange: (settings: StageViewSettings) => void;
  savingId: string | null;
  onMove: (application: ApplicationRecord, status: string) => Promise<void>;
  onTogglePin: (application: ApplicationRecord) => Promise<void>;
  onUpdate: (
    application: ApplicationRecord,
    fields: Partial<ApplicationRecord['fields']>,
  ) => Promise<boolean>;
  reviewCounts: Record<string, number>;
  onOpenReview: (application: ApplicationRecord, stage: string) => void;
}) {
  const dragDisabled: boolean =
    settings.pinnedOnly || settings.sortKey !== 'manual';
  const { isOver, setNodeRef } = useDroppable({
    id: `${GROUP_PREFIX}${group.key}`,
    disabled: dragDisabled,
  });
  const style = STAGE_STYLES[group.key] || STAGE_STYLES.prepare;
  const pinnedApplications: ApplicationRecord[] = applications.filter(isPinned);
  const regularApplications: ApplicationRecord[] = applications.filter(
    (application: ApplicationRecord) => !isPinned(application),
  );

  return (
    <section
      ref={setNodeRef}
      className={`relative flex h-[620px] min-w-0 flex-col overflow-hidden rounded-xl border transition ${
        isOver
          ? 'border-teal-400 ring-2 ring-ring'
          : 'border-border'
      } ${style.column}`}
    >
      <div className={`h-0.5 shrink-0 ${style.line}`} />
      <header className="shrink-0 border-b border-white/10 bg-surface-elevated/55 px-3.5 py-2.5 backdrop-blur-sm">
        <div className="flex min-h-8 items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${style.dot}`} />
              <h2 className="text-sm font-black text-foreground">
                {group.label}
              </h2>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${style.soft}`}
              >
                {totalCount}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-foreground-muted">
              {group.description}
            </p>
          </div>
          <div className="flex h-8 shrink-0 items-center gap-1">
            <StageColumnControls
              groupLabel={group.label}
              settings={settings}
              onChange={onSettingsChange}
            />
            <Link
              to="/applications/new"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label={`在${group.label}阶段添加投递`}
            >
              <Plus className="size-3.5" strokeWidth={1.9} />
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-color:var(--scrollbar)_transparent] [scrollbar-width:thin]">
        {pinnedApplications.length > 0 && (
          <section aria-label="重点跟进">
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800">
              <span className="flex items-center gap-1 tracking-[0.12em]">
                <Pin className="size-3" />
                重点跟进
              </span>
              <span className="tracking-normal text-amber-700/80">
                {pinnedApplications.length}/{MAX_PINNED_PER_GROUP}
              </span>
            </div>
            <SortableContext
              items={pinnedApplications.map(
                (application: ApplicationRecord) => application.record_id || '',
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {pinnedApplications.map((application: ApplicationRecord) => (
                  <ApplicationCard
                    key={application.record_id}
                    application={application}
                    saving={savingId === application.record_id}
                    dragDisabled={dragDisabled}
                    onMove={onMove}
                    onTogglePin={onTogglePin}
                    onUpdate={onUpdate}
                    reviewCount={reviewCounts[application.record_id || ''] || 0}
                    onOpenReview={(stage: string) =>
                      onOpenReview(application, stage)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </section>
        )}

        {regularApplications.length > 0 && (
          <section
            aria-label="其他投递"
            className={
              pinnedApplications.length > 0
                ? 'mt-3 border-t border-border pt-2'
                : undefined
            }
          >
            {pinnedApplications.length > 0 && (
              <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-bold tracking-[0.12em] text-foreground-muted">
                <span>其他投递</span>
                <span className="tracking-normal text-foreground-muted">
                  {regularApplications.length}
                </span>
              </div>
            )}
            <SortableContext
              items={regularApplications.map(
                (application: ApplicationRecord) => application.record_id || '',
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {regularApplications.map((application: ApplicationRecord) => (
                  <ApplicationCard
                    key={application.record_id}
                    application={application}
                    saving={savingId === application.record_id}
                    dragDisabled={dragDisabled}
                    onMove={onMove}
                    onTogglePin={onTogglePin}
                    onUpdate={onUpdate}
                    reviewCount={reviewCounts[application.record_id || ''] || 0}
                    onOpenReview={(stage: string) =>
                      onOpenReview(application, stage)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </section>
        )}

        {regularApplications.length === 0 &&
          pinnedApplications.length === 0 && (
            <div
              className={`flex h-32 items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs leading-5 ${
                isOver
                  ? 'border-teal-400 bg-teal-50/80 font-bold text-teal-800'
                  : 'border-border text-foreground-muted'
              }`}
            >
              {isOver
                ? `松开后移至${group.label}`
                : settings.pinnedOnly
                  ? '暂无重点投递'
                  : '暂无投递，拖到这里'}
            </div>
          )}
      </div>
    </section>
  );
}

function ApplicationCard({
  application,
  saving = false,
  overlay = false,
  dragDisabled = false,
  onMove,
  onTogglePin,
  onUpdate,
  reviewCount = 0,
  onOpenReview,
}: {
  application: ApplicationRecord;
  saving?: boolean;
  overlay?: boolean;
  dragDisabled?: boolean;
  onMove: (application: ApplicationRecord, status: string) => Promise<void>;
  onTogglePin: (application: ApplicationRecord) => Promise<void>;
  onUpdate: (
    application: ApplicationRecord,
    fields: Partial<ApplicationRecord['fields']>,
  ) => Promise<boolean>;
  reviewCount?: number;
  onOpenReview?: (stage: string) => void;
}) {
  const recordId: string = application.record_id || '';
  const fields: ApplicationRecord['fields'] = application.fields;
  const status: string = getApplicationStatus(application);
  const pinned: boolean = isPinned(application);
  const theme: ApplicationStatusTheme = getApplicationStatusTheme(status);
  const latestActivityTime: string | undefined =
    application.updated_at || application.created_at;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: recordId,
    disabled: !recordId || saving || overlay || dragDisabled,
  });
  const cardStyle = {
    ...(transform
      ? { transform: CSS.Transform.toString(transform), transition }
      : { transition }),
    contentVisibility: 'auto',
    containIntrinsicSize: 'auto 260px',
  } as React.CSSProperties;

  return (
    <article
      ref={setNodeRef}
      style={cardStyle}
      className={`group relative rounded-xl border bg-surface-elevated/85 p-3 backdrop-blur-[2px] transition ${
        pinned
          ? 'border-amber-200 shadow-[var(--shadow)]'
          : 'border-border shadow-[var(--shadow)]'
      } ${
        isDragging
          ? 'opacity-25'
          : 'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow)]'
      } ${saving ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 shrink-0 rounded-full ${theme.dot}`} />
            <span className="truncate text-[10px] font-bold text-foreground-muted">
              {status}
            </span>
            {pinned && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-amber-800">
                重点
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-sm font-black text-foreground">
            {fields['公司名称'] || '未命名公司'}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-foreground-muted">
            {fields['岗位名称'] || '未命名岗位'}
          </p>
        </div>
        {!overlay && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => void onTogglePin(application)}
              className={`inline-flex size-8 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                pinned
                  ? 'text-amber-600 hover:bg-amber-50'
                  : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground-secondary'
              }`}
              aria-label={pinned ? '取消重点标记' : '标为重点'}
              title={pinned ? '取消重点标记' : '标为重点'}
            >
              <Pin className="size-4" />
            </button>
            <button
              type="button"
              disabled={dragDisabled}
              className="inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface-muted hover:text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={
                dragDisabled
                  ? '恢复默认筛选和排序后可拖动卡片'
                  : `拖动${fields['公司名称'] || '投递'}卡片`
              }
              title={
                dragDisabled ? '恢复默认筛选和排序后可拖动卡片' : undefined
              }
              {...listeners}
              {...attributes}
            >
              <GripVertical className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-foreground-muted"
        title={`最近更新时间：${parseApplicationTime(latestActivityTime)?.toLocaleString('zh-CN') || '未记录'}`}
      >
        <span className="text-foreground-muted">更新</span>
        <LiveUpdateTime value={latestActivityTime} />
      </div>
      {!overlay && hasEnteredApplicationStage(status) && (
        <InlineDateTimeEditor
          label="投递时间"
          value={fields['投递时间']}
          emptyText="补充投递时间"
          disabled={saving}
          triggerClassName="mt-1 pl-[18px] text-[10px] text-foreground-muted"
          onSave={(value: string) => onUpdate(application, { 投递时间: value })}
        />
      )}

      {!overlay && (
        <ApplicationProcessTimeline
          value={fields['流程时间']}
          currentStatus={status}
          compact
          disabled={saving}
          onSave={(value) => onUpdate(application, { 流程时间: value })}
        />
      )}
      {!overlay &&
        (() => {
          const reviewContext = getLatestInterviewStage(fields);
          if (!reviewContext || !onOpenReview) return null;
          return (
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenReview(reviewContext.stage)}
              className={cn(
                'mt-1 inline-flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                reviewCount > 0
                  ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-200/30 dark:bg-teal-50/10 dark:text-teal-700'
                  : 'border-primary/40 bg-primary/10 text-primary',
              )}
            >
              <NotebookPen className="size-3" />
              {reviewCount > 0 ? '已复盘' : '待复盘'}
            </button>
          );
        })()}

      <div
        className="mt-2.5 flex min-w-0 items-center gap-1 text-[11px] text-foreground-muted"
        title={formatLocations(fields['工作地区']) || '地区未填写'}
      >
        <MapPin className="size-3 shrink-0" />
        <span className="truncate">
          {formatLocations(fields['工作地区']) || '地区未填写'}
        </span>
      </div>
      <div className="mt-2 min-h-9 rounded-lg bg-surface-muted px-2 py-1.5 text-[11px] leading-[18px] text-foreground-secondary">
        <span className="block text-[10px] font-bold text-foreground-muted">
          下一步
        </span>
        <InlineFieldEditor
          label="下一步安排"
          value={fields['下一步安排']}
          emptyText="暂未安排"
          disabled={saving}
          triggerClassName="w-full font-semibold text-foreground-secondary"
          onSave={(value: string) =>
            onUpdate(application, { 下一步安排: value })
          }
        />
      </div>

      {!overlay && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2">
          <Select
            value={status}
            disabled={saving}
            onValueChange={(nextStatus: string) =>
              void onMove(application, nextStatus)
            }
          >
            <SelectTrigger
              className="h-7 min-w-0 flex-1 border-border bg-surface-elevated px-2 text-[11px] font-bold shadow-none"
              aria-label="更改投递进度"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            to={`/applications/edit/${recordId}`}
            className="rounded-md p-1.5 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
            aria-label="打开投递详情"
          >
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      )}
    </article>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-label="正在加载投递看板">
      <div className="glass-panel h-20 animate-pulse" />
      <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
      <div className="grid min-w-[1120px] grid-cols-5 gap-2.5 rounded-2xl bg-surface-muted p-3">
        {[1, 2, 3, 4, 5].map((item: number) => (
          <div
            key={item}
            className="h-[620px] animate-pulse rounded-xl bg-surface-elevated/80"
          />
        ))}
      </div>
    </div>
  );
}
