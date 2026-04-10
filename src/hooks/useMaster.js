import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { masterService } from '@/lib/master';
import { useAuth } from '@/context/AuthContext';

export const useMasterChildren = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChildren(await masterService.getChildren());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { children, loading, error, refetch: load, setChildren };
};

export const useMasterSubscriptions = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterId = user?.userId || user?.id;
      if (!masterId) {
        setSubscriptions([]);
        return;
      }
      setSubscriptions(await masterService.getSubscriptionsByMaster(masterId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { subscriptions, loading, error, refetch: load };
};

export const useMasterPendingChildren = () => {
  const [pendingChildren, setPendingChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPendingChildren(await masterService.getPendingChildren());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { pendingChildren, setPendingChildren, loading, error, refetch: load };
};

export const useMasterAnalytics = () => {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalytics(await masterService.getAnalytics());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { analytics, loading, error, refetch: load };
};

export const useMasterTradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrades(await masterService.getTradeHistory());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { trades, loading, error, refetch: load };
};

export const usePendingFollowCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/v1/master/children/pending');
        const data = res.data?.data || res.data || [];
        setCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // silently fail — don't break the sidebar
      }
    };

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  return count;
};
