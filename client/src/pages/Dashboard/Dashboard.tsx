import { useEffect, useMemo, useState } from 'react';
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
  Pin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Target,
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
import type { ApplicationRecord, StatusGroup } from '../../../../shared/types';
import {
  formatLocations,
  hasEnteredApplicationStage,
  STATUS_GROUPS,
  STATUS_ORDER,
} from '../../../../shared/types';

const GROUP_PREFIX = 'group:';
const BOARD_ORDER_STEP = 1000;
const MAX_PINNED_PER_GROUP = 3;

interface PendingStageMove {
  application: ApplicationRecord;
  targetGroup: StatusGroup;
}

// 列语义色：准备=Slate 已投递=Blue 测评=Purple 面试=Cyan 结果=Green
// 列背景只使用低透明度 tint
const STAGE_STYLES: Record<
  string,
  { dot: string; line: string; soft: string; column: string }
> = {
  prepare: {
    dot: 'bg-slate-400',
    line: 'bg-slate-300',
    soft: 'bg-slate-100 text-slate-600',
    column: 'bg-slate-100/45',
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
    <time className="truncate text-slate-700">
      {formatRelativeApplicationTime(value, now)}
    </time>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApplications(undefined, 'board');
  const [records, setRecords] = useState<ApplicationRecord[] | null>(null);
  const { value: keyword, setValue: setKeyword } = useSessionState<string>(
    'dashboard:keyword',
    '',
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingStageMove, setPendingStageMove] =
    useState<PendingStageMove | null>(null);

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
  const activeApplication: ApplicationRecord | undefined = applications.find(
    (item: ApplicationRecord) => item.record_id === activeId,
  );

  const refreshBoard = () => {
    setRecords(null);
    refetch();
    toast.success('看板已刷新');
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
      const updateResults: PromiseSettledResult<unknown>[] =
        await Promise.allSettled(
          changedApplications.flatMap((application: ApplicationRecord) => {
            const recordId: string = application.record_id || '';
            const previous: ApplicationRecord | undefined =
              previousById.get(recordId);
            if (!recordId || !previous) return [];

            const fields: Partial<ApplicationRecord['fields']> = {};
            if (
              getApplicationStatus(application) !==
              getApplicationStatus(previous)
            ) {
              fields['当前进度'] = getApplicationStatus(application);
            }
            if (
              application.fields['看板顺序'] !== previous.fields['看板顺序']
            ) {
              fields['看板顺序'] = application.fields['看板顺序'];
            }
            return Object.keys(fields).length > 0
              ? [api.updateApplication(recordId, fields)]
              : [];
          }),
        );
      const failedUpdate: PromiseRejectedResult | undefined =
        updateResults.find(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        );
      if (failedUpdate) throw failedUpdate.reason;
      try {
        const refreshedApplications: ApplicationRecord[] =
          await api.listBoardApplications();
        setRecords(refreshedApplications);
      } catch {
        // 保存已经成功；回读失败时保留即时更新后的本地数据。
      }
      toast.success(successMessage);
    } catch (caughtError: unknown) {
      try {
        setRecords(await api.listBoardApplications());
      } catch {
        setRecords(previousApplications);
      }
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
          await api.listBoardApplications();
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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={keyword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setKeyword(event.target.value)
            }
            placeholder="搜索公司、岗位、地区或行业"
            className="h-10 border-slate-200/80 bg-white/70 pl-9 shadow-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-slate-500">
            {keyword
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
        <section className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/40 p-3 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)] backdrop-blur-sm [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin]">
          <div className="grid min-w-[1240px] grid-cols-5 gap-2.5">
            {STATUS_GROUPS.map((group: StatusGroup) => (
              <StageColumn
                key={group.key}
                group={group}
                applications={getOrderedGroup(visibleApplications, group)}
                totalCount={group.statuses.reduce(
                  (sum: number, status: string) => sum + (counts[status] || 0),
                  0,
                )}
                savingId={savingId}
                onMove={changeApplicationStatus}
                onTogglePin={togglePin}
                onUpdate={quickUpdateApplication}
              />
            ))}
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
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center backdrop-blur-sm">
          <Target className="mx-auto size-10 text-teal-700" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">
            从第一张卡片开始
          </h2>
          <p className="mt-2 text-sm text-slate-600">
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
    </div>
  );
}

