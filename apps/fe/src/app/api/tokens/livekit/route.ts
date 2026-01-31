import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  const requestId = crypto.randomUUID();

  if (!room) {
    console.warn("[livekit-token] missing room", { requestId });
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  } else if (!username) {
    console.warn("[livekit-token] missing username", { requestId, room });
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    console.error("[livekit-token] missing env", {
      requestId,
      hasApiKey: Boolean(apiKey),
      hasApiSecret: Boolean(apiSecret),
      hasWsUrl: Boolean(wsUrl),
    });
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, { identity: username });
    at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    console.info("[livekit-token] token issued", { requestId, room });
    return NextResponse.json({ token });
  } catch (error) {
    console.error("[livekit-token] failed to issue token", {
      requestId,
      room,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return NextResponse.json({ error: 'Failed to issue token', requestId }, { status: 500 });
  }
}
