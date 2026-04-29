import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, UserPlus, RefreshCw, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { masterService } from '@/lib/master';

const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Something went wrong';

const FollowRequests = () => {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const list = await masterService.getPendingChildren();
      setRequests(list.map((r) => ({
        id: r.childId || r.id || r.userId || r._id,
        name: r.childName || r.name || r.fullName || r.username || 'Unknown User',
        email: r.email || r.childEmail || '',
        phone: r.phone || r.childPhone || '',
        proposedAllocation: r.allocationAmount || r.allocation || r.proposedAllocation || 0,
        multiplier: r.multiplier || r.scalingFactor || 1,
        requestedDate: r.requestedAt || r.createdAt || r.linkedAt || '',
        raw: r,
      })));
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const handleAction = async (id, action) => {
    setActionLoading((p) => ({ ...p, [id]: action }));
    try {
      if (action === 'approve') {
        await masterService.approveChild(id);
      } else {
        // FIX: was trying masterService.declineChild() first (POST /master/children/{id}/decline)
        // that endpoint does NOT exist in spec — always 404'd before the rejectChild fallback.
        // Spec 3.6: POST /master/children/{childId}/reject — use directly.
        await masterService.rejectChild(id);
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      addToast(
        action === 'approve' ? 'Subscription approved successfully' : 'Request declined',
        action === 'approve' ? 'success' : 'info'
      );
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  const formatDate = (raw) => {
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return raw;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Follow Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : `${requests.length} pending request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={loadPending} disabled={loading}
          className="w-full sm:w-9 h-9 rounded-lg flex items-center justify-center bg-brand-purple/80 hover:bg-brand-purple transition-colors disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          <span className="sm:hidden ml-2">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <GlassCard key={i}>
              <SkeletonLoader type="card" />
            </GlassCard>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <GlassCard>
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No pending requests</p>
            <p className="text-muted-foreground text-sm mt-1">New subscription requests from traders will appear here.</p>
          </div>
        </GlassCard>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request, idx) => {
              const isApproving = actionLoading[request.id] === 'approve';
              const isDeclining = actionLoading[request.id] === 'decline';
              const isAnyLoading = !!actionLoading[request.id];

              return (
                <motion.div key={request.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}>
                  <GlassCard hover={false}>
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
                        {request.name.trim().split(' ').map(n => n[0] || '').slice(0, 2).join('').toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{request.name}</h3>
                        {request.email && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{request.email}</p>
                        )}
                        {request.phone && (
                          <p className="text-xs text-muted-foreground truncate">{request.phone}</p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Clock className="w-3 h-3" />Pending
                      </span>
                    </div>

                    {/* Details */}
                    <div className="rounded-xl p-3 space-y-2 mb-4"
                      style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}
                      data-dark-style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)">
                      {request.requestedDate && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Requested on</span>
                          <span className="font-medium text-foreground">{formatDate(request.requestedDate)}</span>
                        </div>
                      )}
                      {request.proposedAllocation > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Proposed allocation</span>
                          <span className="font-semibold text-foreground">{formatCurrency(request.proposedAllocation)}</span>
                        </div>
                      )}
                      {request.multiplier !== 1 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Multiplier</span>
                          <span className="font-medium text-foreground">{request.multiplier}×</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={isAnyLoading}
                        className="flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                        {isApproving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(request.id, 'decline')}
                        disabled={isAnyLoading}
                        className="flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: '#EF4444' }}>
                        {isDeclining ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        Decline
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default FollowRequests;