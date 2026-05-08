// ============================================
// Central API Client for Release Module
// Aligned with .NET 8 Backend (Private + Public Proxy)
// ============================================

const API_BASE = import.meta.env.DEV
  ? "/api"
  : "/api";

// ── Types ──────────────────────────────────

export interface LoginRequest {
  empCode: string;
  password: string;
}

export interface LoginData {
  empCode: number;
  empName: string;
  stepOrder?: number;
  roleStatus?: string;
  approvals?: { stepOrder: number; roleStatus: string }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  fullError?: string;
}

export interface CrfDetails {
  projectName: string;
  description: string;
  status: string;
  targetDate: string;
  qaStatus: string;
}

/** Shape returned by GET Recommendation / Verify / Approve / Released */
export interface PendingRequestItem {
  crfId: number;
  /** Revert endpoints return ticketId instead of crfId */
  ticketId?: number;
  projectName: string;
  description: string;
  crfStatus: string;
  targetDate: string;
  qaStatus: string;
  subject: string;
  changesToBeMade: string;
  publishPath: string;
  commitId: string;
  reasonForExpedite: string;
  requirementType: string;
  mobileNo?: string;
  mobileNumber?: string;
  userName?: string;
  // Assignment / Lock fields (from release dashboard)
  assignedTo?: string;
  assignedDate?: string;
  isMyInProgress?: boolean;
  dbAssignedTo?: string;
  appAssignedTo?: string;
  dbAssignedName?: string;
  appAssignedName?: string;
  revertDbAssignedTo?: string;
  revertAppAssignedTo?: string;
  // NOTE: userId is NOT returned by backend GET endpoints.
  userId?: number;

  // Document fields (Base64)
  uatSignoffDocument?: string;
  productionReleaseDocument?: string;
  reqId?: string;
  // Partial release tracking (DUAL releases)
  dbReleasedBy?: string;
  appReleasedBy?: string;
  revertDbReleasedBy?: string;
  revertAppReleasedBy?: string;

  // Comment fields from previous approval steps
  recommenderComment?: string;    // Recommender's comment (visible to Verifier)
  RecommenderComment?: string;    // PascalCase variant (ExpRequest controller)
  verifierComment?: string;       // Verifier's comment (visible to Approver)
  revertComment?: string;         // Requester's revert reason (visible to all revert steps)
}

/** Nested sub-shapes from updated backend flow-details */
interface FlowStep { name: string; date: string; comment: string }

interface NormalFlow {
  recommended: FlowStep;
  approver1: FlowStep;
  approver2: FlowStep;
  dbRelease: FlowStep;
  appRelease: FlowStep;
}

interface RevertFlow {
  revertComment: string;
  revertDate: string;
  revertRecommended: FlowStep;
  revertApprover1: FlowStep;
  revertApprover2: FlowStep;
}

interface ReturnFlowData {
  returnBy: string;
  returnDate: string;
  returnComment: string;
}

/** Raw shape returned by GET flow-details (developer's own request tracker) */
export interface FlowTrackingItemRaw {
  crfId?: number;
  ticketId?: number;
  userId?: number;
  subject?: string;
  status: number;
  createdDate?: string;
  releasedDate: string;
  requestedDate?: string;
  reqId?: string;
  isNormal: boolean;
  isRevert: boolean;
  isReturned: boolean;
  normalFlow: NormalFlow | null;
  revertFlow: RevertFlow | null;
  returnFlow: ReturnFlowData | null;
  uatFileName?: string;
  uatContentType?: string;
  prodFileName?: string;
  prodContentType?: string;
  uatSignoffDoc?: string;
  prodReleaseDoc?: string;
}

/** Flattened shape used by Dashboard components */
export interface FlowTrackingItem {
  crfId: number;
  userId?: number;
  subject?: string;
  status?: number;
  createdDate?: string | null;
  requestedDate?: string | null;
  reqId?: string;
  recommendedBy: string;
  recommendedDate: string | null;
  approver1By: string;
  approver1Date: string | null;
  approver2By: string;
  approver2Date: string | null;
  releasedBy: string;
  releasedDate: string | null;
  returnBy?: string;
  returnDate?: string | null;
  returnComment?: string;
  // Revert flow fields
  revertComment?: string;
  revertDate?: string | null;
  revertRecommendedBy?: string;
  revertRecommendedDate?: string | null;
  revertApprover1By?: string;
  revertApprover1Date?: string | null;
  revertApprover2By?: string;
  revertApprover2Date?: string | null;
}

