import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { runThuBatchAndListProposals, runFriBatchAndListProposals } from "@/lib/matching/service";
import { formatWeekKeyCN } from "@/lib/time/cn";
// Note: Email notification logic would ideally be imported from the lib, but we'll mock it if not centrally available
import { processNotifications } from "@/lib/cron/notify";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function POST(req: NextRequest) {
    try {
        const cookieStore = req.cookies;
        const adminToken = cookieStore.get("admin_token")?.value;

        if (adminToken !== ADMIN_TOKEN) {
            return apiError("UNAUTHORIZED", "Admin access required", 401);
        }

        const body = await req.json();
        const { jobType } = body;

        if (!jobType) {
            return apiError("BAD_REQUEST", "Missing jobType", 400);
        }

        console.log(`[Admin Cron Trigger] Executing job: ${jobType}`);

        let result = "Unknown Job";
        const weekKey = formatWeekKeyCN(new Date());

        switch (jobType) {
            case "MATCH_THU":
                await runThuBatchAndListProposals(weekKey);
                result = "Thursday Match generation completed successfully.";
                break;
            case "MATCH_FRI":
                await runFriBatchAndListProposals(weekKey);
                result = "Friday Pick-up Match generation completed successfully.";
                break;
            case "NOTIFY_ALL":
                // Assuming processNotifications exists and handles all pending email/SMS drops
                if (typeof processNotifications === "function") {
                    await processNotifications();
                    result = "Notifications processed and pushed to console logs/mail service.";
                } else {
                    return apiError("NOT_IMPLEMENTED", "Notification cron service missing locally.", 501);
                }
                break;
            default:
                return apiError("BAD_REQUEST", "Unsupported jobType", 400);
        }

        return apiSuccess({ message: result });
    } catch (error: any) {
        console.error("[Admin Job Error]", error);
        return apiError("INTERNAL_ERROR", error.message || "Job execution failed", 500);
    }
}
