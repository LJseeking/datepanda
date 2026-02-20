export type Dimension = "AttachmentSecurity" | "ConflictRisk" | "RelationshipMaturity" | "PaceAlignment" | "EmotionalNeedIntensity";

export type KikoQuestion = {
    id: string;
    dimension: Dimension;
    kikoText: string;
    direction: "positive" | "reverse";
    weight: number;
    indicator: string;
};

export const KIKO_QUESTIONS: readonly KikoQuestion[] = [
    // 🟢 维度一：依恋安全（Attachment Security）
    {
        id: "A01",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 Kiko 觉得，一旦谈了恋爱，你在对方面前通常能毫无包袱地做自己，不太会小心翼翼怕被嫌弃。是这样吗？",
        direction: "positive",
        weight: 1.3,
        indicator: "自我暴露安全感"
    },
    {
        id: "A02",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 假设对方回微信慢了一点……你会不会立刻控制不住地瞎想：“他/她是不是在跟别人聊天？”或者“我是不是说错话了？”",
        direction: "reverse",
        weight: 1.2,
        indicator: "分离焦虑"
    },
    {
        id: "A03",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 在感情里，你是不是打心底里相信：互相喜欢的人，是绝对不会轻易走散的？",
        direction: "positive",
        weight: 1.2,
        indicator: "关系信任"
    },
    {
        id: "A04",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 Kiko 偷偷问一句：要是最近几天你们聊得没那么热络了，你是不是会敏感到觉得这段感情要凉了？",
        direction: "reverse",
        weight: 1.1,
        indicator: "关系稳定感"
    },
    {
        id: "A05",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 周末对方抛下你，去跟自己的院系同学或社团搭子出去玩，你能心平气和地接受吗？",
        direction: "positive",
        weight: 1.1,
        indicator: "独立容忍度"
    },
    {
        id: "A06",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 你是不是经常需要通过一些小作、小闹或者反复试探，来确认对方是不是还像以前一样喜欢你？",
        direction: "reverse",
        weight: 1.3,
        indicator: "依恋焦虑"
    },
    {
        id: "A07",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 就算对方偶尔隔了几个小时才回消息，你也依然能该上课上课、该干嘛干嘛，内心毫无波澜？",
        direction: "positive",
        weight: 1.2,
        indicator: "分离焦虑稳定性"
    },
    {
        id: "A08",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 哪怕现在感情再好，你是不是也经常隐隐担心：这段关系随时都有可能会突然结束？",
        direction: "reverse",
        weight: 1.2,
        indicator: "关系安全预期"
    },
    {
        id: "A09",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 结了对子之后，你也依然很享受自己一个人去泡图书馆、或者独自散步的私密时光吧？",
        direction: "positive",
        weight: 1.0,
        indicator: "独立依恋平衡"
    },
    {
        id: "A10",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 对方的一个微表情，或者一句没走心的吐槽，会不会让你瞬间警铃大作，觉得“他/她是不是不爱我了”？",
        direction: "reverse",
        weight: 1.1,
        indicator: "不安全触发"
    },
    {
        id: "A11",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 就算有一次吵架吵得非常凶，你心里也清楚得很：你们绝对不会因为这点小事就轻易散伙的。对吧？",
        direction: "positive",
        weight: 1.2,
        indicator: "修复信念"
    },
    {
        id: "A12",
        dimension: "AttachmentSecurity",
        kikoText: "🐼 面对别人突然的偏爱和狂热追求，你的第一反应往往不是开心，而是防备、怀疑甚至觉得有压力？",
        direction: "reverse",
        weight: 1.3,
        indicator: "核心信任感"
    },

    // 🔴 维度二：冲突风险（Conflict Risk）
    {
        id: "C01",
        dimension: "ConflictRisk",
        kikoText: "🐼 一旦发生争执，你会不会特别容易情绪上头，甚至控制不住说出非常伤人的话？",
        direction: "reverse",
        weight: 1.3,
        indicator: "情绪失控风险"
    },
    {
        id: "C02",
        dimension: "ConflictRisk",
        kikoText: "🐼 出现分歧时，比起不见面干着急，你是不是更倾向于大家约杯咖啡坐下来，心平气和地把矛盾掰碎了聊清楚？",
        direction: "positive",
        weight: 1.3,
        indicator: "沟通意愿"
    },
    {
        id: "C03",
        dimension: "ConflictRisk",
        kikoText: "🐼 Kiko 猜，你一生气就很容易陷入“你不理我，我也不理你”的持续冷战状态？",
        direction: "reverse",
        weight: 1.2,
        indicator: "回避型冲突"
    },
    {
        id: "C04",
        dimension: "ConflictRisk",
        kikoText: "🐼 哪怕你现在一肚子火正在表达不满，你是不是也能尽量顾及对方的自尊，绝对不搞人身攻击？",
        direction: "positive",
        weight: 1.2,
        indicator: "表达控制力"
    },
    {
        id: "C05",
        dimension: "ConflictRisk",
        kikoText: "🐼 吵架的时候，你会不会有一种冲动，想把对方过去做错的那些陈芝麻烂谷子的事全部翻出来算总账？",
        direction: "reverse",
        weight: 1.1,
        indicator: "攻击性表达"
    },
    {
        id: "C06",
        dimension: "ConflictRisk",
        kikoText: "🐼 比起单纯发泄情绪，每次吵架你是不是满脑子都在想：“赶紧找到解决这个矛盾的具体办法”？",
        direction: "positive",
        weight: 1.3,
        indicator: "问题导向"
    },
    {
        id: "C07",
        dimension: "ConflictRisk",
        kikoText: "🐼 哪怕心里已经被气炸了，你觉得自己依然能深呼吸，努力控制说话的语气不那么冲？",
        direction: "positive",
        weight: 1.2,
        indicator: "情绪调节"
    },
    {
        id: "C08",
        dimension: "ConflictRisk",
        kikoText: "🐼 遇到那种微信上死活说不清的矛盾，你是不是那种“绝不隔夜，马上打个语音或者当面解决”的直球选手？",
        direction: "positive",
        weight: 1.2,
        indicator: "面对冲突能力"
    },
    {
        id: "C09",
        dimension: "ConflictRisk",
        kikoText: "🐼 不高兴的时候，你会不会习惯性地说反话或者阴阳怪气？（比如：“你多忙啊，怎么会有空管我”）",
        direction: "reverse",
        weight: 1.0,
        indicator: "隐性攻击"
    },
    {
        id: "C10",
        dimension: "ConflictRisk",
        kikoText: "🐼 每次冲突冷却下来之后，你是不是都会在心里默默复盘：刚才有哪几句话是我自己没说好的？",
        direction: "positive",
        weight: 1.3,
        indicator: "自我反思"
    },
    {
        id: "C11",
        dimension: "ConflictRisk",
        kikoText: "🐼 在恋爱里，你会不会经常把对方一个小小的失误，直接上升到“你根本就不在乎我”的高度？",
        direction: "reverse",
        weight: 1.1,
        indicator: "冲突放大倾向"
    },
    {
        id: "C12",
        dimension: "ConflictRisk",
        kikoText: "🐼 Kiko 觉得你是一个“比起证明谁对谁错，更看重这事儿怎么翻篇”的成熟玩家。是这样吗？",
        direction: "positive",
        weight: 1.2,
        indicator: "合作导向"
    },

    // 🔵 维度三：关系成熟度（Relationship Maturity）
    {
        id: "M01",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 谈恋爱对你来说绝不仅是现阶段的陪伴，你会把对方算进你毕业后的职场甚至未来人生规划里吗？",
        direction: "positive",
        weight: 1.3,
        indicator: "长期导向"
    },
    {
        id: "M02",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 你觉得大学生谈恋爱当下开心最重要，至于毕业季会不会分手，那都是以后的事，根本不想管？",
        direction: "reverse",
        weight: 1.1,
        indicator: "即时满足倾向"
    },
    {
        id: "M03",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 哪怕你正处于考研复习或者实习极其忙碌的阶段，你也依然愿意为了维系感情，强行挤出时间和精力给对方？",
        direction: "positive",
        weight: 1.2,
        indicator: "投入度"
    },
    {
        id: "M04",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 感情一旦遇到比较大的现实阻力（比如毕业可能要异地了），你是不是很容易冒出“要不还是算了吧”的退缩念头？",
        direction: "reverse",
        weight: 1.2,
        indicator: "关系韧性"
    },
    {
        id: "M05",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 Kiko 猜，你绝对不会打着“情侣”的旗号，就强求对方交出手机密码、或者共享所有的隐私？",
        direction: "positive",
        weight: 1.1,
        indicator: "边界意识"
    },
    {
        id: "M06",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 你的内心深处，是不是极度渴望在对方的世界里，没有任何人或者事（哪怕是学业）可以排在你的前面？",
        direction: "reverse",
        weight: 1.2,
        indicator: "自我中心度"
    },
    {
        id: "M07",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 如果你觉得两个人未来的人生方向注定背道而驰，你是不是绝对不会轻易开始段关系的狠人？",
        direction: "positive",
        weight: 1.3,
        indicator: "未来筛选意识"
    },
    {
        id: "M08",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 当恋爱滤镜退去、暴露出双方一堆缺点时，比起直接换下一个人，你是不是更愿意留下来陪对方一起磨合？",
        direction: "positive",
        weight: 1.2,
        indicator: "承诺稳定性"
    },
    {
        id: "M09",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 面对诱惑或心动，你觉得自己能非常清醒地区分“一时荷尔蒙的冲动”和“想长久在一起的喜欢”吗？",
        direction: "positive",
        weight: 1.1,
        indicator: "情绪辨识"
    },
    {
        id: "M10",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 悄悄告诉我，有时候你在大学里特别想脱单，仅仅是因为一个人吃饭上课、周末没人陪实在太孤单了？",
        direction: "reverse",
        weight: 1.0,
        indicator: "依赖动机"
    },
    {
        id: "M11",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 在感情里只要碰到了你绝对不妥协的底线（比如欺骗），你是不是那种“哪怕再喜欢也会果断抽身”的人？",
        direction: "positive",
        weight: 1.2,
        indicator: "价值清晰度"
    },
    {
        id: "M12",
        dimension: "RelationshipMaturity",
        kikoText: "🐼 你是不是特别容易被对方稍微花点心思的甜言蜜语、或者随便画的“大饼”给彻底打动，然后深陷进去？",
        direction: "reverse",
        weight: 1.0,
        indicator: "理性稳定度"
    },

    // 🟣 维度四：节奏匹配（Pace Alignment）
    {
        id: "P01",
        dimension: "PaceAlignment",
        kikoText: "🐼 Kiko 觉得，你必须和一个人做足够久的“普通朋友”多方考察后，才会觉得安全、敢推进到恋爱关系。是吗？",
        direction: "positive",
        weight: 1.1,
        indicator: "慢节奏倾向"
    },
    {
        id: "P02",
        dimension: "PaceAlignment",
        kikoText: "🐼 要是在社团局上遇到心动的，只要对方热情主动，你会不会毫不犹豫地迅速开启暧昧甚至确立关系？",
        direction: "reverse",
        weight: 1.2,
        indicator: "快节奏冲动"
    },
    {
        id: "P03",
        dimension: "PaceAlignment",
        kikoText: "🐼 如果碰到一个母胎 solo 觉得进展太快，你是不是完全能压住自己的进度条，舒服地适应对方慢热的节奏？",
        direction: "positive",
        weight: 1.2,
        indicator: "节奏弹性"
    },
    {
        id: "P04",
        dimension: "PaceAlignment",
        kikoText: "🐼 如果一个人跟你暧昧快一个月了还没啥实质性进展，你是不是会觉得浪费时间，直接“一把子下头”删好友？",
        direction: "reverse",
        weight: 1.1,
        indicator: "耐心程度"
    },
    {
        id: "P05",
        dimension: "PaceAlignment",
        kikoText: "🐼 你是不是特别反感那种“带有极强目的性”的追人方式，觉得感情这种事顺其自然沉淀下来最好？",
        direction: "positive",
        weight: 1.1,
        indicator: "节奏稳定性"
    },
    {
        id: "P06",
        dimension: "PaceAlignment",
        kikoText: "🐼 一旦确定了关系，你是不是希望只用一两周时间，就能迅速进入天天牵手拥抱的热恋状态？",
        direction: "reverse",
        weight: 1.2,
        indicator: "升级期待"
    },
    {
        id: "P07",
        dimension: "PaceAlignment",
        kikoText: "🐼 其实你很享受那种：从加微信、偶尔聊天、试探着约饭到最终确认心意，一点点循序渐进的过程？",
        direction: "positive",
        weight: 1.2,
        indicator: "推进速度一致性"
    },
    {
        id: "P08",
        dimension: "PaceAlignment",
        kikoText: "🐼 比起轰轰烈烈的快餐恋爱，你觉得两个人花上大半个学期去慢条斯理地了解彼此，也完全是可以接受的？",
        direction: "positive",
        weight: 1.1,
        indicator: "耐心稳定"
    },
    {
        id: "P09",
        dimension: "PaceAlignment",
        kikoText: "🐼 在完全摸透对方的情绪底色和真实人品之前，你肯定是绝对不会把自己的底牌和真心全部交出去的那类人吧？",
        direction: "positive",
        weight: 1.0,
        indicator: "理性节奏"
    },
    {
        id: "P10",
        dimension: "PaceAlignment",
        kikoText: "🐼 只要你单方面“确认了眼神”，你是不是就很难控制住自己，会毫无保留地、疯狂上头上脑疯狂投入？",
        direction: "reverse",
        weight: 1.1,
        indicator: "情绪推进力"
    },
    {
        id: "P11",
        dimension: "PaceAlignment",
        kikoText: "🐼 什么时候公开朋友圈、该发展到哪一步……你内心是不是极其期待两个人的步调能自然同频，谁也别勉强谁？",
        direction: "positive",
        weight: 1.1,
        indicator: "同步需求"
    },
    {
        id: "P12",
        dimension: "PaceAlignment",
        kikoText: "🐼 只要某天晚上气氛到了（比如一起在操场散步或微醺），你觉得自己很容易做出跳过当前阶段的、有些越线的举动吗？",
        direction: "reverse",
        weight: 1.0,
        indicator: "激情驱动"
    },

    // 🟡 维度五：情绪需求强度（Emotional Need Intensity）
    {
        id: "E01",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 你心里是不是期待每天只要醒着，对方就能非常高频地发消息给你，发图碎碎念报备所有日常？",
        direction: "reverse",
        weight: 1.2,
        indicator: "联系频率期待"
    },
    {
        id: "E02",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 遇到期末周或者熬夜赶 DDL，哪怕你们连着两三天除了早晚安都没空怎么聊天，你也觉得再正常不过？",
        direction: "positive",
        weight: 1.2,
        indicator: "独立容忍度"
    },
    {
        id: "E03",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 你潜意识里是不是极度需要对方一直用非常明确的行动，来反复向你证明“你在他/她那里是个绝对的例外”？",
        direction: "reverse",
        weight: 1.1,
        indicator: "专属感需求"
    },
    {
        id: "E04",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 如果对方因为打游戏或者跟室友聚餐没回你，你自己也能开心地去刷剧或找朋友玩，完全不会生闷气。是吗？",
        direction: "positive",
        weight: 1.1,
        indicator: "情绪稳定"
    },
    {
        id: "E05",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 如果对方吃到了超好吃的食堂新品或是看到好玩的梗，却没有第一时间发给你，你会不会立刻觉得有点失落？",
        direction: "reverse",
        weight: 1.0,
        indicator: "分享期待"
    },
    {
        id: "E06",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 有时候对方就是想啥也不干、一个人静静地发呆或独处，你是不是能完全理解并把空间大方地让出来？",
        direction: "positive",
        weight: 1.2,
        indicator: "空间接受度"
    },
    {
        id: "E07",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 哪怕大家平时都不怎么做日常报备，只有睡前有空打个电话，只要知道对方心里有你，你就会觉得很踏实？",
        direction: "positive",
        weight: 1.2,
        indicator: "联系依赖稳定性"
    },
    {
        id: "E08",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 你能完全接受在对方的大学精神世界里，有某些具体的爱好或者学业目标，排得比你还要重要吗？",
        direction: "positive",
        weight: 1.1,
        indicator: "中心依赖度"
    },
    {
        id: "E09",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 只要你发了带情绪的朋友圈或者小红书，你是不是非常期待你的伴侣能第一时间出现，给你评论或私聊关心你？",
        direction: "reverse",
        weight: 1.1,
        indicator: "关注强度"
    },
    {
        id: "E10",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 某个周末对方选择花一天时间陪室友或者老乡，导致没空见你，你也觉得这是很 OK、很正常的社交分配？",
        direction: "positive",
        weight: 1.0,
        indicator: "现实理解力"
    },
    {
        id: "E11",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 哪怕只是对方今天聊天的语气变平淡了一点，或者少发了一个可爱的表情包，你都会瞬间陷入一整天的内耗中？",
        direction: "reverse",
        weight: 1.1,
        indicator: "情绪依赖"
    },
    {
        id: "E12",
        dimension: "EmotionalNeedIntensity",
        kikoText: "🐼 恋爱里遇到那种不大不小的委屈和小失落，你大部分时候完全有能力自己内化和排解掉，绝不会全当情绪垃圾推给对方。对吗？",
        direction: "positive",
        weight: 1.2,
        indicator: "自我安抚能力"
    }
];
