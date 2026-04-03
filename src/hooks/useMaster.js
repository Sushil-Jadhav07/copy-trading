import { useState, useEffect, useCallback } from 'react';
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
