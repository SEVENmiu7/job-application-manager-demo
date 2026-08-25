import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface SessionStateResult<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  clearValue: () => void;
  hasStoredValue: boolean;
}

function readSessionValue<T>(
  key: string,
  initialValue: T,
): {
  value: T;
  hasStoredValue: boolean;
} {
  try {
    const storedValue: string | null = window.sessionStorage.getItem(key);
    if (!storedValue) return { value: initialValue, hasStoredValue: false };
    return {
      value: JSON.parse(storedValue) as T,
      hasStoredValue: true,
    };
  } catch (error: unknown) {
    logger.warn(
      JSON.stringify({
        message: '读取页面草稿失败',
        key,
        error: error instanceof Error ? error.message : '未知错误',
      }),
    );
    return { value: initialValue, hasStoredValue: false };
  }
}

export function useSessionState<T>(
  key: string,
  initialValue: T,
  persistInitialValue: boolean = true,
): SessionStateResult<T> {
  const [initialState] = useState(() => readSessionValue(key, initialValue));
  const [value, setValue] = useState<T>(initialState.value);
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (
      isFirstRender.current &&
      !persistInitialValue &&
      !initialState.hasStoredValue
    ) {
      isFirstRender.current = false;
      return;
    }
    isFirstRender.current = false;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error: unknown) {
      logger.warn(
        JSON.stringify({
          message: '保存页面草稿失败',
          key,
          error: error instanceof Error ? error.message : '未知错误',
        }),
      );
    }
  }, [initialState.hasStoredValue, key, persistInitialValue, value]);

  const clearValue = useCallback((): void => {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error: unknown) {
      logger.warn(
        JSON.stringify({
          message: '清除页面草稿失败',
          key,
          error: error instanceof Error ? error.message : '未知错误',
        }),
      );
    }
  }, [key]);

  return {
    value,
    setValue,
    clearValue,
    hasStoredValue: initialState.hasStoredValue,
  };
}
