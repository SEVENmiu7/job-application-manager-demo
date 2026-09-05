/* 前后端共享的类型写在这里 */

/** 复盘中的一条问题记录 */
export interface InterviewReviewQuestion {
  /** 面试问题 */
  question: string;
  /** 我的回答要点 */
  myAnswer: string;
  /** 暴露的问题 */
  problem: string;
  /** 更好的回答思路 */
  betterApproach: string;
}

/** 复盘中的一条下一步行动 */
export interface InterviewReviewNextAction {
  /** 行动内容 */
  content: string;
  /** 截止时间（ISO 串） */
  dueTime?: string;
  /** 是否完成 */
  done: boolean;
}

/** 面试复盘数据实体（保存在应用数据库，独立于飞书投递表） */
export interface InterviewReview {
  id: string;
  userId: string;
  applicationId: string;
  /** 面试轮次，如「一面」「AI面试」 */
  stage: string;
  /** 面试时间（ISO 串） */
  interviewTime?: string;
  /** 面试形式：电话/视频/现场/其他 */
  format?: string;
  /** 面试官或部门 */
  interviewer?: string;
  /** 整体感受 1-5（仅主观感受） */
  overallFeeling?: number;
  /** 原始速记 */
  rawNotes?: string;
  /** 多条问题记录 */
  questions: InterviewReviewQuestion[];
  /** 做得好的地方 */
  wentWell?: string;
  /** 需要改进的地方 */
  improvements?: string;
  /** 对岗位、团队和公司的新判断 */
  companySignals?: string;
  /** 多条下一步行动 */
  nextActions: InterviewReviewNextAction[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewReviewSavePayload {
  stage: string;
  interviewTime?: string;
  format?: string;
  interviewer?: string;
  overallFeeling?: number;
  rawNotes?: string;
  questions: InterviewReviewQuestion[];
  wentWell?: string;
  improvements?: string;
  companySignals?: string;
  nextActions: InterviewReviewNextAction[];
}

export interface InterviewReviewListResponse {
  items: InterviewReview[];
}

export interface InterviewReviewMutationResponse {
  review: InterviewReview;
}
