// 前后端共享的类型定义

export interface ApplicationRecord {
  record_id?: string;
  /** 当前投递下的面试复盘数量。 */
  review_count?: number;
  fields: {
    公司名称: string;
    岗位名称: string;
    工作地区: string[];
    所属行业: string;
    职能方向: string[];
    招聘渠道: string;
    收藏时间?: string;
    投递时间?: string;
    流程时间: ApplicationProcessTimes;
    当前进度: string;
    下一步安排: string;
    个人备注: string;
    岗位职责?: string;
    任职要求?: string;
    看板顺序?: number;
    简历?: any[];
    简历标识: string;
  };
  created_at?: string;
  updated_at?: string;
}

export type ApplicationProcessStage =
  | '测评'
  | '笔试'
  | 'AI面试'
  | '一面'
  | '二面'
  | '三面'
  | 'HR面'
  | '谈Offer'
  | '已Offer';

export type ApplicationProcessTimes = Partial<
  Record<ApplicationProcessStage, string>
>;

export const PROCESS_TIME_STAGES: ApplicationProcessStage[] = [
  '测评',
  '笔试',
  'AI面试',
  '一面',
  '二面',
  '三面',
  'HR面',
  '谈Offer',
  '已Offer',
];

export interface ApplicationStats {
  total: number;
  pipeline: { status: string; count: number }[];
  statusCount: Record<string, number>;
}

export interface Platform {
  id: string;
  name: string;
  url: string;
  description: string;
  fields: string[];
}

export const STATUS_ORDER = [
  '收藏',
  '准备中',
  '已投递',
  '测评',
  '笔试',
  'AI面试',
  '一面',
  '二面',
  '三面',
  'HR面',
  '谈Offer',
  '已Offer',
  '已拒绝',
];

const APPLIED_STATUS_INDEX = STATUS_ORDER.indexOf('已投递');

export function hasEnteredApplicationStage(status?: string): boolean {
  const statusIndex: number = STATUS_ORDER.indexOf(status || '');
  return statusIndex >= APPLIED_STATUS_INDEX;
}

export interface StatusGroup {
  key: string;
  label: string;
  description: string;
  statuses: string[];
}

export const STATUS_GROUPS: StatusGroup[] = [
  {
    key: 'prepare',
    label: '准备',
    description: '收藏与材料准备',
    statuses: ['收藏', '准备中'],
  },
  {
    key: 'apply',
    label: '投递',
    description: '已提交申请',
    statuses: ['已投递'],
  },
  {
    key: 'assessment',
    label: '测评',
    description: '在线测评与笔试',
    statuses: ['测评', '笔试'],
  },
  {
    key: 'interview',
    label: '面试',
    description: 'AI 与各轮人工面试',
    statuses: ['AI面试', '一面', '二面', '三面', 'HR面'],
  },
  {
    key: 'result',
    label: '结果',
    description: 'Offer 与结束状态',
    statuses: ['谈Offer', '已Offer', '已拒绝'],
  },
];

export const STATUS_COLORS: Record<string, string> = {
  收藏: 'bg-gray-100 text-gray-600',
  准备中: 'bg-purple-100 text-purple-700',
  已投递: 'bg-blue-100 text-blue-700',
  测评: 'bg-fuchsia-100 text-fuchsia-700',
  笔试: 'bg-gray-200 text-gray-600',
  AI面试: 'bg-cyan-100 text-cyan-700',
  一面: 'bg-green-100 text-green-700',
  二面: 'bg-orange-100 text-orange-700',
  三面: 'bg-orange-200 text-orange-800',
  HR面: 'bg-cyan-100 text-cyan-700',
  谈Offer: 'bg-yellow-100 text-yellow-700',
  已Offer: 'bg-emerald-100 text-emerald-700',
  已拒绝: 'bg-red-100 text-red-600',
};

export const LOCATION_OPTIONS = [
  '北京',
  '上海',
  '深圳',
  '广州',
  '杭州',
  '成都',
  '南京',
  '武汉',
  '西安',
  '厦门',
  '东莞',
  '远程',
  '其他',
];

// 地区选择器数据：参考主流招聘平台（Boss直聘/猎聘）的城市选择结构，
// 热门城市 + 按大区分组，覆盖更完整的求职城市；仅用于 UI 选择器。
export interface LocationGroup {
  region: string;
  cities: string[];
}

export const LOCATION_GROUPS: LocationGroup[] = [
  {
    region: '热门城市',
    cities: ['北京', '上海', '深圳', '广州', '杭州', '成都', '南京', '武汉', '西安'],
  },
  {
    region: '华北',
    cities: ['北京', '天津', '石家庄', '太原', '呼和浩特'],
  },
  {
    region: '华东',
    cities: [
      '上海',
      '杭州',
      '南京',
      '苏州',
      '合肥',
      '宁波',
      '无锡',
      '济南',
      '青岛',
      '福州',
      '厦门',
      '南昌',
    ],
  },
  {
    region: '华南',
    cities: ['深圳', '广州', '东莞', '佛山', '珠海', '南宁', '海口'],
  },
  {
    region: '华中',
    cities: ['武汉', '长沙', '郑州'],
  },
  {
    region: '西南',
    cities: ['成都', '重庆', '昆明', '贵阳'],
  },
  {
    region: '西北',
    cities: ['西安', '兰州', '乌鲁木齐'],
  },
  {
    region: '东北',
    cities: ['沈阳', '大连', '哈尔滨', '长春'],
  },
  {
    region: '特殊',
    cities: ['远程', '海外', '其他'],
  },
];

export const ALL_LOCATION_CITIES: string[] = Array.from(
  new Set(LOCATION_GROUPS.flatMap((group: LocationGroup) => group.cities)),
);

export function formatLocations(locations?: string[]): string {
  return locations?.filter(Boolean).join('、') || '';
}
export const INDUSTRY_OPTIONS = [
  '互联网',
  '金融',
  '咨询',
  '电商',
  '教育',
  '其他',
];
export const FUNCTION_OPTIONS = [
  '产品',
  '运营',
  '市场',
  '技术',
  '职能',
  '其他',
];
export const CHANNEL_OPTIONS = [
  '官网',
  '牛客',
  'Boss',
  '猎聘',
  '脉脉',
  '校招官网',
  '内推',
  '其他',
];
