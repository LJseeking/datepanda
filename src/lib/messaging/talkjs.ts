const SYSTEM_USER_ID = "system-kiko";

function getApiHeaders(secretKey: string) {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
    };
}

/**
 * Upsert a user in TalkJS (idempotent)
 */
async function ensureTalkJsUser(appId: string, secretKey: string, user: { id: string; name: string; photoUrl?: string; role?: string }) {
    const res = await fetch(`https://api.talkjs.com/v1/${appId}/users/${user.id}`, {
        method: "PUT",
        headers: getApiHeaders(secretKey),
        body: JSON.stringify({
            name: user.name,
            photoUrl: user.photoUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.id}`,
            role: user.role || "default"
        })
    });
    if (!res.ok) {
        console.error(`[TalkJS] Failed to upsert user ${user.id}:`, res.status, await res.text());
        return false;
    }
    return true;
}

/**
 * Create/update a TalkJS conversation and add participants
 */
export async function ensureTalkJsConversation(
    conversationId: string,
    userA: { id: string; name: string; photoUrl?: string },
    userB: { id: string; name: string; photoUrl?: string }
) {
    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
    const secretKey = process.env.TALKJS_SECRET_KEY;

    if (!appId || !secretKey) {
        console.warn("[TalkJS] Missing API keys. Skipping conversation creation.");
        return false;
    }

    try {
        // 1. Upsert both users in TalkJS
        await Promise.all([
            ensureTalkJsUser(appId, secretKey, userA),
            ensureTalkJsUser(appId, secretKey, userB),
        ]);

        // 2. Create or update the conversation
        const convRes = await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}`, {
            method: "PUT",
            headers: getApiHeaders(secretKey),
            body: JSON.stringify({
                participants: [userA.id, userB.id],
                subject: "DatePanda 匹配聊天",
                custom: { source: "datepanda-matching" },
            })
        });
        if (!convRes.ok) {
            console.error("[TalkJS] Failed to create conversation:", convRes.status, await convRes.text());
            return false;
        }

        // 3. Ensure both are added as participants (belt-and-suspenders)
        await Promise.all([
            fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/participants/${userA.id}`, {
                method: "PUT",
                headers: getApiHeaders(secretKey),
                body: JSON.stringify({ notify: true })
            }),
            fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/participants/${userB.id}`, {
                method: "PUT",
                headers: getApiHeaders(secretKey),
                body: JSON.stringify({ notify: true })
            })
        ]);

        console.log(`[TalkJS] Conversation ${conversationId} created with users ${userA.id} & ${userB.id}`);
        return true;
    } catch (err) {
        console.error("[TalkJS] ensureTalkJsConversation error:", err);
        return false;
    }
}


/**
 * Send a system message (e.g. AI icebreaker) into a conversation
 */
