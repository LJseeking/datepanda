export async function generateIcebreaker(
    reasons: string[],
    userAInfo: { gender: string; mbti?: string },
    userBInfo: { gender: string; mbti?: string }
): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.warn("DEEPSEEK_API_KEY is not set. Falling back to default icebreaker.");
        return "🐼 滴！Kiko 发来贺电：很高兴在茫茫宇宙中看到你们两颗有趣的星球相遇。快跟对方打个招呼吧！";
    }

    const systemPrompt = `你是 DatePanda 的虚拟红娘“Kiko”，一只懂心理学、语气俏皮活泼、像人类好朋友一样的熊猫。
当前场景：两个互不认识的年轻人在社交软件上刚刚完成了“互相心动并愿意见面”的配对操作，他们即将开始第一句话的聊天，但不知道怎么破冰。

你的任务：
根据以下算法提供的“双方高契合度/共鸣点标签”以及基础信息，给他们写一句简短的“破冰引导语”。
要求：
1. 语气活泼、自然，不要像刻板的机器客服。必须带一两个 emoji。
2. 长度控制在 60 个中文字符以内。一两句话即可。
3. 绝对不要提到“算法分数”、“契合度高达百分之几”这类冷冰冰的教条词汇。
4. 用一句陈述点出两人的共鸣点，然后用一个轻松的开放式问题结尾，引导他们开始聊天。
5. 不要加引号，直接输出文案本身。`;

    const userPrompt = `
User A 基础信息: 性别 ${userAInfo.gender || '未知'}, MBTI: ${userAInfo.mbti || '未知'}
User B 基础信息: 性别 ${userBInfo.gender || '未知'}, MBTI: ${userBInfo.mbti || '未知'}
系统底层算法在他们身上发现的共识/共鸣点 (Reasons):
${reasons.map(r => "- " + r).join("\n")}
`;

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // V3 general model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            console.error("[DeepSeek API] Status:", response.status, await response.text());
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (content) {
            return `🐼 ${content}`;
        }
        throw new Error("Empty response from DeepSeek");

    } catch (error) {
        console.error("[Kiko Icebreaker Gen Error]", error);
        return "🐼 滴！Kiko 发现你们的灵魂电波高度重合✨！从一个简单的「Hi」开始了解彼此吧~";
    }
}
