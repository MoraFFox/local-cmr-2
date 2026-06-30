// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: {
    role?: string;
    name?: string;
  };
  app_metadata?: {
    role?: string;
  };
  created_at?: string;
  last_sign_in_at?: string | null;
}

interface NormalizedUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: "admin" | "technician" | "unknown";
  hasTechnicianProfile: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

interface ListUsersResponse {
  users: NormalizedUser[];
}

interface ErrorResponse {
  error: string;
  errorAr: string;
}

/**
 * Extracts and normalizes the user role from metadata.
 * Checks app_metadata.role first, then falls back to user_metadata.role.
 * Role comparison is case-insensitive.
 */
function getUserRole(user: User): "admin" | "technician" | "unknown" {
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (!role) return "unknown";
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "technician") return "technician";
  return "unknown";
}

/**
 * Extracts the user's display name from metadata.
 */
function getUserName(user: User): string {
  return user.user_metadata?.name || "";
}

/**
 * Verifies the JWT and checks if the user has admin role.
 * Returns the user data if admin, or an error response if not.
 */
async function verifyAdminAccess(
  authHeader: string | null
): Promise<{ isAdmin: boolean; error: Response | null }> {
  if (!authHeader) {
    return {
      isAdmin: false,
      error: new Response(
        JSON.stringify({
          error: "Authorization header required",
          errorAr: "رأس التفويض مطلوب",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Extract Bearer token
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return {
      isAdmin: false,
      error: new Response(
        JSON.stringify({
          error: "Invalid authorization token",
          errorAr: "رمز التفويض غير صالح",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Verify JWT and get user info using Supabase Auth API
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const verifyResponse = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!verifyResponse.ok) {
    return {
      isAdmin: false,
      error: new Response(
        JSON.stringify({
          error: "Invalid or expired token",
          errorAr: "رمز غير صالح أو منتهي الصلاحية",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  const userData = await verifyResponse.json();
  const userRole = getUserRole(userData);

  if (userRole !== "admin") {
    return {
      isAdmin: false,
      error: new Response(
        JSON.stringify({
          error: "Access denied. Admin role required.",
          errorAr: "الوصول مرفوض. مطلوب صلاحية المدير.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { isAdmin: true, error: null };
}

/**
 * Lists all users using the Auth Admin API.
 */
async function listAllUsers(): Promise<User[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const users: User[] = [];
  let page = 1;
  const perPage = 100;

  // Paginate through all users
  while (true) {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to list users:", errorText);
      throw new Error("Failed to list users");
    }

    const data = await response.json();
    const pageUsers = data.users || [];

    users.push(...pageUsers);

    // Check if there are more pages
    if (pageUsers.length < perPage) {
      break;
    }
    page++;
  }

  return users;
}

/**
 * Checks which user IDs have technician profiles.
 */
async function getTechnicianProfileMap(
  supabase: ReturnType<typeof createClient>,
  userIds: string[]
): Promise<Map<string, boolean>> {
  const profileMap = new Map<string, boolean>();

  if (userIds.length === 0) return profileMap;

  // Initialize all to false
  userIds.forEach((id) => profileMap.set(id, false));

  // Query technicians table
  const { data: technicians, error } = await supabase
    .from("technicians")
    .select("id")
    .in("id", userIds);

  if (error) {
    console.error("Failed to query technicians:", error);
    // Return map with all false on error
    return profileMap;
  }

  // Mark users with profiles
  technicians?.forEach((tech: { id: string }) => {
    profileMap.set(tech.id, true);
  });

  return profileMap;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow GET
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
        errorAr: "الطريقة غير مسموح بها",
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    const { isAdmin, error: authError } = await verifyAdminAccess(authHeader);

    if (!isAdmin) {
      return authError;
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // List all users
    const users = await listAllUsers();

    // Get technician profile map
    const userIds = users.map((u) => u.id);
    const technicianProfileMap = await getTechnicianProfileMap(
      supabase,
      userIds
    );

    // Normalize user data
    const normalizedUsers: NormalizedUser[] = users.map((user) => ({
      id: user.id,
      email: user.email || null,
      phone: user.phone || null,
      name: getUserName(user),
      role: getUserRole(user),
      hasTechnicianProfile: technicianProfileMap.get(user.id) || false,
      createdAt: user.created_at || new Date().toISOString(),
      lastSignInAt: user.last_sign_in_at || null,
    }));

    const response: ListUsersResponse = {
      users: normalizedUsers,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "An internal error occurred",
        errorAr: "حدث خطأ داخلي",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
