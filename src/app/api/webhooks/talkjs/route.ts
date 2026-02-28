import { NextRequest, NextResponse } from "next/server";
import { generateKikoReply } from "@/lib/ai/deepseek";
import { sendTalkJsReply } from "@/lib/messaging/talkjs";
import crypto from "crypto";

async function handleWebhookBody(body: any): Promise<NextResponse> {
    // Check if this is a message.sent event
    if (body.type !== "message.sent") {
        return NextResponse.json({ received: true });
    }

    const data = body.data;
    const message = data.message;
    const conversationId = data.conversation.id;
    const senderId = message.senderId;

    const participants = data.conversation.participants;
    if (!participants || !participants["system-kiko"]) {
        return NextResponse.json({ received: true, ignored: "kiko_not_in_chat" });
    }

    if (senderId === "system-kiko") {
        return NextResponse.json({ received: true, ignored: "own_message" });
    }

    if (message.type === "SystemMessage") {
        return NextResponse.json({ received: true, ignored: "system_message" });
    }

    const userText = message.text;
    console.log(`[TalkJS Webhook] Received message for Kiko in ${conversationId}: ${userText.substring(0, 30)}...`);

    const kikoReplyText = await generateKikoReply(userText, []);
    const success = await sendTalkJsReply(conversationId, kikoReplyText, "system-kiko");

    if (success) {
        console.log(`[TalkJS Webhook] Successfully sent Kiko reply to ${conversationId}`);
    } else {
        console.error(`[TalkJS Webhook] Failed to send Kiko reply to ${conversationId}`);
    }

    return NextResponse.json({ received: true, replied: success });
}

// TalkJS webhooks are POST requests
export async function POST(req: NextRequest) {
    try {
        // ── Security: Verify TalkJS webhook HMAC-SHA256 signature ────────────
        // TalkJS signs each webhook request. Without this check, anyone can
        // POST to this endpoint and trigger DeepSeek AI calls + message sends.
        // See: https://talkjs.com/docs/Reference/Webhooks/#verifying-webhook-signatures
        const talkjsSignature = req.headers.get("x-talkjs-signature");
        const secretKey = process.env.TALKJS_SECRET_KEY;

        const rawBody = await req.text();

        if (secretKey) {
            const expectedSig = crypto
                .createHmac("sha256", secretKey)
                .update(rawBody)
                .digest("hex");

            if (!talkjsSignature || expectedSig !== talkjsSignature) {
                console.error("[TalkJS Webhook] Invalid or missing signature — possible spoofing attempt");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else {
            // If no secret key is set, log warning but allow (dev only)
            console.warn("[TalkJS Webhook] TALKJS_SECRET_KEY not set — signature verification skipped");
        }

        const body = JSON.parse(rawBody);
        return handleWebhookBody(body);

    } catch (error) {
        console.error("[TalkJS Webhook Error]", error);
        // Always return 200 to TalkJS to prevent rapid retries for unhandled errors
        return NextResponse.json({ received: true, error: "internal_error" });
    }
}
