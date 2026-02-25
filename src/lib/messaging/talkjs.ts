export async function sendTalkJsSystemMessage(conversationId: string, content: string) {
    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
    const secretKey = process.env.TALKJS_SECRET_KEY;

    if (!appId || !secretKey) {
        console.warn("[TalkJS] Missing API keys. Skipping system message push.");
        return false;
    }

    try {
        // 1. Ensure the Kiko System User exists in TalkJS first (Idempotent upsert)
        const systemUserId = "system-kiko";
        const upsertRes = await fetch(`https://api.talkjs.com/v1/${appId}/users/${systemUserId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${secretKey}`
            },
            body: JSON.stringify({
                name: "Kiko (熊猫助手)",
                email: ["kiko@datepanda.app"],
                photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=kiko",
                welcomeMessage: "我是一只懂心理学的熊猫红娘！",
                role: "system"
            })
        });

        if (!upsertRes.ok) {
            console.error("[TalkJS System User Setup Failed]", upsertRes.status);
            return false;
        }

        // 2. Post the Icebreaker Message into the specific conversation
        // The REST API expects an array of message objects to post
        const messageRes = await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${secretKey}`
            },
            body: JSON.stringify([
                {
                    text: content,
                    sender: systemUserId,
                    type: "SystemMessage",
                    custom: {
                        isIcebreaker: "true"
                    }
                }
            ])
        });

        if (!messageRes.ok) {
            console.error("[TalkJS Message Post Failed]", await messageRes.text());
            return false;
        }

        return true;
    } catch (err) {
        console.error("[TalkJS Network Error]", err);
        return false;
    }
}