/** Flatten the new nested backend response into the flat shape the Dashboard uses */
export function flattenFlowItem(raw: FlowTrackingItemRaw): FlowTrackingItem {
  const nf = raw.normalFlow;
  const rf = raw.returnFlow;
  const rv = raw.revertFlow;

  // Pick release name/date from normalFlow ONLY if status = 5 (fully released)
  // For DUAL releases, status stays at 4 until both DB and APP are done
  let releasedBy = "N/A";
  let releasedDate: string | null = null;
  if (raw.status >= 5) {
    releasedDate = raw.releasedDate && raw.releasedDate !== "N/A" ? raw.releasedDate : null;
    if (nf) {
      if (nf.appRelease && nf.appRelease.name !== "N/A") releasedBy = nf.appRelease.name;
      else if (nf.dbRelease && nf.dbRelease.name !== "N/A") releasedBy = nf.dbRelease.name;
      // Also pick date from normalFlow if top-level is missing
      if (!releasedDate) {
        if (nf.appRelease?.date && nf.appRelease.date !== "N/A") releasedDate = nf.appRelease.date;
        else if (nf.dbRelease?.date && nf.dbRelease.date !== "N/A") releasedDate = nf.dbRelease.date;
      }
    }
  }

  return {
    crfId: raw.crfId || raw.ticketId || 0,
    userId: raw.userId,
    subject: raw.subject,
    status: raw.status,
    createdDate: raw.createdDate && raw.createdDate !== "N/A" ? raw.createdDate : null,
    requestedDate: raw.requestedDate && raw.requestedDate !== "N/A" ? raw.requestedDate : null,
    reqId: raw.reqId,
    recommendedBy: nf?.recommended?.name ?? "N/A",
    recommendedDate: nf?.recommended?.date !== "N/A" ? (nf?.recommended?.date ?? null) : null,
    approver1By: nf?.approver1?.name ?? "N/A",
    approver1Date: nf?.approver1?.date !== "N/A" ? (nf?.approver1?.date ?? null) : null,
    approver2By: nf?.approver2?.name ?? "N/A",
    approver2Date: nf?.approver2?.date !== "N/A" ? (nf?.approver2?.date ?? null) : null,
    releasedBy,
    releasedDate,
    returnBy: rf?.returnBy ?? "N/A",
    returnDate: rf?.returnDate !== "N/A" ? (rf?.returnDate ?? null) : null,
    returnComment: rf?.returnComment ?? "",
    // Revert flow
    revertComment: rv?.revertComment ?? "",
    revertDate: rv?.revertDate !== "N/A" ? (rv?.revertDate ?? null) : null,
    revertRecommendedBy: rv?.revertRecommended?.name ?? "N/A",
    revertRecommendedDate: rv?.revertRecommended?.date !== "N/A" ? (rv?.revertRecommended?.date ?? null) : null,
    revertApprover1By: rv?.revertApprover1?.name ?? "N/A",
    revertApprover1Date: rv?.revertApprover1?.date !== "N/A" ? (rv?.revertApprover1?.date ?? null) : null,
    revertApprover2By: rv?.revertApprover2?.name ?? "N/A",
    revertApprover2Date: rv?.revertApprover2?.date !== "N/A" ? (rv?.revertApprover2?.date ?? null) : null,
  };
}

/** Derive effective status from flow tracking data fields.
 *  Backend status values: 0=Returned, 1=Pending, 2=Recommended,
 *  3=Verified, 4=Approved, 5=Released, 6-10=Revert flow */
export function deriveStatus(item: FlowTrackingItem | PendingRequestItem): number {
  // If backend provides a numeric status directly, use it
  if (typeof (item as any).status === 'number') return (item as any).status;
  if ('crfStatus' in item) {
    if (typeof item.crfStatus === 'string') {
      const s = item.crfStatus.toUpperCase();
      if (s.includes('RETURN')) return 0;
      if (s.includes('PENDING') || s.includes('REQUESTED')) return 1;
      if (s.includes('RECOMMEND')) return 2;
      if (s.includes('VERIF')) return 3;
      if (s.includes('APPROV')) return 4;
      if (s.includes('RELEASE')) return 5;
    }
  }
  return 1;
}

