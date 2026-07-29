export interface PartRecord {
  name: string;
  count: number;
  cost?: number; // For custom parts
  paidByClient?: boolean;
}

export interface ServiceRecord {
  name: string;
  count: number;
  cost?: number; // For custom services
  paidByClient?: boolean;
}

export interface Part {
  label: string;
  value: string;
  cost: number;
  isFrequentlyReplaced?: boolean;
}

export interface Service {
  label: string;
  value: string;
  cost: number;
  category: string;
  description?: string;
}

export interface MaintenancePhoto {
  url: string;
  type: "before" | "after" | "legacy";
}

export interface PortalPhotoEntry {
  url: string;
  type: "before" | "after";
}

export interface Contact {
  id: number;
  name: string;
  position: string;
  customPosition?: string;
  email?: string;
  phoneNumbers: { id: number; number: string }[];
}

export interface Machine {
  id: string | number;
  machineName?: string;
  machineType?: string;
  machineOption?: string;
  machineOwnershipType?: "leased" | "consumption";
  dailyLeaseCost?: number;
}

export interface Branch {
  id: number;
  branchName?: string;
  email: string;
  taxNumber?: string;
  location: string;
  contacts: Contact[];
  baristas: Barista[];
  clientBaristas: ClientBarista[];
  usesOurMachines: boolean | null;
  machines: Machine[];
  machineOwnershipType?: "leased" | "consumption" | "bought";
  dailyLeaseCost?: number;
  allowedMaintenanceTimes?: string;
  coffeeConsumptionKg?: number;
  maintenanceHistory: MaintenanceRecord[];
}

export interface Warehouse {
  location: string;
  contacts: Contact[];
}

export interface Barista {
  id: number;
  name: string;
  phone: string;
  notes?: string;
}

export interface ClientBarista {
  id: number;
  name: string;
  phone: string;
  notes?: string;
}

export interface MachineMaintained {
  id: number;
  name: string;
  count: number;
}

export interface Supervisor {
  id: number;
  name: string;
  phone: string;
}

export interface MaintenanceRecord {
  id: number | string;
  maintenanceDate: string;
  notes?: string;
  type: "requested" | "scheduled";
  hadProblem: boolean;
  partsWereReplaced: boolean;
  problemSolved: boolean;
  partsReplaced: PartRecord[];
  paidBy: "company" | "client";
  baristaName: string;
  clientBaristaName?: string;
  visitRating?: number; // 1-5 Performance rating for client's barista
  recommendations?: string;
  problems?: string[];
  visitZone: string | null;
  servicesPerformed: ServiceRecord[];
  followUpVisits?: MaintenanceRecord[];
  machines?: MachineMaintained[];
  supervisors: Supervisor[];
  dailyLeaseCost?: number;
  nextVisitDate?: string;
  photos?: MaintenancePhoto[];
  technicianId?: string;
}

export interface FormData {
  id?: number;
  companyName: string;
  email: string;
  taxNumber: string;
  location: string;
  hasBranches: boolean | null;
  usesOurMachines: boolean | null;
  machines: Machine[];
  machineOwnershipType?: "leased" | "consumption" | "bought";
  dailyLeaseCost?: number;
  allowedMaintenanceTimes?: string;
  coffeeConsumptionKg?: number;
  branchCount: number;
  branches: Branch[];
  warehouse: Warehouse;
  baristas: Barista[];
  clientBaristas?: ClientBarista[];
  maintenanceHistory: MaintenanceRecord[];
  contacts: Contact[];
  pendingSync?: boolean;
}

export interface PortalSubmission {
  id: string | number;
  company_id: string | number;
  branch_id?: string | number;
  maintenance_date: string;
  notes?: string;
  type: string;
  had_problem?: boolean;
  parts_were_replaced?: boolean;
  problem_solved?: boolean;
  parts_replaced?: PartRecord[];
  paid_by?: string;
  barista_name?: string;
  client_barista_name?: string;
  visit_rating?: number;
  problems?: string[];
  visit_zone?: string | null;
  services_performed?: ServiceRecord[];
  machines?: MachineMaintained[];
  photo_urls?: string[];
  photo_entries?: PortalPhotoEntry[];
  technician_id?: string;
}

