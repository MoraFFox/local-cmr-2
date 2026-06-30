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

const MAX_FAILED_ATTEMPTS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const messages = {
  GENERIC_FAILURE: {
    error: "Recovery failed",
    errorAr: "فشلت عملية الاسترداد",
  },
  EMAIL_EXISTS: {
    error: "Email already exists",
    errorAr: "البريد الإلكتروني مستخدم بالفعل",
  },
  INVALID_INPUT: {
    error: "Invalid input",
    errorAr: "بيانات الإدخال غير صالحة",
  },
  RATE_LIMITED: {
    error: "Too many attempts. Try again later.",
    errorAr: "عدد محاولات كبير. حاول مرة أخرى لاحقًا.",
  },
  INTERNAL_ERROR: {
    error: "Internal server error",
    errorAr: "خطأ داخلي في الخادم",
  },
} as const;

interface RecoveryRequest {
  key: string;
  email: string;
  password: string;
  name?: string;
}

interface RecoveryAttemptInsert {
  ip_hash: string;
  user_agent: string | null;
  attempted_email: string | null;
  success: boolean;
  error_code: string | null;
}

const jsonResponse = (status: number, payload: Record<string, unknown>) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  return "unknown";
};

const sha256Hex = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const logRecoveryAttempt = async (
  supabase: ReturnType<typeof createClient>,
  payload: RecoveryAttemptInsert
): Promise<void> => {
  const { error } = await supabase.from("admin_recovery_attempts").insert(payload);
  if (error) {
    console.error("Failed to write recovery audit log:", error);
  }
};

const countRecentFailedAttempts = async (
  supabase: ReturnType<typeof createClient>,
  ipHash: string
): Promise<number> => {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("admin_recovery_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("success", false)
    .gte("created_at", since);

  if (error) {
    console.error("Failed to count recovery attempts:", error);
    return 0;
  }

  return count || 0;
};

const doesEmailExist = async (
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<boolean> => {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const exists = users.some(
      (user) => user.email && user.email.toLowerCase() === email
    );
    if (exists) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }

    page += 1;
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed",
      errorAr: "الطريقة غير مسموح بها",
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const expectedRecoveryKey = Deno.env.get("ADMIN_RECOVERY_PATH_KEY");

    if (!supabaseUrl || !serviceRoleKey || !expectedRecoveryKey) {
      return jsonResponse(500, {
        success: false,
        ...messages.INTERNAL_ERROR,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let body: RecoveryRequest | null = null;
    try {
      body = (await req.json()) as RecoveryRequest;
    } catch {
      return jsonResponse(400, {
        success: false,
        ...messages.INVALID_INPUT,
      });
    }

    const userAgent = req.headers.get("user-agent");
    const ipHash = await sha256Hex(getClientIp(req));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const key = typeof body.key === "string" ? body.key.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    const failedAttempts = await countRecentFailedAttempts(supabase, ipHash);
    if (failedAttempts >= MAX_FAILED_ATTEMPTS_PER_HOUR) {
      await logRecoveryAttempt(supabase, {
        ip_hash: ipHash,
        user_agent: userAgent,
        attempted_email: email || null,
        success: false,
        error_code: "rate_limited",
      });
      return jsonResponse(429, {
        success: false,
        ...messages.RATE_LIMITED,
      });
    }

    if (!email || !password || !key || !isValidEmail(email) || password.length < 8) {
      await logRecoveryAttempt(supabase, {
        ip_hash: ipHash,
        user_agent: userAgent,
        attempted_email: email || null,
        success: false,
        error_code: "invalid_input",
      });
      return jsonResponse(400, {
        success: false,
        ...messages.INVALID_INPUT,
      });
    }

    if (key !== expectedRecoveryKey) {
      await logRecoveryAttempt(supabase, {
        ip_hash: ipHash,
        user_agent: userAgent,
        attempted_email: email,
        success: false,
        error_code: "invalid_key",
      });
      return jsonResponse(403, {
        success: false,
        ...messages.GENERIC_FAILURE,
      });
    }

    const emailExists = await doesEmailExist(supabase, email);
    if (emailExists) {
      await logRecoveryAttempt(supabase, {
        ip_hash: ipHash,
        user_agent: userAgent,
        attempted_email: email,
        success: false,
        error_code: "email_exists",
      });
      return jsonResponse(409, {
        success: false,
        ...messages.EMAIL_EXISTS,
      });
    }

    const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: {
        role: "admin",
        name: name || undefined,
      },
    });

    if (createError || !createdData.user?.id) {
      console.error("Failed to create recovery admin user:", createError);
      await logRecoveryAttempt(supabase, {
        ip_hash: ipHash,
        user_agent: userAgent,
        attempted_email: email,
        success: false,
        error_code: "create_failed",
      });
      return jsonResponse(500, {
        success: false,
        ...messages.GENERIC_FAILURE,
      });
    }

    await logRecoveryAttempt(supabase, {
      ip_hash: ipHash,
      user_agent: userAgent,
      attempted_email: email,
      success: true,
      error_code: null,
    });

    return jsonResponse(200, {
      success: true,
    });
  } catch (error) {
    console.error("admin-recovery function error:", error);
    return jsonResponse(500, {
      success: false,
      ...messages.INTERNAL_ERROR,
    });
  }
});
