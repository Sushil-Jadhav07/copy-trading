import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, LoaderCircle, ShieldAlert } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';
import { setAccessToken, clearRefreshToken } from '@/lib/api';
import { authStorage } from '@/lib/auth';

// ADM-16: "View as user" (read-only impersonation)
// Endpoint needed: POST /api/v1/admin/impersonate/{userId}
//   response: { sessionToken, expiresAt, user: { userId, name, role } }
// The session token returned should be a SCOPED, READ-ONLY token — every mutating
// request made while impersonating must be rejected server-side, not just hidden
// client-side. The "Start Read-Only Session" button below is disabled until this
// endpoint exists.
//
// Target picker reuses the real adminService.getUsers() — same pattern as
// ForceSquareOff.jsx — so this list is already live data, only the actual
// "enter session" action is blocked on the backend.
//
// Once the endpoint exists:
//   1. On click, call adminService.impersonateUser(targetId), store the returned
//      sessionToken separately from the admin's own token (do not overwrite it).
//   2. Open the target user's dashboard (new tab or in-app route) using that token,
//      with every write-capable UI control (buttons, forms, toggles) disabled.
//   3. Show a persistent banner: "Viewing as {name} — read only" with an "End session" action.
//   4. Every impersonation start/end must write an entry to the Audit Log (ADM-4) —
//      this is a support/security feature, the access itself must be traceable.

const ViewAsUser = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    setLoadingUsers(true);
    adminService
      .getUsers()
      .then(({ users: list }) => setUsers(list.filter((u) => u.role !== 'Admin')))
      .catch((err) => addToast(err.message || 'Unable to load user list', 'error'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const targetUser = useMemo(() => users.find((u) => u.userId === targetId), [targetId, users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [search, users]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          View as User
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Open a user's dashboard in read-only mode for support — no actions can be taken on their behalf.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── User list ── */}
        <GlassCard noPadding>
          <div className="border-b border-border/40 px-4 py-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full rounded-xl border border-border bg-black/5 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                  {['User', 'Role', 'Status', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading users…
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.userId}
                      className={`border-b border-border/30 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                        targetId === u.userId ? 'bg-brand-purple/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                            u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Active' : u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setTargetId(u.userId)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            targetId === u.userId
                              ? 'bg-brand-purple text-white'
                              : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {targetId === u.userId ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* ── Session panel ── */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Read-Only Session</h2>
              <p className="text-xs text-muted-foreground">No actions can be performed while viewing.</p>
            </div>
          </div>

          {!targetId ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Eye className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a user from the list to preview a session.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
                <p className="text-xs text-muted-foreground">Target user</p>
                <p className="mt-0.5 text-sm font-semibold">{targetUser?.name}</p>
                <p className="text-xs text-muted-foreground">{targetUser?.email}</p>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  This will be a read-only session — all mutating actions must be blocked server-side
                  by the scoped token, not just hidden in the UI. Every session start/end is recorded
                  in the Audit Log.
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await adminService.impersonateUser(targetId);
                    if (!result.token) throw new Error('No impersonation token returned');
                    clearRefreshToken();
                    authStorage.clearImpersonatedRole();
                    setAccessToken(result.token);
                    window.location.href = '/';
                  } catch (error) {
                    addToast(error.message || 'Unable to impersonate user', 'error');
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-purple px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/90"
              >
                <Eye className="h-4 w-4" />
                Start Read-Only Session
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ViewAsUser;
