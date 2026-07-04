import { authHeader } from "./authApi";

import API_URL from "./api";

async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      response.ok
        ? "Server returned an unexpected response instead of JSON."
        : `Server error ${response.status}: the endpoint may not be deployed yet.`
    );
  }
}

export async function createReferral(
  referral: any
) {
  const response =
    await fetch(
      `${API_URL}/referrals`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(
          referral
        ),
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    const error: any = new Error(
      data.message
    );

    error.existingDraftId = data.existingDraftId;

    throw error;
  }

  return data;
}

export async function getReferrals() {
  const response =
    await fetch(
      `${API_URL}/referrals`
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getReferralById(
  id: number | string
) {
  const response =
    await fetch(
      `${API_URL}/referrals/${id}`,
      {
        headers: {
          ...authHeader(),
        },
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    const err: any = new Error(data.message);
    err.status = response.status;
    throw err;
  }

  return data;
}

export async function updateReferralStatus(
  id: number | string,
  workflowStatus: string
) {
  const response =
    await fetch(
      `${API_URL}/referrals/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({
          workflowStatus,
        }),
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getHospitalQueue() {
  const response = await fetch(
    `${API_URL}/referrals/hospital-queue`,
    { headers: { ...authHeader() } }
  );

  const data = await safeJson(response);

  if (!response.ok) throw new Error(data.message);

  return data;
}

export async function markArrived(id: number | string, note?: string) {
  const response = await fetch(
    `${API_URL}/referrals/${id}/arrive`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ note }),
    }
  );

  const data = await safeJson(response);

  if (!response.ok) throw new Error(data.message);

  return data;
}

export async function saveInternalNotes(id: number | string, notes: string) {
  const response = await fetch(
    `${API_URL}/referrals/${id}/internal-notes`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ notes }),
    }
  );

  const data = await safeJson(response);

  if (!response.ok) throw new Error(data.message);

  return data;
}

export async function getReferralEvents(id: number | string) {
  const response = await fetch(
    `${API_URL}/referrals/${id}/events`,
    { headers: { ...authHeader() } }
  );

  const data = await safeJson(response);

  if (!response.ok) throw new Error(data.message);

  return data;
}

export async function getReferralByNumber(
  referralNumber: string
) {
  const response =
    await fetch(
      `${API_URL}/referrals/by-number/${encodeURIComponent(referralNumber)}`,
      {
        headers: {
          ...authHeader(),
        },
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function sendSmsNotify(
  referralId: number | string,
  phone: string,
  message: string
) {
  const response =
    await fetch(
      `${API_URL}/referrals/${referralId}/notify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ phone, message }),
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getPendingReferrals() {
  const response =
    await fetch(
      `${API_URL}/referrals/pending`,
      {
        headers: {
          ...authHeader(),
        },
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getReferralsBySource() {
  const response =
    await fetch(
      `${API_URL}/referrals/by-source`,
      {
        headers: {
          ...authHeader(),
        },
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getFacilityStats() {
  const response =
    await fetch(
      `${API_URL}/referrals/stats`,
      {
        headers: {
          ...authHeader(),
        },
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function rejectReferral(id: number | string, rejectionReason: string) {
  const response = await fetch(`${API_URL}/referrals/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ workflowStatus: "Rejected", rejectionReason }),
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data.message);
  return data;
}

export async function submitReferralFeedback(
  id: number | string,
  treatmentStatus: string,
  hospitalNotes: string
) {
  const response = await fetch(`${API_URL}/referrals/${id}/close`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ treatmentStatus, hospitalNotes }),
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data.message);
  return data;
}

export async function receiveOfflineReferral(payload: {
  referralNumber: string;
  patientName?: string;
  patientPhone?: string;
  patientGender?: string;
  patientAge?: string;
  chiefComplaint?: string;
  diagnosis: string;
  urgency?: string;
  referringFacility?: string;
  sourceFacilityId?: number | string;
  referralDate?: string;
}) {
  const response = await fetch(`${API_URL}/referrals/receive-offline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data.message);
  return data;
}

export async function closeReferral(
  id: number | string,
  treatmentStatus?: string,
  hospitalNotes?: string
) {
  const body: Record<string, string> = {};
  if (treatmentStatus) body.treatmentStatus = treatmentStatus;
  if (hospitalNotes) body.hospitalNotes = hospitalNotes;

  const response =
    await fetch(
      `${API_URL}/referrals/${id}/close`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(body),
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

