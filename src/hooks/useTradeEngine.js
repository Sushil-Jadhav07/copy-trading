import { useCallback, useState } from 'react';
import { tradeService } from '@/lib/trades';
import { engineService } from '@/lib/engine';

export const useTradeEngine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trades, setTrades] = useState([]);
  const [engineStatus, setEngineStatus] = useState(null);

  const executeTrade = useCallback(async (body) => {
    setLoading(true);
    setError(null);
    try {
      return await tradeService.executeTrade(body);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrades = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tradeService.listTrades(params);
      setTrades(data);
      return data;
    } catch (error) {
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelTrade = useCallback(async (tradeId) => {
    setLoading(true);
    setError(null);
    try {
      return await tradeService.cancelTrade(tradeId);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEngineStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await engineService.getStatus();
      setEngineStatus(data);
      return data;
    } catch (error) {
      setError(error.message);
      return null;
    }
  }, []);

  const manualCopyTrade = useCallback(async (body) => {
    setLoading(true);
    setError(null);
    try {
      return await engineService.manualCopyTrade(body);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePolling = useCallback(async (enabled) => {
    setError(null);
    try {
      return await engineService.togglePolling(enabled);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  return {
    loading,
    error,
    trades,
    engineStatus,
    executeTrade,
    fetchTrades,
    cancelTrade,
    fetchEngineStatus,
    manualCopyTrade,
    togglePolling,
  };
};
