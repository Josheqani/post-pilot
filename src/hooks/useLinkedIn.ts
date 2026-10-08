import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { LinkedInAccount } from '@/types';

const LINKEDIN_STATUS_EVENT = 'postpilot:linkedin-status-changed';

export function useLinkedIn() {
  const [account, setAccount] = useState<LinkedInAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.linkedin.getStatus();
      setIsConnected(data.isConnected);
      setAccount(data.account);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const handleBroadcast = () => {
      fetchStatus();
    };

    window.addEventListener(LINKEDIN_STATUS_EVENT, handleBroadcast);
    return () => {
      window.removeEventListener(LINKEDIN_STATUS_EVENT, handleBroadcast);
    };
  }, [fetchStatus]);

  const disconnect = async () => {
    setIsLoading(true);
    try {
      await api.linkedin.disconnect();
      setIsConnected(false);
      setAccount(null);
      window.dispatchEvent(new Event(LINKEDIN_STATUS_EVENT));
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const mockConnect = async (custom?: { name?: string; headline?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.linkedin.mockConnect(custom);
      setIsConnected(true);
      setAccount(res.account);
      window.dispatchEvent(new Event(LINKEDIN_STATUS_EVENT));
      return res.account;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    account,
    isConnected,
    isLoading,
    error,
    refresh: fetchStatus,
    disconnect,
    mockConnect,
  };
}
