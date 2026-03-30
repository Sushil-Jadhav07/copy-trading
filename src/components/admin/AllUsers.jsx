import React, { useEffect, useMemo, useState } from 'react';
import { Eye, LoaderCircle, Search, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SlideOver from '@/components/shared/SlideOver';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const RoleBadge = ({ role }) => (
  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
    role === 'Master'
      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
      : role === 'Admin'
      ? 'border-amber-500/30 bg-amber-500/15 text-amber-400'
      : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-400'
  }`}>
    {role}
  </span>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status || '').toUpperCase();
  const isActive = normalized === 'ACTIVE';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
      isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {isActive ? 'Active' : normalized || 'Unknown'}
    </span>
  );
};

const initialCreateForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'Master',
  assignedMasterId: '',
};

const formatBrokerCount = (user) => (Array.isArray(user?.brokerAccounts) ? user.brokerAccounts.length : 0);

const routeConfig = {
  all: {
    title: 'User Management',
    subtitle: 'Live admin controls for Master and Child accounts',
    defaultRoleFilter: 'All',
  },
  masters: {
    title: 'Master Accounts',
    subtitle: 'Live admin controls for master accounts only',
    defaultRoleFilter: 'Master',
  },
  children: {
    title: 'Child Accounts',
    subtitle: 'Live admin controls for child accounts only',
    defaultRoleFilter: 'Child',
  },
};

const AllUsers = ({ scope = 'all' }) => {
  const { addToast } = useToast();
  const viewConfig = routeConfig[scope] || routeConfig.all;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(viewConfig.defaultRoleFilter);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createErrors, setCreateErrors] = useState({});

  useEffect(() => {
    setRoleFilter(viewConfig.defaultRoleFilter);
  }, [viewConfig.defaultRoleFilter]);

  const loadUsers = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const params = {};

      if (roleFilter !== 'All') {
        params.role = roleFilter.toUpperCase();
      }

      if (statusFilter !== 'All') {
        params.status = statusFilter.toUpperCase();
      }

      const response = await adminService.getUsers(params);
      setUsers(response.users);
    } catch (error) {
      addToast(error.message || 'Unable to load users', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, [roleFilter, statusFilter]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.toLowerCase().includes(query),
    );
  }, [searchQuery, users]);

  const masterOptions = useMemo(
    () => users.filter((user) => user.role === 'Master' && user.status === 'ACTIVE'),
    [users],
  );

  const stats = useMemo(
    () => [
      { label: 'Total Users', value: users.length, color: 'text-foreground' },
      { label: 'Masters', value: users.filter((user) => user.role === 'Master').length, color: 'text-emerald-400' },
      { label: 'Children', value: users.filter((user) => user.role === 'Child').length, color: 'text-cyan-400' },
      { label: 'Active', value: users.filter((user) => user.status === 'ACTIVE').length, color: 'text-green-400' },
    ],
    [users],
  );

  const validateCreate = () => {
    const nextErrors = {};

    if (!createForm.name.trim()) nextErrors.name = 'Required';
    if (!createForm.email.includes('@')) nextErrors.email = 'Invalid email';
    if (createForm.password.length < 6) nextErrors.password = 'Min 6 characters';
    if (createForm.phone && !/^[6-9]\d{9}$/.test(createForm.phone)) nextErrors.phone = 'Invalid mobile';
    if (createForm.role === 'Child' && !createForm.assignedMasterId) nextErrors.assignedMasterId = 'Select a master';

    setCreateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenUser = async (user) => {
    setSelectedUser(user);
    setSlideOverOpen(true);

    try {
      const latestUser = await adminService.getUser(user.userId);
      setSelectedUser(latestUser);
    } catch (error) {
      addToast(error.message || 'Unable to load user details', 'error');
    }
  };

  const handleSuspendToggle = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      if (selectedUser.status === 'ACTIVE') {
        await adminService.deactivateUser(selectedUser.userId);
        addToast(`${selectedUser.name} deactivated`, 'success');
      } else {
        await adminService.activateUser(selectedUser.userId);
        addToast(`${selectedUser.name} activated`, 'success');
      }

      await loadUsers(false);
      const latestUser = await adminService.getUser(selectedUser.userId);
      setSelectedUser(latestUser);
      setSuspendModal(false);
    } catch (error) {
      addToast(error.message || 'Unable to update user status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      await adminService.deleteUser(selectedUser.userId);
      addToast('User deleted', 'success');
      setDeleteModal(false);
      setSlideOverOpen(false);
      setSelectedUser(null);
      await loadUsers(false);
    } catch (error) {
      addToast(error.message || 'Unable to delete user', 'error');
    }
  };

  const handleCreate = async () => {
    if (!validateCreate()) {
      return;
    }

    setSubmittingCreate(true);

    try {
      if (createForm.role === 'Master') {
        await adminService.createMaster({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          phone: createForm.phone,
        });
      } else {
        await adminService.createChild({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          phone: createForm.phone,
          assignedMasterId: createForm.assignedMasterId,
        });
      }

      addToast(`${createForm.role} account created successfully`, 'success');
      setCreateModal(false);
      setCreateForm(initialCreateForm);
      setCreateErrors({});
      await loadUsers(false);
    } catch (error) {
      addToast(error.message || 'Unable to create account', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{viewConfig.title}</h1>
          <p className="text-muted-foreground">{viewConfig.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers(false)}
            className="rounded-lg border border-white/10 bg-black/5 px-4 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-opacity hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full rounded-lg border border-border bg-black/5 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500 dark:bg-white/5"
          />
        </div>
        {scope === 'all' ? (
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:bg-white/5"
          >
            <option value="All">All Roles</option>
            <option value="Master">Master</option>
            <option value="Child">Child</option>
            <option value="Admin">Admin</option>
          </select>
        ) : (
          <div className="flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400">
            Showing: {viewConfig.defaultRoleFilter}
          </div>
        )}
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:bg-white/5"
        >
          <option value="All">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'User', 'Role', 'Status', 'Phone', 'Broker Accounts', 'Joined', 'Actions'].map((header) => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16">
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.userId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border/30 transition-colors hover:bg-white/3"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
                          <span className="text-xs font-bold text-white">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{user.phone || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatBrokerCount(user)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{user.joinedDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenUser(user)}
                          title="View"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setSuspendModal(true);
                          }}
                          title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                            user.status === 'ACTIVE'
                              ? 'bg-amber-500/15 hover:bg-amber-500/25'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? (
                            <UserX className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteModal(true);
                          }}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 transition-colors hover:bg-red-500/25"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <SlideOver isOpen={slideOverOpen} onClose={() => setSlideOverOpen(false)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
                <span className="text-2xl font-bold text-white">{selectedUser.name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <div className="mt-1 flex gap-2">
                  <RoleBadge role={selectedUser.role} />
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['User ID', selectedUser.userId],
                ['Role', selectedUser.role],
                ['Status', selectedUser.status],
                ['Phone', selectedUser.phone || 'N/A'],
                ['Joined', selectedUser.joinedDate],
                ['Broker Accounts', formatBrokerCount(selectedUser)],
                ['Two-Factor', selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'],
                ['Email', selectedUser.email],
              ].map(([key, value]) => (
                <div key={key} className="rounded-lg bg-black/5 p-3 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="mt-0.5 break-all text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOver>

      <Modal
        isOpen={createModal}
        onClose={() => {
          setCreateModal(false);
          setCreateErrors({});
          setCreateForm(initialCreateForm);
        }}
        title="Create Account"
        size="md"
      >
        <div className="space-y-4">
          <div className="mb-2 flex gap-2">
            {['Master', 'Child'].map((role) => (
              <button
                key={role}
                onClick={() => setCreateForm((current) => ({ ...current, role, assignedMasterId: '' }))}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  createForm.role === role
                    ? 'bg-emerald-500 text-white'
                    : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {[
            { key: 'name', label: 'Full Name', placeholder: 'Enter full name', type: 'text' },
            { key: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email' },
            { key: 'phone', label: 'Mobile No.', placeholder: '10-digit mobile', type: 'text' },
            { key: 'password', label: 'Password', placeholder: 'Min 6 characters', type: 'password' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs text-muted-foreground">{label}{key !== 'phone' ? ' *' : ''}</label>
              <input
                type={type}
                value={createForm[key]}
                onChange={(event) => setCreateForm((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-black/5 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500 dark:bg-white/5"
              />
              {createErrors[key] && <p className="mt-1 text-xs text-red-400">{createErrors[key]}</p>}
            </div>
          ))}

          {createForm.role === 'Child' && (
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Assign Master *</label>
              <select
                value={createForm.assignedMasterId}
                onChange={(event) => setCreateForm((current) => ({ ...current, assignedMasterId: event.target.value }))}
                className="w-full rounded-lg border border-border bg-black/5 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:bg-white/5"
              >
                <option value="">Select master</option>
                {masterOptions.map((master) => (
                  <option key={master.userId} value={master.userId}>
                    {master.name} ({master.email})
                  </option>
                ))}
              </select>
              {createErrors.assignedMasterId && <p className="mt-1 text-xs text-red-400">{createErrors.assignedMasterId}</p>}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setCreateModal(false);
                setCreateErrors({});
                setCreateForm(initialCreateForm);
              }}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submittingCreate}
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingCreate ? 'Creating...' : `Create ${createForm.role}`}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={suspendModal}
        onClose={() => setSuspendModal(false)}
        title={selectedUser?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selectedUser?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}{' '}
            <span className="font-semibold text-foreground">{selectedUser?.name}</span>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSuspendModal(false)}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSuspendToggle}
              className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${
                selectedUser?.status === 'ACTIVE' ? 'bg-amber-500 hover:bg-amber-500/90' : 'bg-emerald-500 hover:bg-emerald-500/90'
              }`}
            >
              {selectedUser?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete <span className="font-semibold text-foreground">{selectedUser?.name}</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteModal(false)}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-500/90">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllUsers;