// ============================================
// Invite System Types
// ============================================

/**
 * Role for invitation - determines what type of account will be created
 */
export type InviteRole = 'admin' | 'technician';

/**
 * Status of an invitation
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

/**
 * Invitation record from the database
 */
export interface InvitationRecord {
  id: string;
  token: string;
  role: InviteRole;
  email: string | null;
  phone: string | null;
  name: string | null;
  status: InvitationStatus;
  expires_at: string; // ISO timestamp
  created_at: string;
  created_by: string | null; // admin user id
  accepted_at: string | null;
  accepted_by: string | null;
}

/**
 * Invite validation response from Edge Function
 */
export interface InviteValidationResponse {
  valid: boolean;
  invite?: {
    role: InviteRole;
    email: string | null;
    phone: string | null;
    name: string | null;
  };
  error?: string;
  errorAr?: string;
}

/**
 * Invite redemption request payload
 */
export interface InviteRedeemRequest {
  token: string;
  password: string;
  name: string;
  email?: string;
}

/**
 * Invite redemption response from Edge Function
 */
export interface InviteRedeemResponse {
  success: boolean;
  user?: {
    id: string;
    role: InviteRole;
  };
  error?: string;
  errorAr?: string;
}

/**
 * User info from admin-users Edge Function
 */
export interface AdminUserInfo {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: 'admin' | 'technician' | 'unknown';
  hasTechnicianProfile: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

/**
 * Admin users list response from Edge Function
 */
export interface AdminUsersResponse {
  users: AdminUserInfo[];
  error?: string;
  errorAr?: string;
}

/**
 * Emergency admin recovery request payload.
 */
export interface AdminRecoveryRequest {
  key: string;
  email: string;
  password: string;
  name?: string;
}

/**
 * Emergency admin recovery response payload.
 */
export interface AdminRecoveryResponse {
  success: boolean;
  error?: string;
  errorAr?: string;
}

/**
 * Create invitation request payload
 */
export interface CreateInvitationRequest {
  role: InviteRole;
  email?: string;
  phone?: string;
  name?: string;
  expiresInHours?: number; // default 24
}

// ============================================
// Legacy Technician Matching Types
// ============================================

/**
 * Individual record match candidate for legacy technician matching
 */
export interface LegacyMatchCandidate {
  submission_id: string;
  barista_name: string;
  normalized_name: string;
  maintenance_date: string;
  company_name?: string;
  confidence: number;
  suggested_technician_id?: string;
  suggested_technician_name?: string;
}

/**
 * Grouped legacy records by normalized name
 */
export interface LegacyMatchBucket {
  normalized_name: string;
  display_name: string; // Original barista_name for display
  record_count: number;
  records: LegacyRecordRef[];
  top_technician_id?: string;
  top_technician_name?: string;
  top_confidence: number;
  confidence_level: 'high' | 'low'; // high >= 0.70, low < 0.70
  all_candidates: Array<{
    technician_id: string;
    technician_name: string;
    confidence: number;
  }>;
}

export interface LegacyRecordRef {
  source_type: 'submission' | 'company_main' | 'company_branch';
  submission_id?: string;
  company_id?: number;
  branch_index?: number;
  maintenance_index: number;
  current_name: string;
  maintenance_date?: string;
  company_name?: string;
  confidence?: number;
}

/**
 * Response from auto_link RPC function
 */
export interface LegacyAutoLinkResponse {
  linked_count: number;
  records: Array<{
    submission_id: string;
    barista_name: string;
    confidence: number;
  }>;
}

/**
 * Response from manual assign RPC function
 */
export interface LegacyManualAssignResponse {
  assigned_count: number;
}

/**
 * Response from transfer RPC function
 */
export interface LegacyTransferResponse {
  transferred_count: number;
}

/**
 * Audit log entry for technician record assignment changes
 */
export interface TechnicianRecordAssignmentAudit {
  id: string;
  submission_id: string;
  old_technician_id?: string;
  new_technician_id: string;
  old_barista_name?: string;
  match_confidence?: number;
  match_method: 'auto' | 'manual_bucket' | 'manual_row' | 'transfer';
  actor_id?: string;
  created_at: string;
}
