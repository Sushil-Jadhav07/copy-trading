import React, { useState } from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const FollowRequests = () => {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);

  const handleAccept = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    addToast('Follow request accepted', 'success');
  };

  const handleDecline = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    addToast('Follow request declined', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow Requests</h1>
          <p className="text-muted-foreground">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pending follow requests</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <GlassCard key={request.id} hover={false}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-foreground">
                    {request.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{request.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {request.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested on {request.requestedDate}
                  </p>
                  <div className="mt-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Proposed Allocation
                    </p>
                    <p className="font-medium">
                      {formatCurrency(request.proposedAllocation)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAccept(request.id)}
                  className="flex-1 py-2 bg-success/20 text-success rounded-lg text-sm font-medium hover:bg-success/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(request.id)}
                  className="flex-1 py-2 bg-danger/20 text-danger rounded-lg text-sm font-medium hover:bg-danger/30 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowRequests;