export function getRequirementTypeName(type: number | string | undefined | null): string {
  const t = String(type);
  if (t === "1") return "Database";
  if (t === "2") return "Application";
  if (t === "3") return "Both (DB & App)";
  return t || "N/A";
}

// ── HTTP Helper ────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || `HTTP ${response.status}`,
        data: data?.data,
        fullError: data?.fullError,
      };
    }

    // Auto-unwrap double-wrapped responses from the public API proxy.
    if (
      data?.data &&
      typeof data.data === "object" &&
      "success" in data.data &&
      "message" in data.data
    ) {
      return data.data;
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ── Auth ───────────────────────────────────

/** Backend now returns the actual RoleStatus from TBL_REQUEST_APPROVALS */
function computeRoleStatus(stepOrder: number): string {
  switch (stepOrder) {
    case 1: return "Recommender";
    case 2: return "Verifier";
    case 3: return "Approver";
    case 4: return "Release";
    default: return "Developer";
  }
}

/**
 * Map roleStatus string to stepOrder when backend returns stepOrder=null.
 * TL -> 1 (Recommender), SPM -> 2 (Verifier). Other roles keep their numeric stepOrder.
 */
export function roleStatusToStep(roleStatus?: string | null): number | null {
  if (!roleStatus) return null;
  const map: Record<string, number> = {
    "TL": 1,
    "SPM": 2,
  };
  return map[roleStatus.toUpperCase()] ?? null;
}

export const auth = {
  login: (creds: LoginRequest) =>
    apiFetch<LoginData>("/ExpRequest/Login", {
      method: "POST",
      body: JSON.stringify({
        empCode: creds.empCode,
        password: creds.password,
      }),
    }),

  saveSession: (data: LoginData) => {
    sessionStorage.setItem("empCode", String(data.empCode ?? ""));
    sessionStorage.setItem("empName", data.empName ?? "");
    // Extract stepOrder & roleStatus from approvals array (new format)
    // Falls back to top-level fields for backward compatibility
    const firstApproval = data.approvals?.[0];
    const rawStep = firstApproval?.stepOrder ?? data.stepOrder;
    const roleStatus = firstApproval?.roleStatus ?? data.roleStatus ?? "";
    // If stepOrder is null but roleStatus is TL/SPM, derive the step from roleStatus
    const stepOrder = rawStep ?? roleStatusToStep(roleStatus) ?? 0;
    sessionStorage.setItem("stepOrder", String(stepOrder));
    const role = roleStatus || computeRoleStatus(stepOrder);
    sessionStorage.setItem("roleStatus", role);
    sessionStorage.setItem("isLoggedIn", "true");
  },

  getSession: () => ({
    empCode: sessionStorage.getItem("empCode") || "",
    empName: sessionStorage.getItem("empName") || "",
    stepOrder: parseInt(sessionStorage.getItem("stepOrder") || "0"),
    roleStatus: sessionStorage.getItem("roleStatus") || "",
    isLoggedIn: sessionStorage.getItem("isLoggedIn") === "true",
  }),

  logout: () => {
    // Keep push subscription alive so notifications work after sign-out
    sessionStorage.clear();
  },
};

// ── Push Notifications ─────────────────────────

export const pushNotifications = {
  /**
   * Register service worker and subscribe to push notifications
   */
  subscribe: async (empCode: number) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Service Worker or PushManager not supported');
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission:', permission);
      if (permission !== 'granted') {
        return;
      }

      // Register the service worker (use Vite base URL so it works in all environments)
      console.log('[Push] Registering SW at:', `${import.meta.env.BASE_URL}sw.js`);
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      console.log('[Push] SW registered, waiting for ready...');
      await navigator.serviceWorker.ready;
      console.log('[Push] SW ready');

      // Get the VAPID public key from backend
      const vapidRes = await apiFetch<{ publicKey: string }>('/PushNotification/vapid-public-key');
      // Handle both direct and proxy-wrapped responses
      const publicKey = (vapidRes as any).publicKey
        || vapidRes.data?.publicKey
        || (vapidRes.data as any)?.publicKey;
      console.log('[Push] VAPID response:', vapidRes, '| publicKey:', publicKey);
      if (!publicKey) {
        console.warn('[Push] VAPID key fetch failed');
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      console.log('[Push] Browser subscription created');

      const keys = subscription.toJSON();

      // Build a more unique device identifier for multi-device support
      const deviceInfo = `${navigator.userAgent} | ${screen.width}x${screen.height} | ${navigator.platform || 'unknown'}`;

      // Send subscription to backend
      const saveRes = await apiFetch('/PushNotification/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          empCode,
          endpoint: subscription.endpoint,
          p256dh: keys.keys?.p256dh || '',
          auth: keys.keys?.auth || '',
          deviceInfo,
        }),
      });
      console.log('[Push] Subscription saved to backend:', saveRes);

    } catch (err) {
      console.error('[Push] Subscription failed:', err);
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: async (empCode: number) => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      // Notify backend
      await apiFetch('/PushNotification/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({
          empCode,
          endpoint: subscription.endpoint,
        }),
      });

      // Unsubscribe locally
      await subscription.unsubscribe();
    } catch {
      // Push unsubscribe failed — non-blocking
    }
  },

  /**
   * Clear the badge count on the installed app icon
   */
  clearBadge: async () => {
    try {
      // Clear via Badging API
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge();
      }
      // Tell service worker to reset its counter
      const reg = await navigator.serviceWorker?.getRegistration();
      reg?.active?.postMessage({ type: 'CLEAR_BADGE' });
    } catch (err) {
      // Badge API not supported — no-op
    }
  },
};


