export interface DemoApplicationSeed {
  company: string;
  position: string;
  location: string;
  industry: string;
  functions: string[];
  channel: string;
  favoriteTime: string;
  applyTime: string | null;
  status: string;
  nextStep: string;
  notes: string;
  resumeTag: string;
  boardOrder: number;
  jobResponsibilities: string;
  jobRequirements: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoSeedInput {
  company: string;
  position: string;
  location: string;
  industry: string;
  functions: string[];
  channel: string;
  status: string;
  nextStep: string;
  highlight: string;
}

const createDemoSeed = (
  input: DemoSeedInput,
  index: number,
): DemoApplicationSeed => {
  const day: string = String(index + 4).padStart(2, '0');
  const hasApplied: boolean = !['收藏', '准备中'].includes(input.status);
  const timestamp: string = `2026-08-${day}T0${index % 9}:20:00.000Z`;
  const pinnedIndexes: number[] = [0, 2, 6, 10];

  return {
    ...input,
    favoriteTime: timestamp,
    applyTime: hasApplied ? `2026-08-${day}T10:30:00.000Z` : null,
    notes: `演示数据：${input.highlight}`,
    resumeTag: `${input.functions[0]}版演示简历`,
    boardOrder: pinnedIndexes.includes(index) ? -1000 : (index + 1) * 1000,
    jobResponsibilities: `围绕${input.position}岗位开展需求分析、方案设计、跨团队协作与项目复盘。`,
    jobRequirements: `具备${input.functions.join('、')}相关项目经验，有良好的结构化思考、沟通和数据分析能力。`,
    createdAt: timestamp,
    updatedAt: `2026-08-25T${String(index + 1).padStart(2, '0')}:10:00.000Z`,
  };
};

const DEMO_SEED_INPUTS: DemoSeedInput[] = [
  {
    company: '北辰云科',
    position: '产品经理培养生',
    location: '北京',
    industry: '互联网',
    functions: ['产品'],
    channel: '校招官网',
    status: '收藏',
    nextStep: '完成岗位拆解，周五前确定是否投递',
    highlight: '业务方向与个人经历匹配度较高。',
  },
  {
    company: '澄海数据',
    position: '商业分析师',
    location: '上海',
    industry: '金融',
    functions: ['产品', '职能'],
    channel: '内推',
    status: '准备中',
    nextStep: '补充 SQL 项目成果并完成简历二校',
    highlight: '需要突出数据分析和业务沟通经验。',
  },
  {
    company: '拾光互娱',
    position: '用户运营培养生',
    location: '广州',
    industry: '互联网',
    functions: ['运营'],
    channel: 'Boss',
    status: '已投递',
    nextStep: '三天后检查进展，准备用户增长案例',
    highlight: '已完成官网投递，待简历筛选。',
  },
  {
    company: '凌波智能',
    position: 'AI 产品助理',
    location: '深圳',
    industry: '互联网',
    functions: ['产品'],
    channel: '牛客',
    status: '测评',
    nextStep: '8 月 27 日前完成逻辑与产品感测评',
    highlight: '测评链接已收到，预留 90 分钟完成。',
  },
  {
    company: '青屿咨询',
    position: '行业研究顾问',
    location: '上海',
    industry: '咨询',
    functions: ['职能'],
    channel: '猎聘',
    status: '笔试',
    nextStep: '整理新消费行业框架，周六完成案例笔试',
    highlight: '笔试要求 48 小时内提交 5 页分析。',
  },
  {
    company: '星轨电商',
    position: '电商策略运营',
    location: '杭州',
    industry: '电商',
    functions: ['运营'],
    channel: '校招官网',
    status: 'AI面试',
    nextStep: '准备 3 个 STAR 案例，模拟摄像头面试',
    highlight: 'AI 面试共 6 题，预计用时 30 分钟。',
  },
  {
    company: '云岚科技',
    position: 'B 端产品经理',
    location: '北京',
    industry: '互联网',
    functions: ['产品'],
    channel: '内推',
    status: '一面',
    nextStep: '8 月 28 日 14:00 参加产品一面',
    highlight: '已完成业务调研，重点准备需求优先级案例。',
  },
  {
    company: '矩阵金融',
    position: '数字化产品培养生',
    location: '深圳',
    industry: '金融',
    functions: ['产品'],
    channel: '官网',
    status: '二面',
    nextStep: '复盘一面问题，准备业务指标设计题',
    highlight: '一面已通过，二面偏业务场景分析。',
  },
  {
    company: '沐光教育',
    position: '学习产品运营',
    location: '远程',
    industry: '教育',
    functions: ['产品', '运营'],
    channel: '脉脉',
    status: '三面',
    nextStep: '整理课程完课率提升方案，准备终面',
    highlight: '前两轮反馈积极，终面聚焦业务判断。',
  },
  {
    company: '远帆出行',
    position: '市场策略培养生',
    location: '上海',
    industry: '互联网',
    functions: ['市场'],
    channel: '校招官网',
    status: 'HR面',
    nextStep: '准备期望城市、薪资范围和入职时间',
    highlight: '业务面已完成，等待 HR 排期。',
  },
  {
    company: '山海内容',
    position: '内容产品经理',
    location: '北京',
    industry: '互联网',
    functions: ['产品', '运营'],
    channel: '内推',
    status: '谈Offer',
    nextStep: '对比薪资结构与成长路径，整理沟通问题',
    highlight: '已口头确认录用意向，待正式沟通。',
  },
  {
    company: '新叶零售',
    position: '零售数字化产品',
    location: '杭州',
    industry: '电商',
    functions: ['产品'],
    channel: '官网',
    status: '已Offer',
    nextStep: '8 月 29 日前回复 Offer，同步确认入职材料',
    highlight: '书面 Offer 已收到，正在综合评估。',
  },
  {
    company: '晨星消费',
    position: '品牌策划培养生',
    location: '广州',
    industry: '电商',
    functions: ['市场'],
    channel: '牛客',
    status: '已拒绝',
    nextStep: '记录复盘，暂不继续跟进',
    highlight: '岗位定位与个人方向不符，已主动结束流程。',
  },
  {
    company: '原野科技',
    position: '增长产品经理',
    location: '深圳',
    industry: '互联网',
    functions: ['产品', '运营'],
    channel: '内推',
    status: '一面',
    nextStep: '准备增长实验设计和北极星指标案例',
    highlight: '业务团队重视实验方法和数据判断。',
  },
  {
    company: '蓝桥数智',
    position: '解决方案产品经理',
    location: '北京',
    industry: '互联网',
    functions: ['产品'],
    channel: '猎聘',
    status: '已投递',
    nextStep: '关注简历进展，补充行业解决方案案例',
    highlight: '通过猎头推荐，已完成首轮材料提交。',
  },
  {
    company: '枫谷生活',
    position: '会员运营专员',
    location: '杭州',
    industry: '电商',
    functions: ['运营'],
    channel: 'Boss',
    status: '测评',
    nextStep: '完成数字推理测评，整理会员分层案例',
    highlight: '测评截止时间为 8 月 27 日 18:00。',
  },
];

export const DEMO_APPLICATION_SEEDS: DemoApplicationSeed[] =
  DEMO_SEED_INPUTS.map(createDemoSeed);
