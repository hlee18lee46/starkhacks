import { NextRequest } from "next/server";

// This is a global variable (in-memory) to track the event
let eventTrigger: any = null;

export async function GET(req: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Keep connection open
  const interval = setInterval(() => {
    if (eventTrigger) {
      writer.write(encoder.encode(`data: ${JSON.stringify(eventTrigger)}\n\n`));
      eventTrigger = null; // Reset after sending
    }
  }, 100);

  req.signal.onabort = () => clearInterval(interval);

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  eventTrigger = body; // Set the trigger (e.g., { action: 'capture' })
  return Response.json({ ok: true });
}