// ── CRF Lookup ─────────────────────────────

export const crf = {
  /** Backend uses query param: /api/ExpRequest/GetCrfDetails?crfId=X */
  getDetails: (crfId: number) =>
    apiFetch<CrfDetails>(`/ExpRequest/GetCrfDetails?crfId=${crfId}`),
};

// ── EXP Request ────────────────────────────

export const expRequest = {
  create: (formData: FormData) =>
    apiFetch<number>("/ExpRequest/create-exp-request", {
      method: "POST",
      body: formData,
    }),
  getSchemas: () =>
    apiFetch<{ schemaName: string }[]>("/ExpRequest/schema-details"),
};

// ── Ticket / CAB Lookup Types ──────────────

/** Ticket details (EXP ticket lookup — no release date) */
export interface TicketDetailsResponse {
  createdDate: string;
  descIssue: string;
  problemDesc: string;
  status: string;
}

/** CAB CRF lookup — includes next release date/day */
export interface CabCrfDetailsResponse {
  projectName: string;
  description: string;
  status: string;
  targetDate: string;
  qaStatus: string;
  nextReleaseDay: string;
  nextReleaseDate: string;
}

/** CAB Ticket lookup — includes next release date/day */
export interface CabTicketDetailsResponse {
  createdDate: string;
  descIssue: string;
  problemDesc: string;
  status: string;
  nextReleaseDay: string;
  nextReleaseDate: string;
}

// ── CAB / Ticket Request ───────────────────

export const cabRequest = {
  /** CAB CRF lookup (requires CRF status=15, returns release schedule) */
  getCabCrfDetails: (crfId: number) =>
    apiFetch<CabCrfDetailsResponse>(`/CabRequest/GetCabCrfDetails?crfId=${crfId}`),

  /** CAB Ticket lookup (returns release schedule) */
  getCabTicketDetails: (ticketId: number) =>
    apiFetch<CabTicketDetailsResponse>(`/CabRequest/GetCabTicketDetails?ticketId=${ticketId}`),

  /** EXP Ticket lookup (no release schedule) */
  getTicketDetails: (ticketId: number) =>
    apiFetch<TicketDetailsResponse>(`/CabRequest/TicketDetails?ticketId=${ticketId}`),

  /** Create CAB CRF request */
  createCabCrfRequest: (formData: FormData) =>
    apiFetch<number>("/CabRequest/create-cab-request", {
      method: "POST",
      body: formData,
    }),

  /** Create CAB/EXP Ticket request (set CabExp="CAB" or "EXP" in FormData) */
  createTicketRequest: (formData: FormData) =>
    apiFetch<number>("/CabRequest/create-cabexpticket-request", {
      method: "POST",
      body: formData,
    }),
};

// ── Dashboard Data (role-based GET endpoints) ──

