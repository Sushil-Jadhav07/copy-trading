import { useCallback, useState } from 'react';
import { riskService } from '@/lib/risk';
import { pnlService } from '@/lib/pnl';

export const useRiskPnl = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riskRules, setRiskRules] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [pnlSummary, setPnlSummary] = useState([]);

  const fetchRiskRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await riskService.getRules();
      setRiskRules(data);
      return data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExposure = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await riskService.getExposure();
      setExposure(data);
      return data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMargin = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      return await riskService.checkMargin(params);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPnlSummary = useCallback(async (period = 'DAILY') => {
    setLoading(true);
    setError(null);
    try {
      const data = await pnlService.getSummary(period);
      setPnlSummary(data);
      return data;
    } catch (error) {
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRealizedPnl = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      return await pnlService.getRealizedPnl(params);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnrealizedPnl = useCallback(async (brokerAccountId) => {
    setLoading(true);
    setError(null);
    try {
      return await pnlService.getUnrealizedPnl(brokerAccountId);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChildVsMaster = useCallback(async (masterId) => {
    setLoading(true);
    setError(null);
    try {
      return await pnlService.getChildVsMaster(masterId);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    riskRules,
    exposure,
    pnlSummary,
    fetchRiskRules,
    fetchExposure,
    checkMargin,
    fetchPnlSummary,
    fetchRealizedPnl,
    fetchUnrealizedPnl,
    fetchChildVsMaster,
  };
};
