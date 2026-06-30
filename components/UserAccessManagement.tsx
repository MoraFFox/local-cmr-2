import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastContext';
import { logger } from '../utils/logger';
import {
  UserPlusIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import type { InvitationRecord, AdminUserInfo, InviteRole, InvitationStatus, LegacyMatchBucket, LegacyManualAssignResponse, LegacyTransferResponse, LegacyRecordRef } from '../types';

// Bilingual translations
const translations = {
  en: {
    title: 'User Access Management',
    invitationsTab: 'Invitations',
    usersTab: 'Users',
    createInvitation: 'Create Invitation',
    role: 'Role',
    admin: 'Admin',
    technician: 'Technician',
    contactType: 'Contact Type',
    email: 'Email',
    phone: 'Phone',
    contact: 'Contact',
    nameOptional: 'Name (Optional)',
    expiresIn: 'Expires In',
    hours24: '24 hours',
    hours48: '48 hours',
    days7: '7 days',
    createButton: 'Create Invitation',
    invitationLink: 'Invitation Link',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    pending: 'Pending',
    accepted: 'Accepted',
    expired: 'Expired',
    revoke: 'Revoke',
    delete: 'Delete',
    noInvitations: 'No invitations found',
    noUsers: 'No users found',
    lastSignIn: 'Last Sign In',
    never: 'Never',
    filterAll: 'All',
    filterPending: 'Pending',
    filterAccepted: 'Accepted',
    filterExpired: 'Expired',
    filterByRole: 'Filter by Role',
    filterByStatus: 'Filter by Status',
    allRoles: 'All Roles',
    allStatuses: 'All Statuses',
    hasTechnicianProfile: 'Has Technician Profile',
    yes: 'Yes',
    no: 'No',
    created: 'Created',
    expires: 'Expires',
    acceptedBy: 'Accepted by',
    revokeConfirm: 'Revoke this invitation? The recipient will no longer be able to use this link.',
    deleteConfirm: 'Delete this invitation permanently?',
    invitationCreated: 'Invitation created successfully',
    invitationRevoked: 'Invitation revoked successfully',
    invitationDeleted: 'Invitation deleted successfully',
    errorCreating: 'Failed to create invitation',
    errorRevoking: 'Failed to revoke invitation',
    errorDeleting: 'Failed to delete invitation',
    errorLoadingInvitations: 'Failed to load invitations',
    errorLoadingUsers: 'Failed to load users',
    cancel: 'Cancel',
    newInvitation: 'New Invitation',
    sendNewInvitation: 'Send New Invitation',
    manageInvitations: 'Manage invitations and invite links.',
    manageUsers: 'View and manage existing users.',
    pendingCount: 'Pending',
    acceptedCount: 'Accepted',
    expiredCount: 'Expired',
    totalUsers: 'Total Users',
    adminUsers: 'Admin Users',
    technicianUsers: 'Technician Users',
    // Legacy Records
    legacyRecordsTab: 'Legacy Records',
    legacyRecords: 'Legacy Records',
    legacyRecordsDesc: 'Manually assign legacy technician records.',
    noLegacyRecords: 'No legacy records found',
    assignAll: 'Assign All',
    reviewRecords: 'Review Records',
    backToBuckets: 'Back to Buckets',
    assignSelected: 'Assign Selected',
    selectTechnician: 'Select Technician',
    rewriteDisplayName: 'Rewrite display name',
    rewriteDesc: 'Update barista name to match technician name',
    assign: 'Assign',
    transferRecords: 'Transfer Records',
    sourceTechnician: 'Source Technician',
    targetTechnician: 'Target Technician',
    transferAllRecords: 'Transfer All Records',
    highConfidence: 'High',
    lowConfidence: 'Low',
    records: 'records',
    recordCount: 'Record Count',
    suggestedTechnician: 'Suggested Technician',
    confidence: 'Confidence',
    date: 'Date',
    company: 'Company',
    baristaName: 'Barista Name',
    source: 'Source',
    submissionSource: 'Submission',
    companyMainSource: 'Company Main',
    companyBranchSource: 'Company Branch',
    noTechnicians: 'No technicians available',
    errorLoadingLegacy: 'Failed to load legacy records',
    errorLoadingTechnicians: 'Failed to load technicians',
    errorAssigning: 'Failed to assign records',
    errorTransferring: 'Failed to transfer records',
    successAssigning: 'Records assigned successfully',
    successTransferring: 'Records transferred successfully',
    allCandidates: 'All Candidates',
    selectRecords: 'Select records to assign',
  },
  ar: {
    title: 'إدارة وصول المستخدمين',
    invitationsTab: 'الدعوات',
    usersTab: 'المستخدمين',
    createInvitation: 'إنشاء دعوة',
    role: 'الدور',
    admin: 'مدير',
    technician: 'فني',
    contactType: 'نوع الاتصال',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    contact: 'جهة الاتصال',
    nameOptional: 'الاسم (اختياري)',
    expiresIn: 'تنتهي خلال',
    hours24: '24 ساعة',
    hours48: '48 ساعة',
    days7: '7 أيام',
    createButton: 'إنشاء الدعوة',
    invitationLink: 'رابط الدعوة',
    copyLink: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط!',
    pending: 'قيد الانتظار',
    accepted: 'مقبولة',
    expired: 'منتهية',
    revoke: 'إلغاء',
    delete: 'حذف',
    noInvitations: 'لا توجد دعوات',
    noUsers: 'لا يوجد مستخدمين',
    lastSignIn: 'آخر تسجيل دخول',
    never: 'أبداً',
    filterAll: 'الكل',
    filterPending: 'قيد الانتظار',
    filterAccepted: 'مقبولة',
    filterExpired: 'منتهية',
    filterByRole: 'تصفية حسب الدور',
    filterByStatus: 'تصفية حسب الحالة',
    allRoles: 'جميع الأدوار',
    allStatuses: 'جميع الحالات',
    hasTechnicianProfile: 'لديه ملف فني',
    yes: 'نعم',
    no: 'لا',
    created: 'تم الإنشاء',
    expires: 'ينتهي',
    acceptedBy: 'تم القبول بواسطة',
    revokeConfirm: 'إلغاء هذه الدعوة؟ لن يتمكن المستلم من استخدام هذا الرابط.',
    deleteConfirm: 'حذف هذه الدعوة نهائياً؟',
    invitationCreated: 'تم إنشاء الدعوة بنجاح',
    invitationRevoked: 'تم إلغاء الدعوة بنجاح',
    invitationDeleted: 'تم حذف الدعوة بنجاح',
    errorCreating: 'فشل في إنشاء الدعوة',
    errorRevoking: 'فشل في إلغاء الدعوة',
    errorDeleting: 'فشل في حذف الدعوة',
    errorLoadingInvitations: 'فشل في تحميل الدعوات',
    errorLoadingUsers: 'فشل في تحميل المستخدمين',
    cancel: 'إلغاء',
    newInvitation: 'دعوة جديدة',
    sendNewInvitation: 'إرسال دعوة جديدة',
    manageInvitations: 'إدارة الدعوات وروابط الدعوة.',
    manageUsers: 'عرض وإدارة المستخدمين الحاليين.',
    pendingCount: 'قيد الانتظار',
    acceptedCount: 'مقبولة',
    expiredCount: 'منتهية',
    totalUsers: 'إجمالي المستخدمين',
    adminUsers: 'مديرين',
    technicianUsers: 'فنيين',
    // Legacy Records
    legacyRecordsTab: 'سجلات قديمة',
    legacyRecords: 'سجلات قديمة',
    legacyRecordsDesc: 'تعيين سجلات الفنيين القدامى يدوياً.',
    noLegacyRecords: 'لا توجد سجلات قديمة',
    assignAll: 'تعيين الكل',
    reviewRecords: 'مراجعة السجلات',
    backToBuckets: 'العودة للحزم',
    assignSelected: 'تعيين المحدد',
    selectTechnician: 'اختر الفني',
    rewriteDisplayName: 'إعادة كتابة اسم العرض',
    rewriteDesc: 'تحديث اسم البارستا ليطابق اسم الفني',
    assign: 'تعيين',
    transferRecords: 'نقل السجلات',
    sourceTechnician: 'الفني المصدر',
    targetTechnician: 'الفني الهدف',
    transferAllRecords: 'نقل كل السجلات',
    highConfidence: 'عالي',
    lowConfidence: 'منخفض',
    records: 'سجلات',
    recordCount: 'عدد السجلات',
    suggestedTechnician: 'الفني المقترح',
    confidence: 'الثقة',
    date: 'التاريخ',
    company: 'الشركة',
    baristaName: 'اسم البارستا',
    source: 'المصدر',
    submissionSource: 'التقرير',
    companyMainSource: 'الشركة الرئيسية',
    companyBranchSource: 'فرع الشركة',
    noTechnicians: 'لا يوجد فنيين متاحين',
    errorLoadingLegacy: 'فشل في تحميل السجلات القديمة',
    errorLoadingTechnicians: 'فشل في تحميل الفنيين',
    errorAssigning: 'فشل في تعيين السجلات',
    errorTransferring: 'فشل في نقل السجلات',
    successAssigning: 'تم تعيين السجلات بنجاح',
    successTransferring: 'تم نقل السجلات بنجاح',
    allCandidates: 'كل المرشحين',
    selectRecords: 'اختر السجلات للتعيين',
  },
};

type Language = 'en' | 'ar';

const UserAccessManagement: React.FC = () => {
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('ar'); // Default to Arabic
  const t = translations[lang];

  // State
  const [activeTab, setActiveTab] = useState<'invitations' | 'users' | 'legacy'>('invitations');
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Legacy Records State
  const [legacyBuckets, setLegacyBuckets] = useState<LegacyMatchBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<LegacyMatchBucket | null>(null);
  const [technicians, setTechnicians] = useState<Array<{id: string, name: string}>>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [rewriteDisplayName, setRewriteDisplayName] = useState(true);
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBucket, setAssigningBucket] = useState<LegacyMatchBucket | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  // Transfer state
  const [sourceTechnicianId, setSourceTechnicianId] = useState<string>('');
  const [targetTechnicianId, setTargetTechnicianId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  const getRecordKey = (record: LegacyRecordRef): string => {
    if (record.source_type === 'submission') {
      return `submission:${record.submission_id || ''}`;
    }

    if (record.source_type === 'company_main') {
      return `company_main:${record.company_id || ''}:${record.maintenance_index}`;
    }

    return `company_branch:${record.company_id || ''}:${record.branch_index || 0}:${record.maintenance_index}`;
  };

  const getSourceLabel = (sourceType: LegacyRecordRef['source_type']): string => {
    if (sourceType === 'submission') return t.submissionSource;
    if (sourceType === 'company_main') return t.companyMainSource;
    return t.companyBranchSource;
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<InviteRole | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    role: 'technician' as InviteRole,
    expiry: 24 as 24 | 48 | 168, // hours
  });

  // Current user
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'legacy') {
      loadLegacyData();
    }
  }, [activeTab]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({ id: user.id });
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadInvitations(), loadUsers()]);
    setLoading(false);
  };

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as InvitationRecord[]);
    } catch (error) {
      logger.error('Error loading invitations', error, 'admin');
      showToast(t.errorLoadingInvitations, 'error');
    }
  };

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      setUsers(result.users || []);
    } catch (error) {
      logger.error('Error loading users', error, 'admin');
      showToast(t.errorLoadingUsers, 'error');
    }
  };

  const loadLegacyData = async () => {
    setLegacyLoading(true);
    try {
      // Load legacy buckets
      const { data: bucketsData, error: bucketsError } = await supabase
        .rpc('get_legacy_record_match_candidates', { min_confidence: 0.70 });

      if (bucketsError) throw bucketsError;
      const mappedBuckets = ((bucketsData || []) as any[]).map((bucket) => ({
        normalized_name: bucket.normalized_name ?? bucket.normalized_barista_name ?? '',
        display_name: bucket.display_name ?? bucket.normalized_name ?? bucket.normalized_barista_name ?? '',
        record_count: Number(bucket.record_count || 0),
        records: Array.isArray(bucket.records) ? bucket.records : [],
        top_technician_id: bucket.top_technician_id ?? bucket.top_technician_match ?? undefined,
        top_technician_name: bucket.top_technician_name ?? undefined,
        top_confidence: Number(bucket.top_confidence || 0),
        confidence_level: bucket.confidence_level === 'high' ? 'high' : 'low',
        all_candidates: Array.isArray(bucket.all_candidates)
          ? bucket.all_candidates
          : Array.isArray(bucket.all_candidate_technicians)
          ? bucket.all_candidate_technicians
          : [],
      })) as LegacyMatchBucket[];
      setLegacyBuckets(mappedBuckets);

      // Load technicians for dropdown
      const { data: techniciansData, error: techError } = await supabase
        .from('technicians')
        .select('id, name')
        .order('name');

      if (techError) throw techError;
      setTechnicians((techniciansData || []).map(t => ({ id: t.id, name: t.name })));
    } catch (error) {
      logger.error('Error loading legacy data', error, 'admin');
      showToast(t.errorLoadingLegacy, 'error');
    } finally {
      setLegacyLoading(false);
    }
  };

  const handleAssignRecords = async () => {
    if (!selectedTechnicianId || !assigningBucket) return;

    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('assign_legacy_records_to_technician', {
        target_technician_id: selectedTechnicianId,
        selected_records: assigningBucket.records,
        rewrite_display_name: rewriteDisplayName,
      });

      if (error) throw error;

      showToast(t.successAssigning, 'success');
      setShowAssignModal(false);
      setAssigningBucket(null);
      setSelectedTechnicianId('');
      setRewriteDisplayName(true);
      await loadLegacyData();
    } catch (error) {
      logger.error('Error assigning records', error, 'admin');
      showToast(t.errorAssigning, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignSelectedRecords = async () => {
    if (!selectedTechnicianId || selectedRecordKeys.length === 0 || !selectedBucket) return;

    const selectedRecords = selectedBucket.records.filter((record) =>
      selectedRecordKeys.includes(getRecordKey(record)),
    );
    if (selectedRecords.length === 0) return;

    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('assign_legacy_records_to_technician', {
        target_technician_id: selectedTechnicianId,
        selected_records: selectedRecords,
        rewrite_display_name: rewriteDisplayName,
      });

      if (error) throw error;

      showToast(t.successAssigning, 'success');
      setSelectedRecordKeys([]);
      setSelectedBucket(null);
      setSelectedTechnicianId('');
      setRewriteDisplayName(true);
      await loadLegacyData();
    } catch (error) {
      logger.error('Error assigning records', error, 'admin');
      showToast(t.errorAssigning, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleTransferRecords = async () => {
    if (!sourceTechnicianId || !targetTechnicianId) return;

    setTransferring(true);
    try {
      const { data, error } = await supabase.rpc('transfer_records_between_technicians', {
        source_technician_id: sourceTechnicianId,
        target_technician_id: targetTechnicianId,
        submission_ids: null, // null = all records
        rewrite_display_name: true,
      });

      if (error) throw error;

      showToast(t.successTransferring, 'success');
      setSourceTechnicianId('');
      setTargetTechnicianId('');
    } catch (error) {
      logger.error('Error transferring records', error, 'admin');
      showToast(t.errorTransferring, 'error');
    } finally {
      setTransferring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const expiresAt = new Date(Date.now() + formData.expiry * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          token: crypto.randomUUID(),
          role: formData.role,
          email: null,
          phone: null,
          name: null,
          created_by: currentUser.id,
          expires_at: expiresAt,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Generate invite link
      const baseUrl = window.location.origin;
      const invitePath = formData.role === 'admin' ? '/admin/invite' : '/technician/invite';
      const inviteLink = `${baseUrl}${invitePath}?token=${data.token}`;

      setCreatedLink(inviteLink);
      showToast(t.invitationCreated, 'success');
      
      // Reset form
      setFormData({
        role: 'technician',
        expiry: 24,
      });

      await loadInvitations();
    } catch (error) {
      logger.error('Error creating invitation', error, 'admin');
      showToast(t.errorCreating, 'error');
    }
  };

  const handleCopyLink = (link: string, id?: string) => {
    navigator.clipboard.writeText(link);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    showToast(t.linkCopied, 'success');
  };

  const handleRevoke = async (invitationId: string) => {
    if (!window.confirm(t.revokeConfirm)) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);

      if (error) throw error;
      showToast(t.invitationRevoked, 'success');
      await loadInvitations();
    } catch (error) {
      logger.error('Error revoking invitation', error, 'admin');
      showToast(t.errorRevoking, 'error');
    }
  };

  const handleDelete = async (invitationId: string) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      showToast(t.invitationDeleted, 'success');
      await loadInvitations();
    } catch (error) {
      logger.error('Error deleting invitation', error, 'admin');
      showToast(t.errorDeleting, 'error');
    }
  };

  const getStatusBadge = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <ClockIcon className="w-3.5 h-3.5" />
            {t.pending}
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            <CheckIcon className="w-3.5 h-3.5" />
            {t.accepted}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {t.expired}
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: InviteRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">
            {t.admin}
          </span>
        );
      case 'technician':
        return (
          <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900/50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">
            {t.technician}
          </span>
        );
      default:
        return null;
    }
  };

  const getUserRoleBadge = (role: 'admin' | 'technician' | 'unknown') => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">
            {t.admin}
          </span>
        );
      case 'technician':
        return (
          <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900/50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">
            {t.technician}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {role}
          </span>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t.never;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return t.expired;
    return `${days} day${days !== 1 ? 's' : ''} left`;
  };

  // Filtered invitations
  const filteredInvitations = invitations.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (roleFilter !== 'all' && inv.role !== roleFilter) return false;
    return true;
  });

  // Stats
  const pendingCount = invitations.filter((i) => i.status === 'pending').length;
  const acceptedCount = invitations.filter((i) => i.status === 'accepted').length;
  const expiredCount = invitations.filter((i) => i.status === 'expired').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const technicianCount = users.filter((u) => u.role === 'technician').length;

  return (
    <div className="w-full max-w-5xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
              {t.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 sm:mt-2">
              {activeTab === 'invitations' ? t.manageInvitations : activeTab === 'users' ? t.manageUsers : t.legacyRecordsDesc}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          {activeTab === 'invitations' && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                setCreatedLink(null);
              }}
              className="bg-teal-600 text-white font-bold py-2 px-4 sm:px-6 rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base transform active:scale-95 flex items-center gap-2"
            >
              {showForm ? (
                <>
                  <XMarkIcon className="w-5 h-5" />
                  {t.cancel}
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-5 h-5" />
                  {t.newInvitation}
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('invitations')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'invitations'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <EnvelopeIcon className="w-5 h-5" />
          {t.invitationsTab}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <UsersIcon className="w-5 h-5" />
          {t.usersTab}
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'legacy'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <DocumentTextIcon className="w-5 h-5" />
          {t.legacyRecordsTab}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : activeTab === 'invitations' ? (
        <>
          {/* Create Invitation Form */}
          {showForm && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 animate-item-fade-in-down">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                {t.sendNewInvitation}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Role Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.role}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'admin' })}
                      className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        formData.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.admin}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'technician' })}
                      className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        formData.role === 'technician'
                          ? 'bg-teal-100 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.technician}
                    </button>
                  </div>
                </div>

                {/* Expiry Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.expiresIn}
                  </label>
                  <div className="flex gap-3">
                    {[24, 48, 168].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setFormData({ ...formData, expiry: hours as 24 | 48 | 168 })}
                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          formData.expiry === hours
                            ? 'bg-teal-100 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {hours === 24 ? t.hours24 : hours === 48 ? t.hours48 : t.days7}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Created Link Display */}
                {createdLink && (
                  <div className="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
                    <label className="block text-sm font-medium text-teal-800 dark:text-teal-300 mb-2">
                      {t.invitationLink}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createdLink}
                        readOnly
                        className="flex-1 rounded-lg border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 py-2 px-3 text-sm text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(createdLink)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        {t.copyLink}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCreatedLink(null);
                      setFormData({
                        role: 'technician',
                        expiry: 24,
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {t.createButton}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.pendingCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{acceptedCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.acceptedCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{expiredCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.expiredCount}</div>
            </div>
          </div>

          {/* Filters */}
          {invitations.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvitationStatus | 'all')}
                className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:ring-teal-500"
              >
                <option value="all">{t.allStatuses}</option>
                <option value="pending">{t.filterPending}</option>
                <option value="accepted">{t.filterAccepted}</option>
                <option value="expired">{t.filterExpired}</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as InviteRole | 'all')}
                className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:ring-teal-500"
              >
                <option value="all">{t.allRoles}</option>
                <option value="admin">{t.admin}</option>
                <option value="technician">{t.technician}</option>
              </select>
            </div>
          )}

          {/* Invitations List */}
          {filteredInvitations.length === 0 ? (
            <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
              <UserPlusIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
                {t.noInvitations}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {t.createInvitation}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => {
                const inviteLink = `${window.location.origin}${invitation.role === 'admin' ? '/admin/invite' : '/technician/invite'}?token=${invitation.token}`;
                const inviteTitle =
                  invitation.name ||
                  invitation.email ||
                  invitation.phone ||
                  (lang === 'ar' ? 'دعوة عامة' : 'Generic Invite');
                
                return (
                  <div
                    key={invitation.id}
                    className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 ${
                      invitation.status === 'expired' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          invitation.status === 'pending'
                            ? 'bg-teal-100 dark:bg-teal-900/50'
                            : invitation.status === 'accepted'
                            ? 'bg-green-100 dark:bg-green-900/50'
                            : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                          <UserPlusIcon className={`h-5 w-5 ${
                            invitation.status === 'pending'
                              ? 'text-teal-600 dark:text-teal-400'
                              : invitation.status === 'accepted'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-slate-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-slate-800 dark:text-white">
                              {inviteTitle}
                            </h4>
                            {getRoleBadge(invitation.role)}
                            {getStatusBadge(invitation.status)}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {invitation.email && <span className="mr-3">{invitation.email}</span>}
                            {invitation.phone && <span>{invitation.phone}</span>}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {invitation.status === 'pending' && (
                              <span>{t.expires}: {getDaysRemaining(invitation.expires_at)}</span>
                            )}
                            {invitation.status === 'accepted' && invitation.accepted_at && (
                              <span>{t.acceptedBy}: {formatDate(invitation.accepted_at)}</span>
                            )}
                            {invitation.status === 'expired' && (
                              <span>{t.expired}: {formatDate(invitation.expires_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleCopyLink(inviteLink, invitation.id)}
                              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                            >
                              {copiedId === invitation.id ? (
                                <>
                                  <CheckIcon className="w-4 h-4" />
                                  {t.linkCopied}
                                </>
                              ) : (
                                <>
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                  {t.copyLink}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleRevoke(invitation.id)}
                              className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              title={t.revoke}
                            >
                              <ClockIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(invitation.id)}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t.delete}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : activeTab === 'legacy' ? (
        <>
          {/* Legacy Records Tab */}
          {legacyLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : legacyBuckets.length === 0 ? (
            <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
                {t.noLegacyRecords}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {t.legacyRecordsDesc}
              </p>
            </div>
          ) : selectedBucket ? (
            /* Row-level view */
            <div>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => {
                    setSelectedBucket(null);
                    setSelectedSubmissionIds([]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  {t.backToBuckets}
                </button>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {selectedBucket.display_name}
                </h2>
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {selectedBucket.record_count} {t.records}
                </span>
              </div>

              {selectedSubmissionIds.length > 0 && (
                <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-sm text-teal-800 dark:text-teal-300">
                      {selectedSubmissionIds.length} {t.selectRecords}
                    </p>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedTechnicianId}
                        onChange={(e) => setSelectedTechnicianId(e.target.value)}
                        className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      >
                        <option value="">{t.selectTechnician}</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={rewriteDisplayName}
                          onChange={(e) => setRewriteDisplayName(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                        />
                        {t.rewriteDisplayName}
                      </label>
                      <button
                        onClick={handleAssignSelectedRecords}
                        disabled={!selectedTechnicianId || assigning}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {assigning ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckIcon className="w-4 h-4" />
                        )}
                        {t.assignSelected}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={selectedSubmissionIds.length === selectedBucket.submission_ids.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubmissionIds(selectedBucket.submission_ids);
                            } else {
                              setSelectedSubmissionIds([]);
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.date}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.company}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.baristaName}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.confidence}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {selectedBucket.all_candidates.slice(0, selectedBucket.record_count).map((candidate, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSubmissionIds.includes(selectedBucket.submission_ids[idx])}
                            onChange={(e) => {
                              const id = selectedBucket.submission_ids[idx];
                              if (e.target.checked) {
                                setSelectedSubmissionIds([...selectedSubmissionIds, id]);
                              } else {
                                setSelectedSubmissionIds(selectedSubmissionIds.filter(sid => sid !== id));
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {candidate.maintenance_date || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {candidate.company_name || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {selectedBucket.display_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            candidate.confidence >= 0.70
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {Math.round(candidate.confidence * 100)}% ({candidate.confidence >= 0.70 ? t.highConfidence : t.lowConfidence})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Bucket List View */
            <div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  {t.transferRecords}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {t.legacyRecordsDesc}
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t.sourceTechnician}
                    </label>
                    <select
                      value={sourceTechnicianId}
                      onChange={(e) => setSourceTechnicianId(e.target.value)}
                      className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:ring-teal-500"
                    >
                      <option value="">{t.selectTechnician}</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t.targetTechnician}
                    </label>
                    <select
                      value={targetTechnicianId}
                      onChange={(e) => setTargetTechnicianId(e.target.value)}
                      className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:ring-teal-500"
                    >
                      <option value="">{t.selectTechnician}</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleTransferRecords}
                    disabled={!sourceTechnicianId || !targetTechnicianId || transferring}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {transferring ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRightIcon className="w-4 h-4" />
                    )}
                    {t.transferAllRecords}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {legacyBuckets.map((bucket) => (
                  <div
                    key={bucket.normalized_name}
                    className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/50">
                          <UserCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-slate-800 dark:text-white">
                              {bucket.display_name}
                            </h4>
                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {bucket.record_count} {t.records}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              bucket.confidence_level === 'high'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {bucket.confidence_level === 'high' ? t.highConfidence : t.lowConfidence}
                            </span>
                          </div>
                          {bucket.top_technician_name && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              {t.suggestedTechnician}: {bucket.top_technician_name} ({Math.round(bucket.top_confidence * 100)}%)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => {
                            setAssigningBucket(bucket);
                            setSelectedTechnicianId(bucket.top_technician_id || '');
                            setShowAssignModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                        >
                          <UserPlusIcon className="w-4 h-4" />
                          {t.assignAll}
                        </button>
                        <button
                          onClick={() => setSelectedBucket(bucket)}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          {t.reviewRecords}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignment Modal */}
          {showAssignModal && assigningBucket && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md animate-item-fade-in-down">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {t.assignAll}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setAssigningBucket(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.selectTechnician}
                    </label>
                    <select
                      value={selectedTechnicianId}
                      onChange={(e) => setSelectedTechnicianId(e.target.value)}
                      className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:ring-teal-500"
                    >
                      <option value="">{t.selectTechnician}</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={rewriteDisplayName}
                        onChange={(e) => setRewriteDisplayName(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                      />
                      {t.rewriteDisplayName}
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                      {t.rewriteDesc}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowAssignModal(false);
                        setAssigningBucket(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleAssignRecords}
                      disabled={!selectedTechnicianId || assigning}
                      className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {assigning ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                      {t.assign}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Users Tab */}
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.totalUsers}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{adminCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.adminUsers}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{technicianCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.technicianUsers}</div>
            </div>
          </div>

          {/* Users List */}
          {users.length === 0 ? (
            <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
              <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
                {t.noUsers}
              </h2>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.role}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.contact}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.nameOptional}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.hasTechnicianProfile}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.lastSignIn}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getUserRoleBadge(user.role)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {user.email && (
                              <span className="flex items-center gap-1">
                                <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                                {user.email}
                              </span>
                            )}
                            {user.phone && (
                              <span className="flex items-center gap-1">
                                <PhoneIcon className="w-4 h-4 text-slate-400" />
                                {user.phone}
                              </span>
                            )}
                            {!user.email && !user.phone && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {user.name || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {user.hasTechnicianProfile ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                              {t.yes}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {t.no}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(user.lastSignInAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserAccessManagement;