export const dashboard = {
  /** Step 1 — items pending recommendation */
  getRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/Recommendation?empCode=${empCode}`),

  /** Step 2 — items pending verification */
  getVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/Verify?empCode=${empCode}`),

  /** Step 3 — items pending approval */
  getApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/Approve?empCode=${empCode}`),

  /** Step 4 — items approved, pending release */
  getReleased: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/Released?empCode=${empCode}`),

  /** Developer's own request tracking (flow timeline) */
  getFlowDetails: (empCode: number) =>
    apiFetch<FlowTrackingItemRaw[]>(`/ExpRequest/flow-details?empCode=${empCode}`),

  getCabFlowDetails: (empCode: number) =>
    apiFetch<FlowTrackingItemRaw[]>(`/CabRequest/flow-details?empCode=${empCode}`),

  getCabTicketFlowDetails: (empCode: number) =>
    apiFetch<FlowTrackingItemRaw[]>(`/CabTicketRequest/flow-details?empCode=${empCode}`),

  // ── Dashboard EXP Ticket Endpoints (Housed in CabRequestController) ──
  getExpTicketRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/Recommendation?empCode=${empCode}`),
  getExpTicketVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/TicketVerify?empCode=${empCode}`),
  getExpTicketApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/TicketApprove?empCode=${empCode}`),
  getExpTicketReleased: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/TicketReleased?empCode=${empCode}`),

  // ── Dashboard CAB Ticket Endpoints ──
  getCabTicketRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/Recommendation?empCode=${empCode}`),
  getCabTicketVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/TicketVerify?empCode=${empCode}`),
  getCabTicketApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/TicketApprove?empCode=${empCode}`),
  getCabTicketReleased: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/TicketReleased?empCode=${empCode}`),

  // ── Dashboard CAB CRF Endpoints ──
  getCabCrfRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/CabCrfRecommendation?empCode=${empCode}`),
  getCabCrfVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/CabCrfVerify?empCode=${empCode}`),
  getCabCrfApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/CabCrfApprove?empCode=${empCode}`),
  getCabCrfReleased: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabRequest/CabCrfReleased?empCode=${empCode}`),

  // ── Revert Dashboard Endpoints (EXP CRF) ──
  // Backend: CrfCabExpRevertController (queries ExpRequests table)
  getRevertRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/ExpRevertRecommendation?empCode=${empCode}`),
  getRevertVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/RevertVerify?empCode=${empCode}`),
  getRevertApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/GetRevertApprove?empCode=${empCode}`),
  getRevertRelease: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/RevertReleased?empCode=${empCode}`),

  // ── Revert Dashboard Endpoints (EXP Ticket) ──
  // Backend: ExpRequestController (queries TicketRequests table, CabExp="EXP")
  getExpTicketRevertRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/GetRevertRecommendation?empCode=${empCode}`),
  getExpTicketRevertVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/RevertVerify?empCode=${empCode}`),
  getExpTicketRevertApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/RevertApproved?empCode=${empCode}`),
  getExpTicketRevertRelease: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/ExpRequest/RevertReleased?empCode=${empCode}`),

  // ── Revert Dashboard Endpoints (CAB CRF) ──
  // Backend: CrfCabExpRevertController (queries CabRequests table)
  getCabRevertRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/CabRevertRecommendation?empCode=${empCode}`),
  getCabRevertVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/CabRevertVerify?empCode=${empCode}`),
  getCabRevertApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/GetCabRevertApprove?empCode=${empCode}`),
  getCabRevertRelease: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CrfCabExpRevert/RevertCabReleased?empCode=${empCode}`),

  // ── Revert Dashboard Endpoints (CAB Ticket) ──
  // Backend: CabTicketRequestController (queries TicketRequests table, CabExp="CAB")
  getCabTicketRevertRecommendation: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/GetRevertRecommendation?empCode=${empCode}`),
  getCabTicketRevertVerify: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/RevertVerify?empCode=${empCode}`),
  getCabTicketRevertApprove: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/RevertApproved?empCode=${empCode}`),
  getCabTicketRevertRelease: (empCode: string) =>
    apiFetch<PendingRequestItem[]>(`/CabTicketRequest/RevertReleased?empCode=${empCode}`),

  // ── Upcoming Release Endpoints (items still in approval pipeline) ──
  // Unified endpoint (used by deployed backend)
  getUpcomingReleased: () =>
    apiFetch<any[]>(`/ExpReport/GetUpcomingReleased`),
  // Per-type endpoints (UpcomingReleaseController — requires empCode)
  getUpcomingExpCrf: (empCode: string) =>
    apiFetch<any[]>(`/UpcomingRelease/UpcomingReleased?empCode=${empCode}`),
  getUpcomingCabCrf: (empCode: string) =>
    apiFetch<any[]>(`/UpcomingRelease/UpcomingCabCrfReleased?empCode=${empCode}`),
  getUpcomingExpTicket: (empCode: string) =>
    apiFetch<any[]>(`/UpcomingRelease/UpcomingExpTicketReleased?empCode=${empCode}`),
  getUpcomingCabTicket: (empCode: string) =>
    apiFetch<any[]>(`/UpcomingRelease/UpcomingCabTicketReleased?empCode=${empCode}`),

  // ── Reports Endpoints ──
  getExpReport: (status: number, userId: number | string, fromDate?: string, toDate?: string) => {
    let url = `/ExpReport/GetReport?status=${status}&userId=${userId}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return apiFetch<any>(url);
  },

  getCabReport: (status: number, userId: number | string, fromDate?: string, toDate?: string) => {
    let url = `/ExpReport/GetCabReport?status=${status}&userId=${userId}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return apiFetch<any>(url);
  },

  getTicketReport: (status: number, userId: number | string, fromDate?: string, toDate?: string) => {
    let url = `/ExpReport/GetTicketReport?status=${status}&userId=${userId}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return apiFetch<any>(url);
  },

  // ── Release Summary ──
  getReleaseSummary: (empCode: number | string) =>
    apiFetch<any>(`/ExpReport/Release-total?userId=${empCode}`),

  // ── Release Team — All Reports (no user filter) ──
  getAllReport: (fromDate?: string, toDate?: string) => {
    let url = '/ExpReport/GetAllReport';
    const params: string[] = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (params.length) url += '?' + params.join('&');
    return apiFetch<any>(url);
  },
  getAllTicketReport: (fromDate?: string, toDate?: string) => {
    let url = '/ExpReport/GetAllTicketReport';
    const params: string[] = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (params.length) url += '?' + params.join('&');
    return apiFetch<any>(url);
  },

  // ── Celebration ──
  getNewReleases: (empCode: string) =>
    apiFetch<{ crfId: number; subject: string }[]>(`/ExpRequest/GetNewReleases?empCode=${empCode}`),

  getCabNewReleases: (empCode: string) =>
    apiFetch<{ crfId: number; subject: string }[]>(`/CabRequest/GetNewReleases?empCode=${empCode}`),

  getTicketNewReleases: (empCode: string) =>
    apiFetch<{ ticketId: number; subject: string }[]>(`/CabTicketRequest/GetNewReleases?empCode=${empCode}`),

  markCelebrationSeen: (crfIds: number[]) =>
    apiFetch("/ExpRequest/MarkCelebrationSeen", {
      method: "POST",
      body: JSON.stringify({ crfIds }),
    }),

  markCabCelebrationSeen: (crfIds: number[]) =>
    apiFetch("/CabRequest/MarkCelebrationSeen", {
      method: "POST",
      body: JSON.stringify({ crfIds }),
    }),

  markTicketCelebrationSeen: (crfIds: number[]) =>
    apiFetch("/CabTicketRequest/MarkCelebrationSeen", {
      method: "POST",
      body: JSON.stringify({ crfIds }),
    }),

  // ── Search By ID ──
  searchById: (params: { reqId?: string; crfId?: number; ticketId?: number; userId?: string }) => {
    const parts: string[] = [];
    if (params.reqId) parts.push(`reqId=${encodeURIComponent(params.reqId)}`);
    if (params.crfId != null) parts.push(`crfId=${params.crfId}`);
    if (params.ticketId != null) parts.push(`ticketId=${params.ticketId}`);
    if (params.userId) parts.push(`userId=${encodeURIComponent(params.userId)}`);
    return apiFetch<any>(`/ExpReport/search-by-id?${parts.join('&')}`);
  },

  // ── Combined Report (all released) ──
  getCombinedReport: () =>
    apiFetch<any>(`/ExpReport/GetCombinedReport`),
};

