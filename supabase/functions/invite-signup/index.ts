// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

interface InviteRecord {
  id: string;
  token: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: "admin" | "technician";
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

interface ValidateRequest {
  token: string;
}

interface RedeemRequest {
  token: string;
  password: string;
  name: string;
  email?: string;
}

interface ErrorResponse {
  valid?: false;
  success?: false;
  error: string;
  errorAr: string;
}

interface ValidateSuccessResponse {
  valid: true;
  invite: {
    role: "admin" | "technician";
    email: string | null;
    phone: string | null;
    name: string | null;
  };
}

interface RedeemSuccessResponse {
  success: true;
  user: {
    id: string;
    role: "admin" | "technician";
  };
}

type ValidateResponse = ValidateSuccessResponse | ErrorResponse;
type RedeemResponse = RedeemSuccessResponse | ErrorResponse;

// Bilingual error messages
const ERROR_MESSAGES = {
  INVITE_NOT_FOUND: {
    error: "Invite not found",
    errorAr: "الدعوة غير موجودة",
  },
  INVITE_EXPIRED: {
    error: "Invite expired",
    errorAr: "الدعوة منتهية",
  },
  INVITE_ALREADY_USED: {
    error: "Invite already used",
    errorAr: "الدعوة مستخدمة بالفعل",
  },
  INVALID_TOKEN: {
    error: "Invalid token format",
    errorAr: "صيغة الرمز غير صالحة",
  },
  MISSING_EMAIL: {
    error: "Email is required for this invite",
    errorAr: "البريد الإلكتروني مطلوب لهذه الدعوة",
  },
  INVALID_EMAIL: {
    error: "Invalid email format",
    errorAr: "صيغة البريد الإلكتروني غير صالحة",
  },
  MISSING_PASSWORD: {
    error: "Password is required",
    errorAr: "كلمة المرور مطلوبة",
  },
  MISSING_NAME: {
    error: "Name is required",
    errorAr: "الاسم مطلوب",
  },
  USER_CREATION_FAILED: {
    error: "Failed to create user account",
    errorAr: "فشل في إنشاء حساب المستخدم",
  },
  TECHNICIAN_PROFILE_FAILED: {
    error: "Failed to create technician profile",
    errorAr: "فشل في إنشاء ملف الفني",
  },
  INTERNAL_ERROR: {
    error: "An internal error occurred",
    errorAr: "حدث خطأ داخلي",
  },
  RACE_CONDITION: {
    error: "Invite was already redeemed",
    errorAr: "تم استخدام الدعوة بالفعل",
  },
};

function createErrorResponse(
  key: keyof typeof ERROR_MESSAGES,
  status: number = 400
): Response {
  const errorData = ERROR_MESSAGES[key];
  return new Response(JSON.stringify(errorData), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidUuid(token: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function validateInvite(
  supabase: ReturnType<typeof createClient>,
  token: string
): Promise<{ invite: InviteRecord | null; error: Response | null }> {
  // Validate token format
  if (!token || !isValidUuid(token)) {
    return { invite: null, error: createErrorResponse("INVALID_TOKEN") };
  }

  // Query invite
  const { data: invite, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !invite) {
    console.error("Invite lookup error:", error);
    return { invite: null, error: createErrorResponse("INVITE_NOT_FOUND") };
  }

  // Check if expired
  const expiresAt = new Date(invite.expires_at);
  if (expiresAt < new Date()) {
    return { invite: null, error: createErrorResponse("INVITE_EXPIRED") };
  }

  // Check if already used
  if (invite.status !== "pending") {
    return { invite: null, error: createErrorResponse("INVITE_ALREADY_USED") };
  }

  return { invite: invite as InviteRecord, error: null };
}

async function handleValidate(
  supabase: ReturnType<typeof createClient>,
  body: ValidateRequest
): Promise<Response> {
  const { invite, error } = await validateInvite(supabase, body.token);

  if (error) return error;

  const response: ValidateSuccessResponse = {
    valid: true,
    invite: {
      role: invite!.role,
      email: invite!.email,
      phone: invite!.phone,
      name: invite!.name,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleRedeem(
  supabase: ReturnType<typeof createClient>,
  body: RedeemRequest
): Promise<Response> {
  // Validate required fields
  if (!body.password || body.password.length < 8) {
    return createErrorResponse("MISSING_PASSWORD");
  }

  if (!body.name || body.name.trim().length < 2) {
    return createErrorResponse("MISSING_NAME");
  }

  // Validate invite first
  const { invite, error: validateError } = await validateInvite(
    supabase,
    body.token
  );

  if (validateError) return validateError;

  const inviteEmail = invite!.email?.trim().toLowerCase() || null;
  const invitePhone = invite!.phone?.trim() || null;

  let finalEmail = inviteEmail;
  let finalPhone = invitePhone;

  // Generic links may not have pre-bound contact.
  if (!finalEmail && !finalPhone) {
    const requestEmail = body.email?.trim().toLowerCase() || "";
    if (!requestEmail) {
      return createErrorResponse("MISSING_EMAIL");
    }
    if (!isValidEmail(requestEmail)) {
      return createErrorResponse("INVALID_EMAIL");
    }
    finalEmail = requestEmail;
  }

  // Create user via Auth Admin API
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create auth admin client
  const authHeaders = {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // Prepare user creation payload
  const createUserPayload: Record<string, unknown> = {
    password: body.password,
    email_confirm: true,
    app_metadata: { role: invite!.role },
    user_metadata: {
      role: invite!.role,
      name: body.name.trim(),
    },
  };

  // Set email or phone based on invite
  if (invite!.email) {
    createUserPayload.email = finalEmail;
  } else if (invite!.phone) {
    createUserPayload.phone = finalPhone;
    createUserPayload.phone_confirm = true;
    delete createUserPayload.email_confirm;
  } else {
    createUserPayload.email = finalEmail;
  }

  // Create user via Admin API
  const createUserResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(createUserPayload),
    }
  );

  if (!createUserResponse.ok) {
    const errorText = await createUserResponse.text();
    console.error("User creation failed:", errorText);
    return createErrorResponse("USER_CREATION_FAILED", 500);
  }

  const userData = await createUserResponse.json();
  const userId = userData.id;

  // If technician, create profile row
  if (invite!.role === "technician") {
    const { error: technicianError } = await supabase
      .from("technicians")
      .insert({
        id: userId,
        name: body.name.trim(),
        email: finalEmail,
        phone: finalPhone,
      });

    if (technicianError) {
      console.error("Technician profile creation failed:", technicianError);
      // Attempt to clean up the created user
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      return createErrorResponse("TECHNICIAN_PROFILE_FAILED", 500);
    }
  }

  // Atomic update: mark invite as accepted (race-safe)
  const { count, error: updateError } = await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("token", body.token)
    .eq("status", "pending");

  // Check if update affected any rows (race condition check)
  if (updateError || count === 0) {
    console.error("Invite update failed or race condition:", updateError);
    // Clean up created user
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    return createErrorResponse("RACE_CONDITION", 409);
  }

  const response: RedeemSuccessResponse = {
    success: true,
    user: {
      id: userId,
      role: invite!.role,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get action from query params
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Parse request body
    const body = await req.json();

    // Route to appropriate handler
    if (action === "validate") {
      return await handleValidate(supabase, body as ValidateRequest);
    } else if (action === "redeem") {
      return await handleRedeem(supabase, body as RedeemRequest);
    } else {
      return new Response(
        JSON.stringify({
          error: "Invalid action. Use 'validate' or 'redeem'",
          errorAr: "إجراء غير صالح. استخدم 'validate' أو 'redeem'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return createErrorResponse("INTERNAL_ERROR", 500);
  }
});
