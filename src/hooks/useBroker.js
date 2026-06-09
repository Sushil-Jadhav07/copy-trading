import { useState, useEffect, useCallback } from 'react';
import { brokerService } from '@/lib/broker';

export const useBrokerAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brokerService.getAccounts();
      setAccounts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const testAccount = async (accountId) => {
    try {
      return await brokerService.testAccount(accountId);
    } catch (e) {
      throw e;
    }
  };

  return { accounts, loading, error, refetch: load, testAccount };
};

export const useBrokerList = () => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [platformServerIp, setPlatformServerIp] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brokerService.getBrokers();
      const brokerItems = Array.isArray(data?.brokers) ? data.brokers : (Array.isArray(data) ? data : []);
      setBrokers(
        brokerItems.map((broker) => ({
          ...broker,
          platformServerIp: broker?.platformServerIp || data?.platformServerIp || '',
        }))
      );
      if (data?.platformServerIp) {
        setPlatformServerIp(data.platformServerIp);
      }
    } catch (_) {
      // no-op
    } finally {
      setLoading(false);
    }
  }, []);

  return { brokers, loading, load, platformServerIp };
};

export const useBrokerDashboard = (accountId) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await brokerService.getDashboard(accountId);
      setDashboard(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  return { dashboard, loading, error, refetch: load };
};
