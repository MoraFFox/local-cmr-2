import type { User } from "@supabase/supabase-js";
import { logger } from "./logger";

const normalizeRole = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

/**
 * List of email domains that are automatically considered admin.
 * Add your trusted admin email domains here.
 */
const ADMIN_EMAIL_DOMAINS: string[] = [
  // Add admin email domains here, e.g., "yourcompany.com"
];

/**
 * Check if user's email belongs to an admin domain.
 */
const isAdminEmailDomain = (email: string | undefined): boolean => {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return ADMIN_EMAIL_DOMAINS.includes(domain);
};

export const getUserRole = (user: User | null | undefined): string => {
  if (!user) {
    return "";
  }

  const appRole = normalizeRole(user.app_metadata?.role);
  if (appRole) {
    return appRole;
  }

  const userRole = normalizeRole(user.user_metadata?.role);
  if (userRole) {
    return userRole;
  }

  // Fallback: Check if email belongs to admin domain
  if (isAdminEmailDomain(user.email)) {
    return "admin";
  }

  return "";
};

export const hasAdminRole = (user: User | null | undefined): boolean => {
  const role = getUserRole(user);
  return role === "admin";
};

/**
 * Check if user might be admin based on lack of technician profile.
 * This is used as a fallback when user has no explicit role set.
 * Returns null if uncertain, true if likely admin, false if definitely not.
 */
export const checkAdminFallback = async (
  user: User | null | undefined,
  supabaseClient: { from: (table: string) => unknown }
): Promise<boolean | null> => {
  if (!user) return null;

  // If user already has explicit role, don't use fallback
  const role = getUserRole(user);
  if (role) return null;

  // Check if user has a technician profile
  try {
    const { data: technicianProfile, error } = await (supabaseClient as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }> } } } })
      .from("technicians")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
        logger.error("Error checking technician profile", error, "auth");
        return null;
      }

      // If user is not a technician and has no role, they might be admin
      const isTechnician = !!technicianProfile?.id;
      
      return !isTechnician;
    } catch (error) {
      logger.error("Exception in fallback check", error, "auth");
      return null;
  }
};
