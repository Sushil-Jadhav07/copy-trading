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

  return { accounts, loading, error, refetch: load };
};

export const useBrokerList = () => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brokerService.getBrokers();
      setBrokers(data);
    } catch (_) {
      // no-op
    } finally {
      setLoading(false);
    }
  }, []);

  return { brokers, loading, load };
};
