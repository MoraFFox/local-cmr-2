import React, { useState, useEffect } from 'react';
import {
  Invite,
  getAllInvites,
  createInvite,
  revokeInvite,
  deleteInvite,
  getInviteLink
} from '../utils/inviteManager';
import {
  UserPlusIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon as DeleteIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const TechnicianInvitations: React.FC = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = () => {
    setInvites(getAllInvites());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newInvite = createInvite({
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined
    });

    setFormData({ name: '', email: '', phone: '' });
    setShowForm(false);
    loadInvites();
  };

  const handleCopyLink = (invite: Invite) => {
    const link = getInviteLink(invite.token);
    navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = (inviteId: string) => {
    if (window.confirm('Revoke this invitation? The technician will no longer be able to use this link.')) {
      revokeInvite(inviteId);
      loadInvites();
    }
  };

  const handleDelete = (inviteId: string) => {
    if (window.confirm('Delete this invitation permanently?')) {
      deleteInvite(inviteId);
      loadInvites();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <ClockIcon className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            Accepted
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemaining = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expired';
    return `${days} day${days !== 1 ? 's' : ''} left`;
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const acceptedInvites = invites.filter(i => i.status === 'accepted');
  const expiredInvites = invites.filter(i => i.status === 'expired');

  return (
    <div className="w-full max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
            Technician Invitations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 sm:mt-2">
            Manage technician invitations and invite links.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-teal-600 text-white font-bold py-2 px-4 sm:px-6 rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base transform active:scale-95 flex items-center gap-2"
        >
          {showForm ? (
            <>
              <XMarkIcon className="w-5 h-5" />
              Cancel
            </>
          ) : (
            <>
              <UserPlusIcon className="w-5 h-5" />
              New Invitation
            </>
          )}
        </button>
      </header>

      {/* Create Invitation Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 animate-item-fade-in-down">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Send New Invitation
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tech-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Technician Name <span className="text-red-500">*</span>
              </label>
              <input
                id="tech-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-2.5 px-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                placeholder="e.g., Ahmed Mohamed"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tech-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  id="tech-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-2.5 px-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  placeholder="e.g., ahmed@example.com"
                />
              </div>
              <div>
                <label htmlFor="tech-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone (Optional)
                </label>
                <input
                  id="tech-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-2.5 px-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  placeholder="e.g., 0100-123-4567"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              At least one of Email or Phone is required for the technician to sign up.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', email: '', phone: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Create Invitation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingInvites.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Pending</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{acceptedInvites.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Accepted</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{expiredInvites.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Expired</div>
        </div>
      </div>

      {/* Invites List */}
      {invites.length === 0 ? (
        <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
          <UserPlusIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
            No invitations yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Create an invitation to send to your technicians.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
                Pending Invitations
              </h3>
              {pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                        <UserPlusIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 dark:text-white">{invite.name}</h4>
                          {getStatusBadge(invite.status)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {invite.email && <span className="mr-3">{invite.email}</span>}
                          {invite.phone && <span>{invite.phone}</span>}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Expires in {getDaysRemaining(invite.expiresAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleCopyLink(invite)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                      >
                        {copiedId === invite.id ? (
                          <>
                            <EyeIcon className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRevoke(invite.id)}
                        className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="Revoke invitation"
                      >
                        <ClockIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete invitation"
                      >
                        <DeleteIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Accepted Invites */}
          {acceptedInvites.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
                Accepted Invitations
              </h3>
              {acceptedInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 opacity-75"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <EyeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 dark:text-white">{invite.name}</h4>
                          {getStatusBadge(invite.status)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {invite.email && <span className="mr-3">{invite.email}</span>}
                          {invite.phone && <span>{invite.phone}</span>}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Accepted {invite.acceptedAt ? formatDate(invite.acceptedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete invitation"
                      >
                        <DeleteIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Expired Invites */}
          {expiredInvites.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
                Expired Invitations
              </h3>
              {expiredInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 opacity-60"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <ClockIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-600 dark:text-slate-300">{invite.name}</h4>
                          {getStatusBadge(invite.status)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {invite.email && <span className="mr-3">{invite.email}</span>}
                          {invite.phone && <span>{invite.phone}</span>}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Expired {formatDate(invite.expiresAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete invitation"
                      >
                        <DeleteIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TechnicianInvitations;
