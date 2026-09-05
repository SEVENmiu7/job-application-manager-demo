import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ApplicationRecord,
  ApplicationStats,
  Platform,
} from '@shared/types';
import type {
  InterviewReview,
  InterviewReviewListResponse,
  InterviewReviewMutationResponse,
  InterviewReviewSavePayload,
} from '@shared/api.interface';

type BackendRequestConfig = Omit<AxiosRequestConfig, 'url'>;

interface RecordIdResponse {
  record_id: string;
}

interface PlatformListResponse {
  ok: boolean;
  data: Platform[];
}

function getErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (typeof data === 'object' && data !== null) {
    if ('msg' in data && typeof data.msg === 'string') {
      return data.msg;
    }
    if ('message' in data && typeof data.message === 'string') {
      return data.message;
    }
  }

  return `HTTP ${status}`;
}

async function request<T>(
  path: string,
  config: BackendRequestConfig = {},
): Promise<T> {
  const response: AxiosResponse<T> = await axiosForBackend<T>({
    ...config,
    url: `/api${path}`,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(getErrorMessage(response.data, response.status));
  }

  return response.data;
}

export const api = {
  listApplications: (filters?: Record<string, string>) => {
    return request<ApplicationRecord[]>('/applications', { params: filters });
  },
  listBoardApplications: () => {
    return request<ApplicationRecord[]>('/applications/board');
  },
  getApplication: (id: string) =>
    request<ApplicationRecord | null>(`/applications/${id}`),
  createApplication: (fields: Record<string, unknown>) =>
    request<RecordIdResponse>('/applications', {
      method: 'POST',
      data: { fields },
    }),
  updateApplication: (id: string, fields: Record<string, unknown>) =>
    request<RecordIdResponse>(`/applications/${id}`, {
      method: 'PUT',
      data: { fields },
    }),
  deleteApplication: (id: string) =>
    request<boolean>(`/applications/${id}`, { method: 'DELETE' }),
  getStats: () => request<ApplicationStats>('/applications/stats'),
  listInterviewReviews: (applicationId: string) =>
    request<InterviewReviewListResponse>('/interview-reviews', {
      params: { applicationId },
    }).then((result: InterviewReviewListResponse) => result.items || []),
  createInterviewReview: (
    applicationId: string,
    review: InterviewReviewSavePayload,
  ) =>
    request<InterviewReviewMutationResponse>('/interview-reviews', {
      method: 'POST',
      data: { applicationId, review },
    }).then((result: InterviewReviewMutationResponse) => result.review),
  updateInterviewReview: (
    reviewId: string,
    review: InterviewReviewSavePayload,
  ) =>
    request<InterviewReviewMutationResponse>(`/interview-reviews/${reviewId}`, {
      method: 'PUT',
      data: { review },
    }).then((result: InterviewReviewMutationResponse) => result.review),
  deleteInterviewReview: (reviewId: string) =>
    request<boolean>(`/interview-reviews/${reviewId}`, {
      method: 'DELETE',
    }),
  getPlatforms: async (): Promise<Platform[]> => {
    const response: PlatformListResponse = await request<PlatformListResponse>(
      '/scraping/platforms',
    );
    return response.data;
  },
};
