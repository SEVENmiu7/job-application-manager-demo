import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenText,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  Filter,
  FolderOpen,
  LayoutGrid,
  MapPin,
  PlusCircle,
  Search,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api';
import { InlineFieldEditor } from '@/components/application/InlineFieldEditor';
import { InlineDateTimeEditor } from '@/components/application/InlineDateTimeEditor';
import { ApplicationProcessTimeline } from '@/components/application/ApplicationProcessTimeline';
import { PageHeader, SegmentedControl, StatTintCard } from '@/components/page-ui';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useApplications, useStats } from '@/hooks/useApplications';
import { useSessionState } from '@/hooks/useSessionState';
import {
  getApplicationStatusTheme,
  type ApplicationStatusTheme,
} from '@/lib/application-theme';
import {
  formatApplicationTime,
  parseApplicationTime,
} from '@/lib/application-time';
import { cn } from '@/lib/utils';
import type {
  ApplicationRecord,
  ApplicationProcessTimes,
  ApplicationProcessStage,
} from '../../../../shared/types';
import {
  PROCESS_TIME_STAGES,
  FUNCTION_OPTIONS,
  formatLocations,
  INDUSTRY_OPTIONS,
  LOCATION_OPTIONS,
  STATUS_ORDER,
} from '../../../../shared/types';

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const QUICK_STATUSES: string[] = [
  '已投递',
  '测评',
  'AI面试',
  '一面',
  '二面',
  'HR面',
  '已Offer',
];

type SortOption =
  | 'updated'
  | 'applied'
  | 'status'
  | 'company'
  | 'function'
  | 'channel'
  | 'location'
  | 'industry';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 15;

const DEFAULT_SORT_DIRECTIONS: Record<SortOption, SortDirection> = {
  updated: 'desc',
  applied: 'desc',
  status: 'asc',
  company: 'asc',
  function: 'asc',
  channel: 'asc',
  location: 'asc',
  industry: 'asc',
};

interface DetailDrawerState {
  item: ApplicationRecord;
}

