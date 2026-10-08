import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { AIConfig, SaveAIConfigInput, AITestResult } from '@/types';

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<AITestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.ai.getConfig();
      setConfig(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (input: SaveAIConfigInput) => {
    setIsSaving(true);
    setError(null);
    try {
      await api.ai.saveConfig(input);
      await fetchConfig();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (input?: Partial<SaveAIConfigInput>) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await api.ai.testConnection(input);
      setTestResult(result);
      return result;
    } catch (err: unknown) {
      const e = err as Error;
      const res: AITestResult = {
        success: false,
        message: e.message,
      };
      setTestResult(res);
      return res;
    } finally {
      setIsTesting(false);
    }
  };

  return {
    config,
    isLoading,
    isSaving,
    isTesting,
    testResult,
    error,
    refresh: fetchConfig,
    saveConfig,
    testConnection,
  };
}
