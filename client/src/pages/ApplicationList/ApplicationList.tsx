import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenText,
  ArrowUpDown,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Edit2,
  FileText,
  Filter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { ApplicationRecord } from '../../../../shared/types';
import {
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

type DetailKind = 'note' | 'responsibilities' | 'requirements';
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
  kind: DetailKind;
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
      <header className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(122deg,#092235_0%,#0b3a4b_60%,#086267_100%)] px-5 py-6 text-white shadow-[0_20px_50px_-34px_rgba(8,47,73,0.75)] md:px-7">
        <div className="absolute -right-16 -top-24 size-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 size-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-cyan-200">
              <BriefcaseBusiness className="size-4" />
              Application archive
            </div>
            <h1 className="text-3xl font-black tracking-[-0.035em] text-white md:text-[34px]">
              投递列表
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              共 <span className="font-black text-white">{data.length}</span>{' '}
              条投递记录
              {activeFilterCount > 0 && '，当前结果已筛选'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/10 font-bold text-white shadow-none backdrop-blur-sm hover:border-white/45 hover:bg-white/15 hover:text-white"
            >
              <Link to="/">
                <LayoutGrid />
                投递看板
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-white/40 bg-white font-bold text-slate-950 shadow-lg shadow-cyan-950/20 hover:bg-cyan-50"
            >
              <Link to="/applications/new">
                <PlusCircle />
                添加投递
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="application-filter-bar ui-surface sticky top-16 z-30 p-3 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl md:top-0 md:p-5">
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
          <div className="hidden overflow-hidden rounded-[24px] border border-white/80 bg-white/70 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.6)] backdrop-blur-xl lg:block">
            <Table className="min-w-[1340px] table-fixed">
              <TableHeader className="bg-slate-900 text-white">
                <TableRow className="border-slate-800 hover:bg-slate-900">
                  <TableHead className="h-12 w-[230px] px-5 text-sm font-bold text-slate-200">
                    公司与岗位
                  </TableHead>
                  <TableHead className="w-[150px] text-center text-sm font-bold text-slate-200">
                    地区与行业
                  </TableHead>
                  <TableHead className="w-[170px] text-center text-sm font-bold text-slate-200">
                    职能与渠道
                  </TableHead>
                  <TableHead className="w-[130px] text-center text-sm font-bold text-slate-200">
                    当前进度
                  </TableHead>
                  <TableHead className="w-[190px] text-center text-sm font-bold text-slate-200">
                    时间与下一步
                  </TableHead>
                  <TableHead className="w-[250px] text-center text-sm font-bold text-slate-200">
                    资料抽屉
                  </TableHead>
                  <TableHead className="w-[150px] pr-5 text-center text-sm font-bold text-slate-200">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item: ApplicationRecord, index: number) => (
                  <ApplicationTableRow
                    key={item.record_id || index}
                    item={item}
                    onDelete={() => setDeleteTarget(item)}
                    onOpenDetail={(kind: DetailKind) =>
                      setDetailDrawer({ item, kind })
                    }
                    saving={savingQuickEdit === item.record_id}
                    onUpdate={(fields) => handleQuickUpdate(item, fields)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {sortedData.map((item: ApplicationRecord, index: number) => (
              <ApplicationMobileCard
                key={item.record_id || index}
                item={item}
                onDelete={() => setDeleteTarget(item)}
                onOpenDetail={(kind: DetailKind) =>
                  setDetailDrawer({ item, kind })
                }
                saving={savingQuickEdit === item.record_id}
                onUpdate={(fields) => handleQuickUpdate(item, fields)}
              />
            ))}
          </div>
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
  onOpenDetail: (kind: DetailKind) => void;
  saving: boolean;
  onUpdate: (fields: Partial<ApplicationRecord['fields']>) => Promise<boolean>;
}) {
  const fields: ApplicationRecord['fields'] = item.fields;
  const status: string = fields['当前进度'] || '收藏';

  return (
    <TableRow className="group border-slate-100 even:bg-slate-50/45 hover:bg-cyan-50/55">
      <TableCell className="max-w-[280px] px-5 py-5">
        <div className="truncate text-base font-bold text-slate-950">
          {fields['公司名称'] || '-'}
        </div>
        <div className="mt-1 truncate text-sm font-medium text-slate-600">
          {fields['岗位名称'] || '-'}
        </div>
      </TableCell>
      <TableCell className="py-5 text-center align-middle">
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700">
          <MapPin className="size-4 text-slate-400" />
          {formatLocations(fields['工作地区']) || '-'}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {fields['所属行业'] || '-'}
        </div>
      </TableCell>
      <TableCell className="py-5 text-center align-middle">
        <div className="flex flex-wrap justify-center gap-1.5">
          {(fields['职能方向'] || []).map((direction: string) => (
            <span
              key={direction}
              className="rounded-md bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700"
            >
              {direction}
            </span>
          ))}
        </div>
        <div className="mt-2 text-sm text-slate-500">
          {fields['招聘渠道'] || '-'}
        </div>
      </TableCell>
      <TableCell className="py-5 text-center align-middle">
        <ApplicationStatusSelect
          value={status}
          disabled={saving}
          onChange={(value: string) => void onUpdate({ 当前进度: value })}
        />
        <ResumeVersionEditor
          value={fields['简历标识']}
          disabled={saving}
          className="mx-auto mt-2 w-28 justify-center"
          onSave={(value: string) => onUpdate({ 简历标识: value })}
        />
      </TableCell>
      <TableCell className="py-4 align-middle">
        <div className="mx-auto w-[164px] space-y-2.5 text-left">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wide text-slate-400">
                投递时间
              </p>
              <InlineDateTimeEditor
                label="投递时间"
                value={fields['投递时间']}
                emptyText="未记录"
                disabled={saving}
                triggerClassName="mt-0.5 text-[13px] font-semibold leading-5 text-slate-700"
                onSave={(value: string) => onUpdate({ 投递时间: value })}
              />
            </div>
          </div>
          <ApplicationProcessTimeline
            value={fields['流程时间']}
            currentStatus={status}
            compact
            disabled={saving}
            onSave={(value) => onUpdate({ 流程时间: value })}
          />
          <div className="flex items-start gap-2.5 border-t border-slate-100 pt-2.5">
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-cyan-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide text-slate-400">
                下一步
              </p>
              <InlineFieldEditor
                label="下一步安排"
                value={fields['下一步安排']}
                emptyText="暂未安排"
                disabled={saving}
                triggerClassName="mt-0.5 w-full text-[13px] font-semibold leading-5 text-cyan-800"
                onSave={(value: string) => onUpdate({ 下一步安排: value })}
              />
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-center align-middle">
        <DetailDrawerButtons fields={fields} onOpen={onOpenDetail} />
      </TableCell>
      <TableCell className="py-5 pr-5 text-center align-middle">
        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/applications/edit/${item.record_id}`}>
              <Edit2 />
              编辑
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label="删除记录"
          >
            <Trash2 />
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
  onOpenDetail: (kind: DetailKind) => void;
  saving: boolean;
  onUpdate: (fields: Partial<ApplicationRecord['fields']>) => Promise<boolean>;
}) {
  const fields: ApplicationRecord['fields'] = item.fields;
  const status: string = fields['当前进度'] || '收藏';
  const theme: ApplicationStatusTheme = getApplicationStatusTheme(status);

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-white/90 bg-white/72 p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.62)] backdrop-blur-xl">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.rail} to-transparent`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-950">
            {fields['公司名称'] || '-'}
          </h2>
          <p className="mt-1 truncate text-base font-medium text-slate-600">
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
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          {formatLocations(fields['工作地区']) || '-'}
        </div>
        <InlineDateTimeEditor
          label="投递时间"
          value={fields['投递时间']}
          emptyText="未记录"
          disabled={saving}
          triggerClassName="text-sm text-slate-600"
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
      <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/80 px-3 py-2.5 text-sm font-semibold text-cyan-900">
        <span className="mb-1 block text-[11px] font-bold text-cyan-700">
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
      <div className="mt-3">
        <DetailDrawerButtons fields={fields} onOpen={onOpenDetail} mobile />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">
          {fields['所属行业'] || '-'} · {fields['招聘渠道'] || '-'}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-600"
            aria-label="删除记录"
          >
            <Trash2 />
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

function DetailDrawerButtons({
  fields,
  onOpen,
}: {
  fields: ApplicationRecord['fields'];
  onOpen: (kind: DetailKind) => void;
  mobile?: boolean;
}) {
  const noteAvailable: boolean = Boolean(fields['个人备注']?.trim());
  const responsibilitiesAvailable: boolean = Boolean(
    fields['岗位职责']?.trim(),
  );
  const requirementsAvailable: boolean = Boolean(fields['任职要求']?.trim());

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <DetailDrawerButton
        label="个人备注"
        icon={<StickyNote />}
        available={noteAvailable}
        onClick={() => onOpen('note')}
      />
      <DetailDrawerButton
        label="岗位职责"
        icon={<BookOpenText />}
        available={responsibilitiesAvailable}
        onClick={() => onOpen('responsibilities')}
      />
      <DetailDrawerButton
        label="任职要求"
        icon={<FileText />}
        available={requirementsAvailable}
        onClick={() => onOpen('requirements')}
      />
    </div>
  );
}

function DetailDrawerButton({
  label,
  icon,
  available,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  available: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/detail relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${
        available
          ? 'border-cyan-100 bg-gradient-to-r from-cyan-50 to-white text-slate-800 hover:border-cyan-300'
          : 'border-dashed border-slate-200 bg-white/60 text-slate-400'
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-3.5 ${
          available
            ? 'bg-cyan-100 text-cyan-800'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {icon}
      </span>
      <span className="whitespace-nowrap text-[11px] font-black">{label}</span>
      <span
        className={`absolute right-1.5 top-1.5 size-1.5 rounded-full ${
          available ? 'bg-emerald-400' : 'bg-slate-200'
        }`}
        aria-hidden="true"
      />
    </button>
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
  const currentStatusIndex: number = Math.max(STATUS_ORDER.indexOf(status), 0);
  const currentStageIndex: number = Math.max(
    [
      ['收藏', '准备中'],
      ['已投递'],
      ['测评', '笔试'],
      ['AI面试', '一面', '二面', '三面', 'HR面'],
      ['谈Offer', '已Offer', '已拒绝'],
    ].findIndex((statuses: string[]) => statuses.includes(status)),
    0,
  );
  const stages: string[] = ['准备', '投递', '测评笔试', '面试', '结果'];

  return (
    <Sheet open={Boolean(detail)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[94vw] gap-0 border-l border-slate-200 bg-[#f7f8f8] p-0 sm:max-w-[680px]">
        <SheetHeader className="border-b border-slate-200 bg-white px-6 pb-5 pt-7 pr-12 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="truncate text-2xl font-black tracking-[-0.025em] text-slate-950">
                {fields?.['公司名称'] || '未命名公司'}
              </SheetTitle>
              <SheetDescription className="mt-1 truncate text-base font-medium text-slate-600">
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
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm">
            <DrawerMeta
              label="工作地区"
              value={formatLocations(fields?.['工作地区'])}
            />
            <DrawerMeta label="投递渠道" value={fields?.['招聘渠道']} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400">投递时间</p>
              <InlineDateTimeEditor
                label="投递时间"
                value={fields?.['投递时间']}
                emptyText="未记录"
                disabled={saving}
                triggerClassName="mt-1 max-w-full font-semibold text-slate-700"
                onSave={(value: string) => onUpdate({ 投递时间: value })}
              />
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-400">流程位置</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  当前节点：{status}
                </p>
              </div>
              <span className="text-right text-[11px] leading-4 text-slate-400">
                流程可能跳过节点
                <br />
                当前序号 {currentStatusIndex + 1}
              </span>
            </div>
            <div className="mt-4">
              <ApplicationProcessTimeline
                value={fields?.['流程时间']}
                currentStatus={status}
                disabled={saving}
                onSave={(value) => onUpdate({ 流程时间: value })}
              />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {stages.map((stage: string, index: number) => (
                <div key={stage} className="min-w-0 text-center">
                  <div className="flex items-center">
                    <span
                      className={`h-px flex-1 ${index <= currentStageIndex ? 'bg-cyan-500' : 'bg-slate-200'}`}
                    />
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                        index < currentStageIndex
                          ? 'border-cyan-200 bg-cyan-50 text-cyan-400'
                          : index === currentStageIndex
                            ? 'border-cyan-600 bg-white text-cyan-700 ring-4 ring-cyan-50'
                            : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                    </span>
                    <span
                      className={`h-px flex-1 ${index < currentStageIndex ? 'bg-cyan-500' : 'bg-slate-200'}`}
                    />
                  </div>
                  <p
                    className={`mt-2 truncate text-[11px] font-bold ${
                      index === currentStageIndex
                        ? 'text-cyan-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
              <p className="text-[11px] font-bold text-slate-400">下一步安排</p>
              <InlineFieldEditor
                label="下一步安排"
                value={fields?.['下一步安排']}
                emptyText="暂未安排下一步"
                multiline
                disabled={saving}
                triggerClassName="mt-1 w-full text-sm font-semibold leading-6 text-slate-700"
                onSave={(value: string) => onUpdate({ 下一步安排: value })}
              />
            </div>
          </section>

          <Tabs
            key={`${detail?.item.record_id || 'empty'}-${detail?.kind || 'note'}`}
            defaultValue={detail?.kind || 'note'}
            className="mt-4"
          >
            <div className="flex items-center justify-between gap-3">
              <TabsList className="grid h-10 flex-1 grid-cols-3 bg-slate-200/70 p-1">
                <TabsTrigger value="note" className="text-xs font-bold">
                  个人备注
                </TabsTrigger>
                <TabsTrigger
                  value="responsibilities"
                  className="text-xs font-bold"
                >
                  岗位职责
                </TabsTrigger>
                <TabsTrigger value="requirements" className="text-xs font-bold">
                  任职要求
                </TabsTrigger>
              </TabsList>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="bg-white text-slate-500"
              >
                <Link to={`/applications/edit/${detail?.item.record_id || ''}`}>
                  <Edit2 />
                  完整编辑
                </Link>
              </Button>
            </div>
            <DrawerTabContent
              value="note"
              icon={<StickyNote />}
              title="个人备注"
              content={fields?.['个人备注']}
              saving={saving}
              onSave={(value: string) => onUpdate({ 个人备注: value })}
            />
            <DrawerTabContent
              value="responsibilities"
              icon={<BookOpenText />}
              title="岗位职责"
              content={fields?.['岗位职责']}
              saving={saving}
              onSave={(value: string) => onUpdate({ 岗位职责: value })}
            />
            <DrawerTabContent
              value="requirements"
              icon={<FileText />}
              title="任职要求"
              content={fields?.['任职要求']}
              saving={saving}
              onSave={(value: string) => onUpdate({ 任职要求: value })}
            />
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerMeta({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-700">
        {value || '未填写'}
      </p>
    </div>
  );
}

function DrawerTabContent({
  value,
  icon,
  title,
  content,
  saving,
  onSave,
}: {
  value: DetailKind;
  icon: React.ReactNode;
  title: string;
  content?: string;
  saving: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const normalizedContent: string = content?.trim() || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || '');

  const saveContent = async () => {
    const saved: boolean = await onSave(draft.trim());
    if (saved) setEditing(false);
  };

  return (
    <TabsContent value={value} className="mt-3">
      <section className="min-h-64 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800 [&>svg]:size-4">
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
          <div className="mt-4">
            <Textarea
              autoFocus
              value={draft}
              disabled={saving}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDraft(event.target.value)
              }
              className="min-h-56 resize-y leading-7"
              placeholder={`填写${title}`}
              onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter')
                  void saveContent();
              }}
            />
            <div className="mt-3 flex items-center justify-between">
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
            className={`mt-4 whitespace-pre-wrap text-sm leading-7 ${
              normalizedContent ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            {normalizedContent || `暂未填写${title}。`}
          </div>
        )}
      </section>
    </TabsContent>
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