export default function ApplicationList() {
  const { value: filters, setValue: setFilters } = useSessionState<
    Record<string, string>
  >('application-list:filters', {});
  const { value: showFilters, setValue: setShowFilters } =
    useSessionState<boolean>('application-list:show-filters', false);
  const { value: sortBy, setValue: setSortBy } = useSessionState<SortOption>(
    'application-list:sort-by',
    'applied',
  );
  const { value: sortDirection, setValue: setSortDirection } =
    useSessionState<SortDirection>('application-list:sort-direction', 'desc');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApplicationRecord | null>(
    null,
  );
  const [detailDrawer, setDetailDrawer] = useState<DetailDrawerState | null>(
    null,
  );
  const [savingQuickEdit, setSavingQuickEdit] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const deferredKeyword: string = useDeferredValue(filters.keyword || '');
  const requestFilters: Record<string, string> | undefined = useMemo(() => {
    const nextFilters: Record<string, string> = {
      keyword: deferredKeyword,
      status: filters.status || '',
      location: filters.location || '',
      industry: filters.industry || '',
      function: filters.function || '',
    };
    return Object.values(nextFilters).some(Boolean) ? nextFilters : undefined;
  }, [
    deferredKeyword,
    filters.function,
    filters.industry,
    filters.location,
    filters.status,
  ]);
  const { data, loading, error, refetch, replaceApplication } =
    useApplications(requestFilters);
  const { refetch: refetchStats } = useStats();
  const sortedData: ApplicationRecord[] = useMemo(() => {
    const timestamp = (value?: string): number =>
      parseApplicationTime(value)?.getTime() || 0;
    const direction: number = sortDirection === 'asc' ? 1 : -1;
    const compareText = (left?: string, right?: string): number => {
      const leftValue: string = left?.trim() || '';
      const rightValue: string = right?.trim() || '';
      if (!leftValue && !rightValue) return 0;
      if (!leftValue) return 1;
      if (!rightValue) return -1;
      return leftValue.localeCompare(rightValue, 'zh-CN') * direction;
    };
    const compareTime = (left?: string, right?: string): number => {
      const leftValue: number = timestamp(left);
      const rightValue: number = timestamp(right);
      if (!leftValue && !rightValue) return 0;
      if (!leftValue) return 1;
      if (!rightValue) return -1;
      return (leftValue - rightValue) * direction;
    };
    const compareCompany = (
      left: ApplicationRecord,
      right: ApplicationRecord,
    ): number =>
      compareText(left.fields['公司名称'], right.fields['公司名称']) ||
      compareText(left.fields['岗位名称'], right.fields['岗位名称']);

    return [...data].sort(
      (left: ApplicationRecord, right: ApplicationRecord): number => {
        if (sortBy === 'company') {
          return compareCompany(left, right);
        }
        if (sortBy === 'status') {
          const leftRank: number = STATUS_ORDER.indexOf(
            left.fields['当前进度'] || '收藏',
          );
          const rightRank: number = STATUS_ORDER.indexOf(
            right.fields['当前进度'] || '收藏',
          );
          if (leftRank !== rightRank) return (leftRank - rightRank) * direction;
          return compareCompany(left, right);
        }
        if (sortBy === 'applied') {
          return (
            compareTime(left.fields['投递时间'], right.fields['投递时间']) ||
            compareCompany(left, right)
          );
        }
        if (sortBy === 'updated') {
          return (
            compareTime(
              left.updated_at || left.created_at,
              right.updated_at || right.created_at,
            ) || compareCompany(left, right)
          );
        }
        if (sortBy === 'function') {
          return (
            compareText(
              left.fields['职能方向']?.[0],
              right.fields['职能方向']?.[0],
            ) ||
            compareText(left.fields['招聘渠道'], right.fields['招聘渠道']) ||
            compareCompany(left, right)
          );
        }
        if (sortBy === 'channel') {
          return (
            compareText(left.fields['招聘渠道'], right.fields['招聘渠道']) ||
            compareText(
              left.fields['职能方向']?.[0],
              right.fields['职能方向']?.[0],
            ) ||
            compareCompany(left, right)
          );
        }
        if (sortBy === 'location') {
          return (
            compareText(
              formatLocations(left.fields['工作地区']),
              formatLocations(right.fields['工作地区']),
            ) ||
            compareText(left.fields['所属行业'], right.fields['所属行业']) ||
            compareCompany(left, right)
          );
        }
        return (
          compareText(left.fields['所属行业'], right.fields['所属行业']) ||
          compareText(
            formatLocations(left.fields['工作地区']),
            formatLocations(right.fields['工作地区']),
          ) ||
          compareCompany(left, right)
        );
      },
    );
  }, [data, sortBy, sortDirection]);

  const sortDirectionLabel: string =
    sortBy === 'updated' || sortBy === 'applied'
      ? sortDirection === 'asc'
        ? '旧 → 新'
        : '新 → 旧'
      : sortBy === 'status'
        ? sortDirection === 'asc'
          ? '前 → 后'
          : '后 → 前'
        : sortDirection === 'asc'
          ? 'A → Z'
          : 'Z → A';

  const activeFilterCount: number = Object.entries(filters).filter(
    ([, value]: [string, string]) => Boolean(value),
  ).length;
  const currentStatus: string = filters.status || '';

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, sortDirection]);
  const totalFiltered: number = sortedData.length;
  const totalPages: number = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage: number = Math.min(page, totalPages);
  const pagedData: ApplicationRecord[] = sortedData.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const updateFilter = (key: string, value: string) => {
    setFilters((current: Record<string, string>) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleDelete = async () => {
    const recordId: string | undefined = deleteTarget?.record_id;
    if (!recordId) return;

    setDeleting(recordId);
    try {
      await api.deleteApplication(recordId);
      setDeleteTarget(null);
      await refetch();
      await refetchStats();
      toast.success('投递记录已删除');
    } catch (caughtError: unknown) {
      const message: string =
        caughtError instanceof Error ? caughtError.message : '未知错误';
      toast.error(`删除失败：${message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleQuickUpdate = async (
    item: ApplicationRecord,
    fields: Partial<ApplicationRecord['fields']>,
  ): Promise<boolean> => {
    const recordId: string | undefined = item.record_id;
    if (!recordId || savingQuickEdit) return false;
    const optimisticItem: ApplicationRecord = {
      ...item,
      updated_at: new Date().toISOString(),
      fields: { ...item.fields, ...fields },
    };
    replaceApplication(optimisticItem);
    setDetailDrawer((current: DetailDrawerState | null) =>
      current?.item.record_id === recordId
        ? { ...current, item: optimisticItem }
        : current,
    );
    setSavingQuickEdit(recordId);
    try {
      await api.updateApplication(recordId, fields);
      refetch();
      refetchStats();
      toast.success('修改已保存');
      return true;
    } catch (caughtError: unknown) {
      replaceApplication(item);
      setDetailDrawer((current: DetailDrawerState | null) =>
        current?.item.record_id === recordId ? { ...current, item } : current,
      );
      const message: string =
        caughtError instanceof Error ? caughtError.message : '未知错误';
      toast.error(`保存失败：${message}`);
      return false;
    } finally {
      setSavingQuickEdit(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Application archive"
        title="投递列表"
        description={
          <>
            共 <span className="font-bold text-slate-800">{data.length}</span>{' '}
            条投递记录
            {activeFilterCount > 0 && '，当前结果已筛选'}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/">
                <LayoutGrid />
                投递看板
              </Link>
            </Button>
            <Button asChild>
              <Link to="/applications/new">
                <PlusCircle />
                添加投递
              </Link>
            </Button>
          </>
        }
      />

      <section className="application-filter-bar sticky top-4 z-30 rounded-xl border border-slate-200/70 p-3 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.4)] md:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 md:left-3.5 md:size-5" />
            <Input
              type="search"
              value={filters.keyword || ''}
              placeholder="搜索公司或岗位名称"
              className="h-10 border-slate-200 bg-slate-50 pl-9 text-sm md:h-11 md:pl-11 md:text-base"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateFilter('keyword', event.target.value)
              }
            />
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2 lg:flex lg:items-center">
            <Select
              value={sortBy}
              onValueChange={(value: SortOption) => {
                setSortBy(value);
                setSortDirection(DEFAULT_SORT_DIRECTIONS[value]);
              }}
            >
              <SelectTrigger className="h-10 min-w-0 bg-white px-2.5 text-xs sm:text-sm lg:h-11 lg:w-48 lg:px-3">
                <ArrowUpDown className="size-3.5 shrink-0 text-slate-500 sm:size-4" />
                <SelectValue aria-label="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>常用</SelectLabel>
                  <SelectItem value="updated">最近更新</SelectItem>
                  <SelectItem value="applied">投递时间</SelectItem>
                  <SelectItem value="status">当前进度</SelectItem>
                  <SelectItem value="company">公司名称</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>岗位</SelectLabel>
                  <SelectItem value="function">职能方向</SelectItem>
                  <SelectItem value="channel">招聘渠道</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>地点</SelectLabel>
                  <SelectItem value="location">工作地区</SelectItem>
                  <SelectItem value="industry">所属行业</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-10 min-w-0 bg-white px-2.5 text-xs font-bold text-slate-700 sm:min-w-24 sm:px-3 sm:text-sm lg:h-11"
              onClick={() =>
                setSortDirection((direction: SortDirection) =>
                  direction === 'asc' ? 'desc' : 'asc',
                )
              }
              aria-label={`切换排序方向，当前为${sortDirectionLabel}`}
              title={`当前排序：${sortDirectionLabel}`}
            >
              <ArrowUpDown className="size-3.5 sm:size-4" />
              {sortDirectionLabel}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowFilters((visible: boolean) => !visible)}
              className={`h-10 min-w-0 px-2.5 text-xs font-bold sm:px-3 sm:text-sm lg:h-11 ${
                showFilters || activeFilterCount > 0
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                  : ''
              }`}
            >
              <Filter className="size-3.5 sm:size-4" />
              <span className="sm:hidden">筛选</span>
              <span className="hidden sm:inline">更多筛选</span>
              {activeFilterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-cyan-700 text-[10px] font-bold text-white sm:w-auto sm:px-1.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-2 md:mt-4">
          <span className="hidden shrink-0 text-sm font-semibold text-slate-600 sm:inline">
            快捷进度
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
            <button
              type="button"
              onClick={() => updateFilter('status', '')}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition sm:px-3 sm:py-1.5 sm:text-sm ${
                currentStatus === ''
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'
              }`}
            >
              全部
            </button>
            {QUICK_STATUSES.map((status: string) => (
              <button
                key={status}
                type="button"
                onClick={() => updateFilter('status', status)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition sm:px-3 sm:py-1.5 sm:text-sm ${
                  currentStatus === status
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : `${getApplicationStatusTheme(status).quick} hover:-translate-y-0.5 hover:shadow-sm`
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 text-xs sm:text-sm"
              onClick={() => setFilters({})}
            >
              <X className="size-3.5" />
              清除
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 min-[360px]:grid-cols-2 md:mt-5 md:gap-4 md:pt-5 xl:grid-cols-4">
            <FilterSelect
              label="当前进度"
              value={filters.status || ''}
              onChange={(value: string) => updateFilter('status', value)}
              options={STATUS_ORDER}
            />
            <FilterSelect
              label="工作地区"
              value={filters.location || ''}
              onChange={(value: string) => updateFilter('location', value)}
              options={LOCATION_OPTIONS}
            />
            <FilterSelect
              label="所属行业"
              value={filters.industry || ''}
              onChange={(value: string) => updateFilter('industry', value)}
              options={INDUSTRY_OPTIONS}
            />
            <FilterSelect
              label="职能方向"
              value={filters.function || ''}
              onChange={(value: string) => updateFilter('function', value)}
              options={FUNCTION_OPTIONS}
            />
          </div>
        )}
      </section>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-base text-slate-500">
          正在加载投递记录...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
          <div className="mb-4 text-base font-medium text-red-700">
            加载失败：{error}
          </div>
          <Button onClick={refetch}>重试</Button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Search className="size-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {activeFilterCount > 0 ? '没有符合条件的记录' : '还没有投递记录'}
          </h3>
          <p className="mt-2 text-base text-slate-500">
            {activeFilterCount > 0
              ? '试试清除筛选或调整搜索关键词'
              : '添加第一条记录，开始管理求职进度'}
          </p>
          {activeFilterCount > 0 ? (
            <Button className="mt-5" onClick={() => setFilters({})}>
              清除筛选
            </Button>
          ) : (
            <Button asChild className="mt-5">
              <Link to="/applications/new">
                <PlusCircle />
                添加投递
              </Link>
            </Button>
          )}
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)] backdrop-blur-sm">
            <Table className="min-w-[1240px] table-fixed">
              <TableHeader className="bg-white/70 backdrop-blur-sm">
                <TableRow className="border-b border-slate-200/80 hover:bg-white/70">
                  <TableHead className="h-10 w-[210px] px-4 text-[13px] font-semibold text-slate-500">
                    公司与岗位
                  </TableHead>
                  <TableHead className="w-[120px] text-center text-[13px] font-semibold text-slate-500">
                    地区
                  </TableHead>
                  <TableHead className="w-[110px] text-center text-[13px] font-semibold text-slate-500">
                    职能 · 渠道
                  </TableHead>
                  <TableHead className="w-[124px] text-center text-[13px] font-semibold text-slate-500">
                    当前进度
                  </TableHead>
                  <TableHead className="w-[180px] text-center text-[13px] font-semibold text-slate-500">
                    下一步 · 时间
                  </TableHead>
                  <TableHead className="w-[86px] text-center text-[13px] font-semibold text-slate-500">
                    资料
                  </TableHead>
                  <TableHead className="w-[130px] pr-4 text-center text-[13px] font-semibold text-slate-500">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.map((item: ApplicationRecord, index: number) => (
                  <ApplicationTableRow
                    key={item.record_id || index}
                    item={item}
                    onDelete={() => setDeleteTarget(item)}
                    onOpenDetail={() => setDetailDrawer({ item })}
                    saving={savingQuickEdit === item.record_id}
                    onUpdate={(fields) => handleQuickUpdate(item, fields)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>


          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {pagedData.map((item: ApplicationRecord, index: number) => (
              <ApplicationMobileCard
                key={item.record_id || index}
                item={item}
                onDelete={() => setDeleteTarget(item)}
                onOpenDetail={() => setDetailDrawer({ item })}
                saving={savingQuickEdit === item.record_id}
                onUpdate={(fields) => handleQuickUpdate(item, fields)}
              />
            ))}
          </div>
          <ListPagination
            page={safePage}
            totalPages={totalPages}
            total={totalFiltered}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条投递记录？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除“{deleteTarget?.fields['公司名称'] || '未命名公司'} ·{' '}
              {deleteTarget?.fields['岗位名称'] || '未命名岗位'}
              ”，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deleting)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deleting)}
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApplicationDetailDrawer
        detail={detailDrawer}
        onOpenChange={(open: boolean) => !open && setDetailDrawer(null)}
        saving={savingQuickEdit === detailDrawer?.item.record_id}
        onUpdate={(fields) =>
          detailDrawer
            ? handleQuickUpdate(detailDrawer.item, fields)
            : Promise.resolve(false)
        }
      />
    </div>
  );
}

function ApplicationStatusSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  const theme: ApplicationStatusTheme = getApplicationStatusTheme(value);

  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'relative mx-auto h-9 w-28 shrink-0 justify-center gap-0 rounded-lg px-7 text-center text-[13px] font-semibold leading-none shadow-none [&>svg]:absolute [&>svg]:right-2.5 [&>svg]:size-3.5 [&>svg]:opacity-45',
          theme.quick,
          className,
        )}
        aria-label="修改当前进度"
      >
        <span
          className={cn(
            'absolute left-2.5 size-2 shrink-0 rounded-full',
            theme.dot,
          )}
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="center" className="min-w-36">
        {STATUS_ORDER.map((option: string) => {
          const optionTheme: ApplicationStatusTheme =
            getApplicationStatusTheme(option);
          return (
            <SelectItem key={option} value={option} className="h-9">
              <span className={cn('size-2 rounded-full', optionTheme.dot)} />
              <span>{option}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function ResumeVersionEditor({
  value,
  disabled,
  className,
  onSave,
}: {
  value?: string | null;
  disabled: boolean;
  className?: string;
  onSave: (value: string) => Promise<boolean>;
}) {
  const normalizedValue: string = value || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(normalizedValue);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(normalizedValue);
  }, [editing, normalizedValue]);

  const save = async () => {
    const nextValue: string = draft.trim();
    if (nextValue === normalizedValue.trim()) {
      setEditing(false);
      return;
    }
    setSubmitting(true);
    try {
      const saved: boolean = await onSave(nextValue);
      if (saved) setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn(
          'group/resume flex min-w-0 items-center gap-1.5 rounded-md text-left text-[11px] font-medium text-slate-500 outline-none transition hover:text-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-500/30 disabled:opacity-60',
          className,
        )}
        aria-label="编辑简历版本"
      >
        <span className="min-w-0 flex-1 truncate">
          {normalizedValue || '添加简历版本'}
        </span>
        <Edit2 className="size-3 shrink-0 opacity-0 transition group-hover/resume:opacity-70 group-focus-visible/resume:opacity-70" />
      </button>
    );
  }

  return (
    <form
      className={cn('flex items-center gap-1', className)}
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();
        void save();
      }}
    >
      <Input
        autoFocus
        value={draft}
        disabled={submitting}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          setDraft(event.target.value)
        }
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setDraft(normalizedValue);
            setEditing(false);
          }
        }}
        className="h-8 min-w-0 flex-1 rounded-lg px-2 text-xs"
        placeholder="如：产品岗 V2"
        aria-label="简历版本"
      />
      <Button
        type="submit"
        size="icon"
        disabled={submitting}
        className="size-8 shrink-0"
        aria-label="保存简历版本"
      >
        <Check className="size-3.5" />
      </Button>
    </form>
  );
}