// ── Workflow Actions ───────────────────────

export const workflow = {
  recommend: (crfId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/ExpRequest/Recommendation", {
      method: "POST",
      body: JSON.stringify({
        crfId,
        reqId: reqId || '',
        userId,
        recommendedBy,
        recommenderComment: comment,
      }),
    }),

  verify: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/ExpRequest/Verify", {
      method: "POST",
      body: JSON.stringify({
        crfId,
        reqId: reqId || '',
        userId,
        approver1By,
        approver1Comment: comment,
      }),
    }),

  approve: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/ExpRequest/Approve", {
      method: "POST",
      body: JSON.stringify({
        crfId,
        reqId: reqId || '',
        userId,
        approver1By,
        approver1Comment: comment,
      }),
    }),

  release: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/ExpRequest/Release", {
      method: "POST",
      body: JSON.stringify({
        crfId,
        reqId: reqId || '',
        userId,
        approver1By,
        approver1Comment: comment,
      }),
    }),

  returnRequest: (crfId: number, reqId: string | undefined, userId: number, returnBy: string, comment: string) =>
    apiFetch("/ExpRequest/Return", {
      method: "POST",
      body: JSON.stringify({
        crfId,
        reqId: reqId || '',
        userId,
        approver1By: returnBy,
        approver1Comment: comment,
      }),
    }),

  /** Cancel/dismiss a returned request (status 0 → -1, hidden from dashboard) */
  cancelRequest: (crfId: number, reqId: string | undefined, userId: number) =>
    apiFetch("/ExpRequest/CancelRequest", {
      method: "POST",
      body: JSON.stringify({
        crfId,
        reqId: reqId || '',
        userId,
        approver1By: "system",
        approver1Comment: "Cancelled by requester"
      }),
    }),

  /** Lock / auto-assign a release item when viewing details */
  lock: (crfId: number, reqId: string | undefined, userId: number, approver1By: string) =>
    apiFetch("/ReleaseLock/Lock", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By }),
    }),

  /** Submit revert request (status 5 → 6) — EXP Ticket
   *  Backend uses TicketVerifyDto: { ticketId, userId, approver1Comment }
   *  Queries TicketRequests table */
  submitRevert: (ticketId: number, reqId: string | undefined, userId: number, comment: string) =>
    apiFetch("/ExpRequest/SubmitRevert", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By: String(userId), approver1Comment: comment }),
    }),

  /** Submit revert — EXP CRF
   *  Backend uses VerifyDto: { crfId, userId, approver1Comment }
   *  Queries ExpRequests table */
  submitExpCrfRevert: (crfId: number, reqId: string | undefined, userId: number, comment: string) =>
    apiFetch("/CrfCabExpRevert/SubmitRevert", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By: String(userId), approver1Comment: comment }),
    }),

  /** Submit revert — CAB CRF
   *  Backend uses VerifyDto: { crfId, userId, approver1Comment }
   *  Queries CabRequests table */
  submitCabCrfRevert: (crfId: number, reqId: string | undefined, userId: number, comment: string) =>
    apiFetch("/CrfCabExpRevert/CabRevert", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By: String(userId), approver1Comment: comment }),
    }),

  /** Submit revert — CAB Ticket
   *  Backend uses TicketVerifyDto: { ticketId, userId, approver1Comment }
   *  Queries TicketRequests table */
  submitCabTicketRevert: (ticketId: number, reqId: string | undefined, userId: number, comment: string) =>
    apiFetch("/CabTicketRequest/SubmitRevert", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By: String(userId), approver1Comment: comment }),
    }),

  /** Revert recommend (6 → 7)
   *  Backend uses TicketRecommendationDto: { ticketId, userId, recommendedBy, recommenderComment } */
  revertRecommend: (ticketId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/ExpRequest/RevertRecommendation", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, recommendedBy, recommenderComment: comment }),
    }),

  /** Revert verify (7 → 8)
   *  Backend uses TicketVerifyDto: { ticketId, userId, approver1By, approver1Comment } */
  revertVerify: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/ExpRequest/SaveRevertVerify", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),

  /** Revert approve (8 → 9)
   *  Backend uses TicketVerifyDto: { ticketId, userId, approver1By, approver1Comment } */
  revertApprove: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/ExpRequest/RevertApprove", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),

  /** Revert release (9 → 10)
   *  Backend uses TicketVerifyDto: { ticketId, userId, approver1By, approver1Comment } */
  revertRelease: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/ExpRequest/RevertRelease", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),

  // ── EXP CRF REVERT ACTIONS ──
  expCrfRevertRecommend: (crfId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/RevertRecommendation", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, recommendedBy, recommenderComment: comment }),
    }),
  expCrfRevertVerify: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/SaveRevertVerify", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  expCrfRevertApprove: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/RevertApprove", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  expCrfRevertRelease: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/RevertRelease", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
};

