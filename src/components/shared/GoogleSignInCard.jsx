import { memo } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const ROLE_OPTIONS = [
  {
    value: 'CHILD',
    label: 'Copy Trades',
    description: 'Join as a follower.',
  },
  {
    value: 'MASTER',
    label: 'Be a Master',
    description: 'Join as a signal provider.',
  },
];

const GoogleSignInCard = ({
  role = 'CHILD',
  onRoleChange,
  onSuccess,
  onError,
  disabled = false,
}) => (
  <div className="">
    <div className={`flex justify-center ${disabled ? 'pointer-events-none opacity-70' : ''}`}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        text="continue_with"
        shape="pill"
        theme="outline"
        size="large"
        width={400}
      />
    </div>

    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-200">First-time Google sign-in role</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Existing users keep their current role. New users join as{' '}
            <span className="text-emerald-300">{role === 'MASTER' ? 'Master' : 'Copy Trades'}</span>.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-transparent p-1">
          {ROLE_OPTIONS.map((option) => {
            const active = role === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRoleChange?.(option.value)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-emerald-400 text-white'
                    : 'text-slate-300 hover:bg-white/[0.05]'
                }`}
              >
                {option.value === 'CHILD' ? 'Copy' : 'Master'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

export default memo(GoogleSignInCard);
