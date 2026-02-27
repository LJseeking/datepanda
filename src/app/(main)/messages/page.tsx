// /messages is now redirected to /matches in the new no-chat MVP.
// TalkJS is kept in the codebase but hidden from navigation.
import { redirect } from "next/navigation";

export default function MessagesPage() {
    redirect("/matches");
}