export async function sendTalkJsSystemMessage(conversationId: string, content: string) {
    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
    const secretKey = process.env.TALKJS_SECRET_KEY;

    if (!appId || !secretKey) {
        console.warn("[TalkJS] Missing API keys. Skipping system message push.");
        return false;
    }

    try {
        // 1. Ensure the Kiko System User exists in TalkJS first (Idempotent upsert)
        await ensureTalkJsUser(appId, secretKey, {
            id: SYSTEM_USER_ID,
            name: "Kiko (熊猫助手)",
            photoUrl: "https://files.oaiusercontent.com/file-K1Fv5c4Z8b3H6Y2N9M7V5X?se=2024-05-18T05%3A36%3A51Z&sp=r&sv=2023-11-03&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3D23f03b22-83b5-4a25-a740-1ec62e1050e0.webp&sig=BqQ9C042u7N8kH5N1%2By1m5W6G8Z9X2F5J8k6V3B9N1A%3D", // Cute 3D Panda Avatar
            role: "system"
        });

        // 2. Post the Icebreaker Message into the specific conversation
        const messageRes = await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: getApiHeaders(secretKey),
            body: JSON.stringify([
                {
                    text: content,
                    sender: SYSTEM_USER_ID,
                    type: "SystemMessage",
                    custom: { isIcebreaker: "true" }
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

/**
 * Ensure a default 1-on-1 welcome conversation with Kiko exists for the user.
 * This guarantees the user's Inbox is never empty, allowing them to see the typing input.
 */
export async function ensureKikoWelcomeConversation(user: { id: string; name: string; photoUrl?: string }) {
    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
    const secretKey = process.env.TALKJS_SECRET_KEY;

    if (!appId || !secretKey) {
        console.warn("[TalkJS] Missing API keys. Skipping Kiko welcome conversation creation.");
        return false;
    }

    const conversationId = `welcome_kiko_${user.id}`;

    try {
        // 1. Upsert both users (Kiko and the actual user)
        await Promise.all([
            ensureTalkJsUser(appId, secretKey, {
                id: SYSTEM_USER_ID,
                name: "Kiko (熊猫助手)",
                photoUrl: "https://files.oaiusercontent.com/file-K1Fv5c4Z8b3H6Y2N9M7V5X?se=2024-05-18T05%3A36%3A51Z&sp=r&sv=2023-11-03&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3D23f03b22-83b5-4a25-a740-1ec62e1050e0.webp&sig=BqQ9C042u7N8kH5N1%2By1m5W6G8Z9X2F5J8k6V3B9N1A%3D", // Cute 3D Panda Avatar
                role: "system"
            }),
            ensureTalkJsUser(appId, secretKey, user)
        ]);

        // 2. Create the conversation
        const convRes = await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}`, {
            method: "PUT",
            headers: getApiHeaders(secretKey),
            body: JSON.stringify({
                participants: [SYSTEM_USER_ID, user.id],
                subject: "✨ 和 Kiko 聊聊",
                custom: { category: "support", kikoWelcome: "true" }
            })
        });

        if (!convRes.ok) {
            console.error("[TalkJS] Failed to create Kiko welcome conversation:", convRes.status, await convRes.text());
            return false;
        }

        // 3. Ensure they are participants
        await Promise.all([
            fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/participants/${SYSTEM_USER_ID}`, {
                method: "PUT",
                headers: getApiHeaders(secretKey),
                body: JSON.stringify({ notify: false })
            }),
            fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/participants/${user.id}`, {
                method: "PUT",
                headers: getApiHeaders(secretKey),
                body: JSON.stringify({ notify: true })
            })
        ]);

        // 4. Send the initial welcome message from Kiko (only if the conversation is brand new, TalkJS doesn't error on repeats but might duplicate messages if we don't track. For now we will check if there are existing messages to avoid spamming).
        const historyRes = await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/messages`, {
            headers: getApiHeaders(secretKey)
        });

        if (historyRes.ok) {
            const history = await historyRes.json();
            if (history.data && history.data.length === 0) {
                await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/messages`, {
                    method: "POST",
                    headers: getApiHeaders(secretKey),
                    body: JSON.stringify([
                        {
                            text: "🐼 嗨！我是 Kiko，你的专属约会助手。在这里，你可以随时向我提问、反馈问题，或者只是无聊时找我聊聊天~ 祝你在 DatePanda 遇见对的人！",
                            sender: SYSTEM_USER_ID,
                            type: "UserMessage" // Real message so it shows in the chat naturally
                        }
                    ])
                });
            }
        }

        return true;
    } catch (err) {
        console.error("[TalkJS] ensureKikoWelcomeConversation Error:", err);
        return false;
    }
}

/**
 * Send a direct reply from Kiko (or another system user) as a normal UserMessage
 */
export async function sendTalkJsReply(conversationId: string, text: string, senderId: string = SYSTEM_USER_ID) {
    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
    const secretKey = process.env.TALKJS_SECRET_KEY;

    if (!appId || !secretKey) {
        console.warn("[TalkJS] Missing API keys. Skipping system reply push.");
        return false;
    }

    try {
        const messageRes = await fetch(`https://api.talkjs.com/v1/${appId}/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: getApiHeaders(secretKey),
            body: JSON.stringify([
                {
                    text: text,
                    sender: senderId,
                    type: "UserMessage" // Must be UserMessage to feel like a real chat participant
                }
            ])
        });

        if (!messageRes.ok) {
            console.error("[TalkJS Reply Post Failed]", await messageRes.text());
            return false;
        }

        return true;
    } catch (err) {
        console.error("[TalkJS Network Error]", err);
        return false;
    }
}
