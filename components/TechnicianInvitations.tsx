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
import { ConfirmDialog } from './ui/ConfirmDialog';

const TechnicianInvitations: React.FC = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'revoke' | 'delete'; inviteId: string } | null>(null);

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
    setConfirmAction({ type: 'revoke', inviteId });
  };

  const handleDelete = (inviteId: string) => {
    setConfirmAction({ type: 'delete', inviteId });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'revoke') {
      revokeInvite(confirmAction.inviteId);
    } else {
      deleteInvite(confirmAction.inviteId);
    }
    loadInvites();
    setConfirmAction(null);
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
          <span className="inline-flex items-center rounded-full bg-leaf-50 dark:bg-leaf-500/20 px-2.5 py-0.5 text-xs font-medium text-leaf-600 dark:text-leaf-500">
            Accepted
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center rounded-full bg-paper dark:bg-espresso-light px-2.5 py-0.5 text-xs font-medium text-primary dark:text-latte/70">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-primary dark:text-white">
            Technician Invitations
          </h1>
          <p className="text-primary dark:text-latte/70 mt-1 sm:mt-2">
            Manage technician invitations and invite links.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary font-bold py-2 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base flex items-center gap-2"
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
        <div className="bg-cream dark:bg-espresso-light rounded-xl shadow-sm border border-hairline p-6 mb-6 animate-item-fade-in-down">
          <h2 className="text-lg font-semibold text-primary dark:text-white mb-4">
            Send New Invitation
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tech-name" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                Technician Name <span className="text-ember-500">*</span>
              </label>
              <input
                id="tech-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-lg border-hairline dark:border-hairline bg-cream dark:bg-espresso py-2.5 px-3 text-primary dark:text-white placeholder:text-latte focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="e.g., Ahmed Mohamed"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tech-email" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  Email (Optional)
                </label>
                <input
                  id="tech-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-lg border-hairline dark:border-hairline bg-cream dark:bg-espresso py-2.5 px-3 text-primary dark:text-white placeholder:text-latte focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="e.g., ahmed@example.com"
                />
              </div>
              <div>
                <label htmlFor="tech-phone" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  Phone (Optional)
                </label>
                <input
                  id="tech-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full rounded-lg border-hairline dark:border-hairline bg-cream dark:bg-espresso py-2.5 px-3 text-primary dark:text-white placeholder:text-latte focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="e.g., 0100-123-4567"
                />
              </div>
            </div>

            <p className="text-xs text-latte dark:text-latte/70">
              At least one of Email or Phone is required for the technician to sign up.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', email: '', phone: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-primary dark:text-latte/70 bg-cream dark:bg-espresso-light rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              >
                Create Invitation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-cream dark:bg-espresso-light rounded-lg p-4 border border-hairline">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingInvites.length}</div>
          <div className="text-sm text-primary dark:text-latte/70">Pending</div>
        </div>
        <div className="bg-cream dark:bg-espresso-light rounded-lg p-4 border border-hairline">
          <div className="text-2xl font-bold text-leaf-600 dark:text-leaf-500">{acceptedInvites.length}</div>
          <div className="text-sm text-primary dark:text-latte/70">Accepted</div>
        </div>
        <div className="bg-cream dark:bg-espresso-light rounded-lg p-4 border border-hairline">
          <div className="text-2xl font-bold text-primary dark:text-latte/70">{expiredInvites.length}</div>
          <div className="text-sm text-primary dark:text-latte/70">Expired</div>
        </div>
      </div>

      {/* Invites List */}
      {invites.length === 0 ? (
        <div className="text-center bg-cream/80 dark:bg-espresso-light/80 backdrop-blur-sm p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
          <UserPlusIcon className="mx-auto h-12 w-12 text-latte" />
          <h2 className="mt-4 text-lg font-semibold text-primary dark:text-latte/70">
            No invitations yet
          </h2>
          <p className="text-latte dark:text-latte/70 mt-2">
            Create an invitation to send to your technicians.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-primary dark:text-latte/70 mt-6 mb-3">
                Pending Invitations
              </h3>
              {pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-cream dark:bg-espresso-light rounded-lg shadow-sm border border-hairline p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-cream-2 dark:bg-primary/20 flex items-center justify-center">
                        <UserPlusIcon className="h-5 w-5 text-primary dark:text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-primary dark:text-white">{invite.name}</h4>
                          {getStatusBadge(invite.status)}
                        </div>
                        <div className="text-sm text-latte dark:text-latte/70 mt-1">
                          {invite.email && <span className="mr-3">{invite.email}</span>}
                          {invite.phone && <span>{invite.phone}</span>}
                        </div>
                        <div className="text-xs text-latte dark:text-latte/70 mt-1">
                          Expires in {getDaysRemaining(invite.expiresAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleCopyLink(invite)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary dark:text-primary bg-cream-2 dark:bg-primary/10 rounded-lg hover:bg-paper dark:hover:bg-primary/20 transition-colors"
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
                        className="p-2 text-latte hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="Revoke invitation"
                      >
                        <ClockIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 text-latte hover:text-ember-700 dark:hover:text-ember-300 hover:bg-ember-50 dark:hover:bg-ember-500/10 rounded-lg transition-colors"
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
              <h3 className="text-lg font-semibold text-primary dark:text-latte/70 mt-6 mb-3">
                Accepted Invitations
              </h3>
              {acceptedInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-cream dark:bg-espresso-light rounded-lg shadow-sm border border-hairline p-4 opacity-75"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-leaf-50 dark:bg-leaf-500/20 flex items-center justify-center">
                        <EyeIcon className="h-5 w-5 text-leaf-600 dark:text-leaf-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-primary dark:text-white">{invite.name}</h4>
                          {getStatusBadge(invite.status)}
                        </div>
                        <div className="text-sm text-latte dark:text-latte/70 mt-1">
                          {invite.email && <span className="mr-3">{invite.email}</span>}
                          {invite.phone && <span>{invite.phone}</span>}
                        </div>
                        <div className="text-xs text-latte dark:text-latte/70 mt-1">
                          Accepted {invite.acceptedAt ? formatDate(invite.acceptedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 text-latte hover:text-ember-700 dark:hover:text-ember-300 hover:bg-ember-50 dark:hover:bg-ember-500/10 rounded-lg transition-colors"
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
              <h3 className="text-lg font-semibold text-primary dark:text-latte/70 mt-6 mb-3">
                Expired Invitations
              </h3>
              {expiredInvites.map(invite => (
                <div
                  key={invite.id}
                  className="bg-cream dark:bg-espresso-light rounded-lg shadow-sm border border-hairline p-4 opacity-60"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-cream-2 dark:bg-espresso-light flex items-center justify-center">
                        <ClockIcon className="h-5 w-5 text-latte" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-primary dark:text-latte/70">{invite.name}</h4>
                          {getStatusBadge(invite.status)}
                        </div>
                        <div className="text-sm text-latte dark:text-latte/70 mt-1">
                          {invite.email && <span className="mr-3">{invite.email}</span>}
                          {invite.phone && <span>{invite.phone}</span>}
                        </div>
                        <div className="text-xs text-latte dark:text-latte/70 mt-1">
                          Expired {formatDate(invite.expiresAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 text-latte hover:text-ember-700 dark:hover:text-ember-300 hover:bg-ember-50 dark:hover:bg-ember-500/10 rounded-lg transition-colors"
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

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'revoke' ? 'إلغاء الدعوة' : 'حذف الدعوة'}
        message={confirmAction?.type === 'revoke'
          ? 'إلغاء هذه الدعوة؟ لن يتمكن الفني من استخدام هذا الرابط بعد الآن.'
          : 'حذف هذه الدعوة بشكل دائم؟'}
        confirmLabel={confirmAction?.type === 'revoke' ? 'نعم، إلغاء' : 'نعم، حذف'}
      />
    </div>
  );
};

export default TechnicianInvitations;
