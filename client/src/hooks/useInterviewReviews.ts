import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api';
import type {
  InterviewReview,
  InterviewReviewSavePayload,
} from '@shared/api.interface';

/** 按投递拉取复盘列表（面试时间倒序由后端保证） */
export function useInterviewReviews(applicationId?: string) {
  const [reviews, setReviews] = useState<InterviewReview[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!applicationId) {
      setReviews([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .listInterviewReviews(applicationId)
      .then((items: InterviewReview[]) => setReviews(items))
      .catch((caughtError: unknown) => {
        const message: string =
          caughtError instanceof Error ? caughtError.message : '未知错误';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { reviews, loading, error, refetch };
}

export function useInterviewReviewMutations() {
  const [saving, setSaving] = useState<boolean>(false);

  const createReview = useCallback(
    async (
      applicationId: string,
      payload: InterviewReviewSavePayload,
    ): Promise<InterviewReview | null> => {
      setSaving(true);
      try {
        return await api.createInterviewReview(applicationId, payload);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const updateReview = useCallback(
    async (
      reviewId: string,
      payload: InterviewReviewSavePayload,
    ): Promise<InterviewReview | null> => {
      setSaving(true);
      try {
        return await api.updateInterviewReview(reviewId, payload);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const deleteReview = useCallback(
    async (reviewId: string): Promise<boolean> => {
      setSaving(true);
      try {
        return await api.deleteInterviewReview(reviewId);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { saving, createReview, updateReview, deleteReview };
}


