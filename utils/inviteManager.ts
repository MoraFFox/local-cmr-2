/**
 * @deprecated
 * This module is deprecated. Invite handling is now managed via:
 * - Database: `public.invitations` table
 * - Edge Function: `supabase/functions/invite-signup/index.ts`
 * - Frontend: `components/InviteSignup.tsx`
 *
 * Do not use these functions for new code.
 * This file will be removed in a future version.
 */

/**
 * @deprecated
 * This interface is deprecated. Use the database schema for invitations instead.
 */
export interface Invite {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: number;
  expiresAt: number;
  acceptedAt?: number;
}

const DEPRECATION_WARNING = 'inviteManager: This module is deprecated. Use the Edge Function and database invitations instead.';

/**
 * @deprecated
 * This function is deprecated. Create invitations via the database instead.
 * @returns Always returns null
 */
export function createInvite(_params: { name: string; email?: string; phone?: string }): Invite | null {
  console.warn(DEPRECATION_WARNING);
  console.warn('Use the Edge Function invite-signup to create invitations.');
  return null;
}

/**
 * @deprecated
 * This function is deprecated. Query invitations from the database instead.
 * @returns Always returns an empty array
 */
export function getPendingInvites(): Invite[] {
  console.warn(DEPRECATION_WARNING);
  return [];
}

/**
 * @deprecated
 * This function is deprecated. Query invitations from the database instead.
 * @returns Always returns an empty array
 */
export function getAllInvites(): Invite[] {
  console.warn(DEPRECATION_WARNING);
  return [];
}

/**
 * @deprecated
 * This function is deprecated. Validate invitations via the Edge Function instead.
 * @returns Always returns null
 */
export function validateInvite(_token: string): Invite | null {
  console.warn(DEPRECATION_WARNING);
  return null;
}

/**
 * @deprecated
 * This function is deprecated. Accept invitations via the Edge Function instead.
 * @returns Always returns false
 */
export function acceptInvite(_token: string): boolean {
  console.warn(DEPRECATION_WARNING);
  return false;
}

/**
 * @deprecated
 * This function is deprecated. Revoke invitations via the database instead.
 * @returns Always returns false
 */
export function revokeInvite(_inviteId: string): boolean {
  console.warn(DEPRECATION_WARNING);
  return false;
}

/**
 * @deprecated
 * This function is deprecated. Delete invitations via the database instead.
 * @returns Always returns false
 */
export function deleteInvite(_inviteId: string): boolean {
  console.warn(DEPRECATION_WARNING);
  return false;
}

/**
 * @deprecated
 * This function is deprecated. Invite links are now generated via the Edge Function.
 * @returns Always returns an empty string
 */
export function getInviteLink(_token: string, _baseUrl?: string): string {
  console.warn(DEPRECATION_WARNING);
  return '';
}
