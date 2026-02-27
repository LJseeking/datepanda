import { NextRequest, NextResponse } from "next/server";
import { generateKikoReply } from "@/lib/ai/deepseek";
import { sendTalkJsReply } from "@/lib/messaging/talkjs";

// TalkJS webhooks are POST requests
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Check if this is a message.sent event
        if (body.type !== "message.sent") {
            // Acknowledge other events but do nothing
            return NextResponse.json({ received: true });
        }

        const data = body.data;
        const message = data.message;
        const conversationId = data.conversation.id;
        const senderId = message.senderId;

        // 1. We ONLY want to reply if the message is sent TO Kiko.
        // We can check if "system-kiko" is a participant in this conversation
        // and if the message was NOT sent by "system-kiko" itself (to avoid infinite loops).

        // Wait, the webhook payload includes participants map. Let's check it.
        const participants = data.conversation.participants;
        if (!participants || !participants["system-kiko"]) {
            // Kiko is not in this conversation, ignore
            return NextResponse.json({ received: true, ignored: "kiko_not_in_chat" });
        }

        if (senderId === "system-kiko") {
            // Don't reply to our own messages!
            return NextResponse.json({ received: true, ignored: "own_message" });
        }

        if (message.type === "SystemMessage") {
            // Don't reply to system notifications
            return NextResponse.json({ received: true, ignored: "system_message" });
        }

        // 2. We should respond asynchronously to let TalkJS know we received it quickly.
        // But since Next.js serverless functions might die if we return immediately,
        // we will await the Deepseek call. We must return within 5-10 seconds to avoid TalkJS timeouts.
        const userText = message.text;

        // Optionally, if we had conversation history, we could pass it. 
        // For V1, we'll just use the single message for stateless replies,
        // as fetching history requires another API call and adds latency.
        console.log(`[TalkJS Webhook] Received message for Kiko in ${conversationId}: ${userText.substring(0, 30)}...`);

        // Generate reply
        const kikoReplyText = await generateKikoReply(userText, []);

        // Send it back via TalkJS API
        const success = await sendTalkJsReply(conversationId, kikoReplyText, "system-kiko");

        if (success) {
            console.log(`[TalkJS Webhook] Successfully sent Kiko reply to ${conversationId}`);
        } else {
            console.error(`[TalkJS Webhook] Failed to send Kiko reply to ${conversationId}`);
        }

        return NextResponse.json({ received: true, replied: success });

    } catch (error) {
        console.error("[TalkJS Webhook Error]", error);
        // Always return 200 to TalkJS to prevent rapid retries for unhandled errors
        return NextResponse.json({ received: true, error: "internal_error" });
    }
}
