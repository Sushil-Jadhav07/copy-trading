import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const PendingVerification = () => {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await adminService.getUsers({ status: 'PENDING' });
      setRequests(
        users.map((user) => ({
          id: user.id ?? user.userId,
          name: user.name,
          email: user.email,
          submittedDate: user.joinedDate || 'N/A',
          documents: user.raw?.documents || ['KYC'],
        }))
      );
    } catch (error) {
      addToast(error.message || 'Unable to load pending users', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
  };

  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setActionType(null);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType || submitting) return;

    setSubmitting(true);
    try {
      if (actionType === 'approve') {
        await adminService.activateUser(selectedRequest.id);
      } else {
        await adminService.deactivateUser(selectedRequest.id);
      }

      setRequests((prev) => prev.filter((request) => request.id !== selectedRequest.id));
      addToast(
        `${selectedRequest.name} ${actionType === 'approve' ? 'approved' : 'rejected'}`,
        actionType === 'approve' ? 'success' : 'warning'
      );
      closeModal();
    } catch (error) {
      addToast(error.message || 'Unable to update verification status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: 'Pending Requests', value: requests.length, color: 'text-warning', icon: Clock },
    {
      label: 'Documents Pending',
      value: requests.reduce((sum, request) => sum + request.documents.length, 0),
      color: 'text-brand-blue',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Pending Verification</h1>
          <p className="text-sm text-muted-foreground">Review submitted KYC documents and approve or reject new accounts</p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((request, idx) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard hover={false}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <h2 className="text-lg font-semibold">{request.name}</h2>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500 text-white w-fit">
                        Awaiting Review
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{request.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Submitted on {request.submittedDate}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {request.documents.map((document) => (
                      <span
                        key={document}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-sm text-muted-foreground"
                      >
                        <FileText className="w-4 h-4" />
                        {document}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
                    <button
                      onClick={() => openActionModal(request, 'approve')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success hover:bg-success/90 text-white text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openActionModal(request, 'reject')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-danger/20 hover:bg-danger/30 border border-danger/30 text-danger text-sm font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        ) : (
          <GlassCard hover={false}>
            <div className="py-8 text-center">
              <p className="text-lg font-semibold">No pending verification requests</p>
              <p className="text-sm text-muted-foreground mt-1">All submitted KYC requests have been reviewed.</p>
            </div>
          </GlassCard>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedRequest && actionType)}
        onClose={closeModal}
        title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {actionType === 'approve' ? 'Approve' : 'Reject'}{' '}
            <span className="font-semibold text-foreground">{selectedRequest?.name}</span>?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={closeModal}
              disabled={submitting}
              className="flex-1 py-2 bg-black/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={submitting}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                actionType === 'approve'
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-danger hover:bg-danger/90 text-white'
              } disabled:opacity-60`}
            >
              {submitting ? 'Saving...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PendingVerification;
