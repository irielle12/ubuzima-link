import API_URL from "./api";

export async function getReferralEvents(
  id: number | string
) {

  const response =
    await fetch(
      `${API_URL}/referrals/${id}/events`
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data.message
    );

  }

  return data;

}

export async function createReferralEvent(
  id: number | string,
  eventType: string,
  description: string
) {

  const response =
    await fetch(
      `${API_URL}/referrals/${id}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          eventType,
          description,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data.message
    );

  }

  return data;

}