function StageColumn({
  group,
  applications,
  totalCount,
  savingId,
  onMove,
  onTogglePin,
  onUpdate,
}: {
  group: StatusGroup;
  applications: ApplicationRecord[];
  totalCount: number;
  savingId: string | null;
  onMove: (application: ApplicationRecord, status: string) => Promise<void>;
  onTogglePin: (application: ApplicationRecord) => Promise<void>;
  onUpdate: (
    application: ApplicationRecord,
    fields: Partial<ApplicationRecord['fields']>,
  ) => Promise<boolean>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${GROUP_PREFIX}${group.key}`,
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
          ? 'border-teal-400 ring-2 ring-teal-200/70'
          : 'border-slate-200/80'
      } ${style.column}`}
    >
      <div className={`h-0.5 shrink-0 ${style.line}`} />
      <header className="shrink-0 border-b border-white/70 bg-white/55 px-3.5 py-2.5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${style.dot}`} />
              <h2 className="text-sm font-black text-slate-950">
                {group.label}
              </h2>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${style.soft}`}
              >
                {totalCount}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {group.description}
            </p>
          </div>
          <Link
            to="/applications/new"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={`在${group.label}阶段添加投递`}
          >
            <Plus className="size-4" />
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
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
                    onMove={onMove}
                    onTogglePin={onTogglePin}
                    onUpdate={onUpdate}
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
                ? 'mt-3 border-t border-slate-200 pt-2'
                : undefined
            }
          >
            {pinnedApplications.length > 0 && (
              <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-bold tracking-[0.12em] text-slate-500">
                <span>其他投递</span>
                <span className="tracking-normal text-slate-400">
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
                    onMove={onMove}
                    onTogglePin={onTogglePin}
                    onUpdate={onUpdate}
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
                  : 'border-slate-200 text-slate-400'
              }`}
            >
              {isOver ? `松开后移至${group.label}` : '暂无投递，拖到这里'}
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
  onMove,
  onTogglePin,
  onUpdate,
}: {
  application: ApplicationRecord;
  saving?: boolean;
  overlay?: boolean;
  onMove: (application: ApplicationRecord, status: string) => Promise<void>;
  onTogglePin: (application: ApplicationRecord) => Promise<void>;
  onUpdate: (
    application: ApplicationRecord,
    fields: Partial<ApplicationRecord['fields']>,
  ) => Promise<boolean>;
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
    disabled: !recordId || saving || overlay,
  });
  const cardStyle = transform
    ? { transform: CSS.Transform.toString(transform), transition }
    : { transition };

  return (
    <article
      ref={setNodeRef}
      style={cardStyle}
      className={`group relative rounded-xl border bg-white/85 p-3 backdrop-blur-[2px] transition ${
        pinned
          ? 'border-amber-200 shadow-[0_8px_22px_-18px_rgba(180,83,9,0.5)]'
          : 'border-slate-200/85 shadow-[0_6px_18px_-16px_rgba(15,23,42,0.4)]'
      } ${
        isDragging
          ? 'opacity-25'
          : 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.45)]'
      } ${saving ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 shrink-0 rounded-full ${theme.dot}`} />
            <span className="truncate text-[10px] font-bold text-slate-400">
              {status}
            </span>
            {pinned && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-amber-800">
                重点
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-sm font-black text-slate-950">
            {fields['公司名称'] || '未命名公司'}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {fields['岗位名称'] || '未命名岗位'}
          </p>
        </div>
        {!overlay && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => void onTogglePin(application)}
              className={`inline-flex size-8 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-1 ${
                pinned
                  ? 'text-amber-600 hover:bg-amber-50'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              aria-label={pinned ? '取消重点标记' : '标为重点'}
              title={pinned ? '取消重点标记' : '标为重点'}
            >
              <Pin className="size-4" />
            </button>
            <button
              type="button"
              className="inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-1 active:cursor-grabbing"
              aria-label={`拖动${fields['公司名称'] || '投递'}卡片`}
              {...listeners}
              {...attributes}
            >
              <GripVertical className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
        title={`最近更新时间：${parseApplicationTime(latestActivityTime)?.toLocaleString('zh-CN') || '未记录'}`}
      >
        <span className="text-slate-400">更新</span>
        <LiveUpdateTime value={latestActivityTime} />
      </div>
      {!overlay && hasEnteredApplicationStage(status) && (
        <InlineDateTimeEditor
          label="投递时间"
          value={fields['投递时间']}
          emptyText="补充投递时间"
          disabled={saving}
          triggerClassName="mt-1 pl-[18px] text-[10px] text-slate-400"
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

      <div
        className="mt-2.5 flex min-w-0 items-center gap-1 text-[11px] text-slate-400"
        title={formatLocations(fields['工作地区']) || '地区未填写'}
      >
        <MapPin className="size-3 shrink-0" />
        <span className="truncate">
          {formatLocations(fields['工作地区']) || '地区未填写'}
        </span>
      </div>
      <div className="mt-2 min-h-9 rounded-lg bg-slate-50/80 px-2 py-1.5 text-[11px] leading-[18px] text-slate-600">
        <span className="block text-[10px] font-bold text-slate-400">
          下一步
        </span>
        <InlineFieldEditor
          label="下一步安排"
          value={fields['下一步安排']}
          emptyText="暂未安排"
          disabled={saving}
          triggerClassName="w-full font-semibold text-slate-700"
          onSave={(value: string) =>
            onUpdate(application, { 下一步安排: value })
          }
        />
      </div>

      {!overlay && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2">
          <Select
            value={status}
            disabled={saving}
            onValueChange={(nextStatus: string) =>
              void onMove(application, nextStatus)
            }
          >
            <SelectTrigger
              className="h-7 min-w-0 flex-1 border-slate-200 bg-white px-2 text-[11px] font-bold shadow-none"
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
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
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
      <div className="h-16 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="grid min-w-[1240px] grid-cols-5 gap-2.5 rounded-2xl bg-slate-100/70 p-3">
        {[1, 2, 3, 4, 5].map((item: number) => (
          <div
            key={item}
            className="h-[620px] animate-pulse rounded-xl bg-white/80"
          />
        ))}
      </div>
    </div>
  );
}