// ── CAB Workflow Actions ───────────────────

export const cabWorkflow = {
  // ── CAB CRF (uses crfId, RecommendationDto / VerifyDto) ──
  cabCrfRecommend: (crfId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/CabRequest/CabCrfRecommendation", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, recommendedBy, recommenderComment: comment }),
    }),
  cabCrfVerify: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/CabCrfVerify", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabCrfApprove: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/CabCrfApprove", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabCrfRelease: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/CabCrfRelease", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabCrfReturn: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/CabCrfReturn", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabLock: (crfId: number, reqId: string | undefined, userId: number, approver1By: string) =>
    apiFetch("/ReleaseLock/CabLock", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By }),
    }),

  // ── CAB Ticket (uses ticketId, TicketRecommendationDto / TicketVerifyDto) ──
  cabTicketRecommend: (ticketId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/CabRequest/Recommendation", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, recommendedBy, recommenderComment: comment }),
    }),
  cabTicketVerify: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/TicketVerify", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabTicketApprove: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/TicketApprove", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabTicketRelease: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/TicketRelease", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabTicketReturn: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabRequest/TicketReturn", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  ticketLock: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string) =>
    apiFetch("/ReleaseLock/TicketLock", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By }),
    }),

  // ── CAB CRF REVERT ACTIONS ──
  cabCrfRevertRecommend: (crfId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/CabRevertRecommendation", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, recommendedBy, recommenderComment: comment }),
    }),
  cabCrfRevertVerify: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/CabRevertVerify", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabCrfRevertApprove: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/RevertCabApprove", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabCrfRevertRelease: (crfId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CrfCabExpRevert/RevertCabRelease", {
      method: "POST",
      body: JSON.stringify({ crfId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),

  // ── CAB TICKET REVERT ACTIONS ──
  cabTicketRevertRecommend: (ticketId: number, reqId: string | undefined, userId: number, recommendedBy: string, comment: string) =>
    apiFetch("/CabTicketRequest/RevertRecommendation", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, recommendedBy, recommenderComment: comment }),
    }),
  cabTicketRevertVerify: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabTicketRequest/SaveRevertVerify", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabTicketRevertApprove: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabTicketRequest/RevertApprove", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
  cabTicketRevertRelease: (ticketId: number, reqId: string | undefined, userId: number, approver1By: string, comment: string) =>
    apiFetch("/CabTicketRequest/RevertRelease", {
      method: "POST",
      body: JSON.stringify({ ticketId, reqId: reqId || '', userId, approver1By, approver1Comment: comment }),
    }),
};

