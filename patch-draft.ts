import { prisma } from "./src/lib/db/prisma";
import { upsertDraftAnswers } from "./src/lib/questionnaire/service";

async function run() {
  const latest = await prisma.response.findFirst({
    where: { status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" }
  });

  if (!latest) {
    console.log("No response found");
    return;
  }

  console.log("Patching user:", latest.userId);
  await upsertDraftAnswers(latest.userId, [
    { questionKey: "comm_jealousy", value: "low" },
    { questionKey: "comm_social_media", value: "yes" },
    { questionKey: "comm_problem_solving", value: "solve" },
    { questionKey: "comm_long_distance", value: "3" },
    { questionKey: "interest_topics", values: ["movies_music"] },
    { questionKey: "interest_date_style", values: ["coffee"] },
    { questionKey: "match_distance", value: "same_school" },
    { questionKey: "match_personality_complement", value: "similar" },
    { questionKey: "match_red_flags", values: ["ghosting"] },
    { questionKey: "open_text_self_intro", value: "Hi I'm testing!" }
  ]);
  console.log("Done patching missing 10 answers!");
}

run().catch(console.error);
