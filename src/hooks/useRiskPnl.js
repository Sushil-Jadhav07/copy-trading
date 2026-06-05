import { useCallback, useState } from 'react';
import { riskService } from '@/lib/risk';
import { pnlService } from '@/lib/pnl';

const makeStatus = () => ({ loading: false, error: null });

export const useRiskPnl = () => {
  const [riskRules, setRiskRules] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [pnlSummary, setPnlSummary] = useState([]);
  const [status, setStatus] = useState({
    fetchRiskRules: makeStatus(),
    fetchExposure: makeStatus(),
    checkMargin: makeStatus(),
    fetchPnlSummary: makeStatus(),
    fetchRealizedPnl: makeStatus(),
    fetchUnrealizedPnl: makeStatus(),
    fetchChildVsMaster: makeStatus(),
  });

  const setOp = useCallback((key, patch) => {
    setStatus((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const fetchRiskRules = useCallback(async () => {
    setOp('fetchRiskRules', { loading: true, error: null });
    try {
      const data = await riskService.getRules();
      setRiskRules(data);
      return data;
    } catch (error) {
      setOp('fetchRiskRules', { error: error.message || 'Failed to load risk rules' });
      return null;
    } finally {
      setOp('fetchRiskRules', { loading: false });
    }
  }, [setOp]);

  const fetchExposure = useCallback(async () => {
    setOp('fetchExposure', { loading: true, error: null });
    try {
      const data = await riskService.getExposure();
      setExposure(data);
      return data;
    } catch (error) {
      setOp('fetchExposure', { error: error.message || 'Failed to load exposure' });
      return null;
    } finally {
      setOp('fetchExposure', { loading: false });
    }
  }, [setOp]);

  const checkMargin = useCallback(async (params) => {
    setOp('checkMargin', { loading: true, error: null });
    try {
      return await riskService.checkMargin(params);
    } catch (error) {
      setOp('checkMargin', { error: error.message || 'Margin check failed' });
      throw error;
    } finally {
      setOp('checkMargin', { loading: false });
    }
  }, [setOp]);

  const fetchPnlSummary = useCallback(async (period = 'DAILY') => {
    setOp('fetchPnlSummary', { loading: true, error: null });
    try {
      const data = await pnlService.getSummary(period);
      setPnlSummary(data);
      return data;
    } catch (error) {
      setOp('fetchPnlSummary', { error: error.message || 'Failed to load P&L summary' });
      return [];
    } finally {
      setOp('fetchPnlSummary', { loading: false });
    }
  }, [setOp]);

  const fetchRealizedPnl = useCallback(async (params) => {
    setOp('fetchRealizedPnl', { loading: true, error: null });
    try {
      return await pnlService.getRealizedPnl(params);
    } catch (error) {
      setOp('fetchRealizedPnl', { error: error.message || 'Failed to load realized P&L' });
      throw error;
    } finally {
      setOp('fetchRealizedPnl', { loading: false });
    }
  }, [setOp]);

  const fetchUnrealizedPnl = useCallback(async (brokerAccountId) => {
    setOp('fetchUnrealizedPnl', { loading: true, error: null });
    try {
      return await pnlService.getUnrealizedPnl(brokerAccountId);
    } catch (error) {
      setOp('fetchUnrealizedPnl', { error: error.message || 'Failed to load unrealized P&L' });
      throw error;
    } finally {
      setOp('fetchUnrealizedPnl', { loading: false });
    }
  }, [setOp]);

  const fetchChildVsMaster = useCallback(async (masterId) => {
    setOp('fetchChildVsMaster', { loading: true, error: null });
    try {
      return await pnlService.getChildVsMaster(masterId);
    } catch (error) {
      setOp('fetchChildVsMaster', { error: error.message || 'Failed to load child vs master comparison' });
      throw error;
    } finally {
      setOp('fetchChildVsMaster', { loading: false });
    }
  }, [setOp]);

  const loading = Object.values(status).some((item) => item.loading);

  return {
    loading,
    status,
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