// ── Status Constants (match backend values) ─

export const STATUS = {
  RETURNED: 0,
  CREATED: 1,
  RECOMMENDED: 2,
  VERIFIED: 3,
  APPROVED: 4,
  RELEASED: 5,
  REVERT_REQUEST: 6,
  REVERT_RECOMMENDED: 7,
  REVERT_VERIFIED: 8,
  REVERT_APPROVED: 9,
  REVERT_RELEASED: 10,
} as const;

export const STATUS_LABELS: Record<number, string> = {
  0: "Returned",
  1: "Pending Recommendation",
  2: "Recommended",
  3: "Verified",
  4: "Approved",
  5: "Released",
  6: "Revert Requested",
  7: "Revert Recommended",
  8: "Revert Verified",
  9: "Revert Approved",
  10: "Revert Released",
};

/**
 * Determine which dashboard a user should see based on stepOrder
 */
export function getDashboardRoute(stepOrder: number): string {
  if (stepOrder >= 1 && stepOrder <= 3) return "/Dashboard/Approver";
  if (stepOrder === 4) return "/Dashboard/Release";
  return "/Dashboard/Index";
}

/**
 * Calculate time ago string
 */
/**
 * Parse "dd-MM-yyyy HH:mm" or "dd-MM-yyyy HH:mm:ss" format from backend.
 * Falls back to native Date parsing for ISO format strings.
 */
export function parseDateString(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, day, month, year, hour, min, sec] = m;
    return new Date(+year, +month - 1, +day, +hour, +min, +(sec || 0));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const parsed = parseDateString(dateStr);
  if (!parsed) return "";
  const diff = Date.now() - parsed.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} mins ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/**
 * Get next Monday or Thursday for CAB scheduling
 */
export function getNextCabDate(): Date {
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const next = new Date(now);
    next.setDate(now.getDate() + i);
    const day = next.getDay();
    if (day === 1 || day === 4) return next;
  }
  return now;
}
