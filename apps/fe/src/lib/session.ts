import { headers } from "next/headers";

export type SessionData = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    activeOrganizationId?: string | null;
  };
} | null;

export async function getSession(): Promise<SessionData> {
  const headersList = await headers();
  const cookie = headersList.get("cookie") || "";

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  try {
    const response = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as SessionData;
  } catch {
    return null;
  }
}