function ApplicationTableRow({
  item,
  onDelete,
  onOpenDetail,
  saving,
  onUpdate,
}: {
  item: ApplicationRecord;
  onDelete: () => void;
  onOpenDetail: () => void;
  saving: boolean;
  onUpdate: (fields: Partial<ApplicationRecord['fields']>) => Promise<boolean>;
}) {
  const fields: ApplicationRecord['fields'] = item.fields;
  const status: string = fields['当前进度'] || '收藏';
  const theme: ApplicationStatusTheme = getApplicationStatusTheme(status);
  const hasMaterials: boolean = Boolean(
    fields['个人备注']?.trim() ||
      fields['岗位职责']?.trim() ||
      fields['任职要求']?.trim(),
  );

  return (
    <TableRow className="group border-slate-100/80 hover:bg-teal-50/40">
      <TableCell className="max-w-[220px] px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          <span className={cn('size-1.5 shrink-0 rounded-full', theme.dot)} />
          <span className="truncate text-sm font-bold text-slate-900">
            {fields['公司名称'] || '-'}
          </span>
        </div>
        <div className="mt-0.5 truncate pl-3 text-xs font-medium text-slate-500">
          {fields['岗位名称'] || '-'}
        </div>
      </TableCell>
      <TableCell className="py-3 text-center align-middle">
        <div className="truncate text-[13px] font-medium text-slate-700">
          {formatLocations(fields['工作地区']) || '-'}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-400">
          {fields['所属行业'] || '-'}
        </div>
      </TableCell>
      <TableCell className="py-3 text-center align-middle">
        <div className="flex flex-wrap justify-center gap-1">
          {(fields['职能方向'] || []).slice(0, 2).map((direction: string) => (
            <span
              key={direction}
              className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold text-purple-600"
            >
              {direction}
            </span>
          ))}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-400">
          {fields['招聘渠道'] || '-'}
        </div>
      </TableCell>
      <TableCell className="py-3 text-center align-middle">
        <ApplicationStatusSelect
          value={status}
          disabled={saving}
          onChange={(value: string) => void onUpdate({ 当前进度: value })}
        />
      </TableCell>
      <TableCell className="py-3 text-center align-middle">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400">下一步</p>
          <InlineFieldEditor
            label="下一步安排"
            value={fields['下一步安排']}
            emptyText="暂未安排"
            disabled={saving}
            triggerClassName="w-full text-center text-[13px] font-semibold leading-5 text-teal-800"
            onSave={(value: string) => onUpdate({ 下一步安排: value })}
          />
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <span>投递</span>
          <InlineDateTimeEditor
            label="投递时间"
            value={fields['投递时间']}
            emptyText="未记录"
            disabled={saving}
            triggerClassName="text-[11px] font-medium text-slate-500"
            onSave={(value: string) => onUpdate({ 投递时间: value })}
          />
        </div>
      </TableCell>
      <TableCell className="py-3 text-center align-middle">
        <button
          type="button"
          onClick={onOpenDetail}
          className={cn(
            'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
            hasMaterials
              ? 'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-300'
              : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:text-slate-700',
          )}
          aria-label="打开资料抽屉"
        >
          <FolderOpen className="size-3.5" />
          资料
          {hasMaterials && (
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          )}
        </button>
      </TableCell>
      <TableCell className="py-3 pr-4 text-center align-middle">
        <div className="flex items-center justify-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link to={`/applications/edit/${item.record_id}`}>
              <Edit2 />
              编辑
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="size-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="删除记录"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ApplicationMobileCard({
  item,
  onDelete,
  onOpenDetail,
  saving,
  onUpdate,
}: {
  item: ApplicationRecord;
  onDelete: () => void;
  onOpenDetail: () => void;
  saving: boolean;
  onUpdate: (fields: Partial<ApplicationRecord['fields']>) => Promise<boolean>;
}) {
  const fields: ApplicationRecord['fields'] = item.fields;
  const status: string = fields['当前进度'] || '收藏';
  const theme: ApplicationStatusTheme = getApplicationStatusTheme(status);

  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.5)] backdrop-blur-sm">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${theme.rail} to-transparent`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-slate-950">
            {fields['公司名称'] || '-'}
          </h2>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-600">
            {fields['岗位名称'] || '-'}
          </p>
        </div>
        <ApplicationStatusSelect
          value={status}
          disabled={saving}
          onChange={(value: string) => void onUpdate({ 当前进度: value })}
          className="mx-0"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50/80 p-3 text-[13px] text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5" />
          {formatLocations(fields['工作地区']) || '-'}
        </div>
        <InlineDateTimeEditor
          label="投递时间"
          value={fields['投递时间']}
          emptyText="投递时间未记录"
          disabled={saving}
          triggerClassName="text-[13px] text-slate-600"
          onSave={(value: string) => onUpdate({ 投递时间: value })}
        />
      </div>
      <div className="mt-3">
        <ApplicationProcessTimeline
          value={fields['流程时间']}
          currentStatus={status}
          disabled={saving}
          onSave={(value) => onUpdate({ 流程时间: value })}
        />
      </div>
      <div className="mt-3 rounded-lg border border-teal-100/80 bg-teal-50/60 px-3 py-2.5 text-sm font-semibold text-teal-900">
        <span className="mb-1 block text-[11px] font-bold text-teal-600">
          下一步
        </span>
        <InlineFieldEditor
          label="下一步安排"
          value={fields['下一步安排']}
          emptyText="暂未安排"
          disabled={saving}
          triggerClassName="w-full"
          onSave={(value: string) => onUpdate({ 下一步安排: value })}
        />
      </div>
      <ResumeVersionEditor
        value={fields['简历标识']}
        disabled={saving}
        className="mt-3 w-full"
        onSave={(value: string) => onUpdate({ 简历标识: value })}
      />
      <button
        type="button"
        onClick={onOpenDetail}
        className="mt-3 inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        <FolderOpen className="size-4" />
        查看资料
      </button>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {fields['所属行业'] || '-'} · {fields['招聘渠道'] || '-'}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="size-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="删除记录"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/applications/edit/${item.record_id}`}>
              编辑
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full bg-white text-base">
          <SelectValue placeholder={`全部${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">全部</SelectItem>
          {options.map((option: string) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatDate(value?: string): string {
  return formatApplicationTime(value);
}

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: ListPaginationProps) {
  if (total === 0) return null;
  const pageNumbers: number[] = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2.5 backdrop-blur-sm"
      aria-label="投递列表分页"
    >
      <span className="text-xs text-slate-500">
        共 {total} 条 · 每页 {pageSize} 条
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="上一页"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((pageNumber: number) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? 'page' : undefined}
            className={cn(
              'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
              pageNumber === page
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            )}
          >
            {pageNumber}
          </button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="下一页"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

function ApplicationDetailDrawer({
  detail,
  onOpenChange,
  saving,
  onUpdate,
}: {
  detail: DetailDrawerState | null;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onUpdate: (fields: Partial<ApplicationRecord['fields']>) => Promise<boolean>;
}) {
  const fields: ApplicationRecord['fields'] | undefined = detail?.item.fields;
  const status: string = fields?.['当前进度'] || '收藏';
  const updatedAt: string | undefined =
    detail?.item.updated_at || detail?.item.created_at;

  return (
    <Sheet open={Boolean(detail)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[94vw] gap-0 border-l border-white/60 bg-[#f6f8fa]/95 p-0 backdrop-blur-xl sm:max-w-[min(620px,42vw)] sm:min-w-[520px]">
        <SheetHeader className="border-b border-slate-200/70 bg-white/70 px-6 pb-4 pt-6 pr-12 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-bold tracking-[-0.02em] text-slate-950">
                {fields?.['公司名称'] || '未命名公司'}
              </SheetTitle>
              <SheetDescription className="mt-0.5 truncate text-sm font-medium text-slate-600">
                {fields?.['岗位名称'] || '未命名岗位'}
              </SheetDescription>
            </div>
            <ApplicationStatusSelect
              value={status}
              disabled={saving}
              onChange={(value: string) => void onUpdate({ 当前进度: value })}
              className="mx-0 mt-0.5"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-sm">
            <DrawerMeta
              label="工作地区"
              value={formatLocations(fields?.['工作地区'])}
            />
            <DrawerMeta label="招聘渠道" value={fields?.['招聘渠道']} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400">投递时间</p>
              <InlineDateTimeEditor
                label="投递时间"
                value={fields?.['投递时间']}
                emptyText="未记录"
                disabled={saving}
                triggerClassName="mt-0.5 max-w-full text-[13px] font-semibold text-slate-700"
                onSave={(value: string) => onUpdate({ 投递时间: value })}
              />
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
          <section className="rounded-xl border border-slate-200/80 bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold text-slate-400">招聘流程</p>
              <span className="text-[11px] text-slate-400">
                节点可独立补记，无需按顺序
              </span>
            </div>
            <ProcessStageTimeline
              value={fields?.['流程时间']}
              currentStatus={status}
              disabled={saving}
              onStageTime={(stage: ApplicationProcessStage, time: string) => {
                const merged: ApplicationProcessTimes = {
                  ...(fields?.['流程时间'] || {}),
                };
                if (time) merged[stage] = time;
                else delete merged[stage];
                return onUpdate({ 流程时间: merged });
              }}
            />
            <div className="mt-3 rounded-lg bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] font-bold text-slate-400">下一步安排</p>
              <InlineFieldEditor
                label="下一步安排"
                value={fields?.['下一步安排']}
                emptyText="暂未安排下一步"
                multiline
                disabled={saving}
                triggerClassName="mt-0.5 w-full text-sm font-semibold leading-6 text-slate-700"
                onSave={(value: string) => onUpdate({ 下一步安排: value })}
              />
            </div>
          </section>

          <MaterialCard
            icon={<StickyNote />}
            title="个人备注"
            content={fields?.['个人备注']}
            updatedAt={updatedAt}
            saving={saving}
            onSave={(value: string) => onUpdate({ 个人备注: value })}
          />
          <MaterialCard
            icon={<BookOpenText />}
            title="岗位职责"
            content={fields?.['岗位职责']}
            updatedAt={updatedAt}
            saving={saving}
            onSave={(value: string) => onUpdate({ 岗位职责: value })}
          />
          <MaterialCard
            icon={<FileText />}
            title="任职要求"
            content={fields?.['任职要求']}
            updatedAt={updatedAt}
            saving={saving}
            onSave={(value: string) => onUpdate({ 任职要求: value })}
          />

          <section className="rounded-xl border border-slate-200/80 bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <FileText className="size-4 text-teal-700" />
                简历标识
              </p>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-500"
              >
                <Link to={`/applications/edit/${detail?.item.record_id || ''}`}>
                  <Edit2 />
                  完整编辑
                </Link>
              </Button>
            </div>
            <ResumeVersionEditor
              value={fields?.['简历标识']}
              disabled={saving}
              className="mt-2 w-full"
              onSave={(value: string) => onUpdate({ 简历标识: value })}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 资料抽屉内的招聘流程节点图：每个节点标注时间，点击即可修改，无需按顺序推进
function ProcessStageTimeline({
  value,
  currentStatus,
  disabled,
  onStageTime,
}: {
  value?: ApplicationProcessTimes;
  currentStatus?: string;
  disabled: boolean;
  onStageTime: (
    stage: ApplicationProcessStage,
    time: string,
  ) => Promise<boolean>;
}) {
  const processTimes: ApplicationProcessTimes = value || {};

  return (
    <ol className="mt-3 space-y-0.5">
      {PROCESS_TIME_STAGES.map(
        (stage: ApplicationProcessStage, index: number) => {
          const time: string | undefined = processTimes[stage] || undefined;
          const isCurrent: boolean = currentStatus === stage;
          return (
            <li
              key={stage}
              className="relative flex items-center gap-3 py-1 pl-0.5"
            >
              {index < PROCESS_TIME_STAGES.length - 1 && (
                <span
                  className="absolute left-[5.5px] top-4 h-[calc(100%-8px)] w-px bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'relative z-10 size-[11px] shrink-0 rounded-full border-2',
                  time
                    ? 'border-teal-500 bg-teal-500'
                    : isCurrent
                      ? 'border-cyan-400 bg-white'
                      : 'border-slate-300 bg-white',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'w-14 shrink-0 text-[13px]',
                  isCurrent
                    ? 'font-bold text-slate-900'
                    : 'font-medium text-slate-600',
                )}
              >
                {stage}
              </span>
              <InlineDateTimeEditor
                label={`${stage}时间`}
                value={time}
                emptyText="未记录，点击补记"
                disabled={disabled}
                triggerClassName="min-w-0 flex-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                onSave={(nextTime: string) => onStageTime(stage, nextTime)}
              />
            </li>
          );
        },
      )}
    </ol>
  );
}

function DrawerMeta({ label, value }: { label: string; value?: string }) {  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-700">
        {value || '未填写'}
      </p>
    </div>
  );
}

function MaterialCard({
  icon,
  title,
  content,
  updatedAt,
  saving,
  onSave,
}: {
  icon: React.ReactNode;
  title: string;
  content?: string;
  updatedAt?: string;
  saving: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const normalizedContent: string = content?.trim() || '';
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(content || '');

  const saveContent = async () => {
    const saved: boolean = await onSave(draft.trim());
    if (saved) setEditing(false);
  };

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 [&>svg]:size-4">
            {icon}
          </span>
          {title}
        </div>
        {!editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => {
              setDraft(content || '');
              setEditing(true);
            }}
          >
            <Edit2 />
            编辑
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-3">
          <Textarea
            autoFocus
            value={draft}
            disabled={saving}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDraft(event.target.value)
            }
            className="min-h-48 resize-y leading-7"
            placeholder={`填写${title}`}
            onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter')
                void saveContent();
            }}
          />
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Ctrl + Enter 保存</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void saveContent()}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${
            normalizedContent ? 'text-slate-700' : 'text-slate-400'
          }`}
        >
          {normalizedContent || `暂未填写${title}。`}
        </div>
      )}
      <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        更新于 {formatApplicationTime(updatedAt) || '未记录'}
      </p>
    </section>
  );
}
