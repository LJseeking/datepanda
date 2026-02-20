"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import KikoRadar from "@/components/charts/KikoRadar";

export default function MatchingPage() {
    const router = useRouter();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/matching/me")
            .then((res) => {
                if (res.status === 401) {
                    router.push("/login");
                    throw new Error("Login required");
                }
                return res.json();
            })
            .then((json) => {
                if (json.ok) {
                    setProposal(json.data.proposal);
                } else {
                    setError(json.error?.message || "Failed to load");
                }
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [router]);

    const handleRespond = async (action: "ACCEPT" | "REJECT") => {
        if (!proposal) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/matching/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proposalId: proposal.id,
                    action,
                    rejectReason: action === "REJECT" ? "User clicked reject" : undefined
                })
            });
            const json = await res.json();
            if (json.ok) {
                // Update local state
                setProposal((prev: any) => ({ ...prev, status: json.data.status }));
            } else {
                alert("Error: " + json.error?.message);
            }
        } catch (e) {
            alert("Network error");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading match...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    if (!proposal) {
        return (
            <div className="p-8 text-center space-y-4">
                <h1 className="text-2xl font-bold">No Match Yet</h1>
                <p>Please wait for the next matching round (Thursday/Friday).</p>
                <p className="text-sm text-gray-500">Make sure you have submitted your profile.</p>
                <button onClick={() => router.push("/")} className="underline">Go Home</button>
            </div>
        );
    }

    const isPending = proposal.status === "PENDING";
    const isAccepted = proposal.status === "ACCEPTED" || proposal.status === "MUTUAL_ACCEPTED";
    const isRejected = proposal.status === "REJECTED";

    return (
        <div className="max-w-md mx-auto p-6 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Your Weekly Match</h1>
                <p className="text-gray-500">{proposal.weekKey} • Round {proposal.round}</p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-2 border-b">
                    <div className="text-lg font-semibold">Match Score</div>
                    <div className="text-3xl font-bold text-pink-600">{proposal.score}</div>
                </div>

                {/* Kiko Radar Chart Injection */}
                {proposal.matchCard?.kikoDims?.you && proposal.matchCard?.kikoDims?.match && (
                    <div className="py-2">
                        <h3 className="text-sm font-bold text-gray-500 mb-2 text-center uppercase tracking-wider">Kiko 灵魂共鸣度</h3>
                        <KikoRadar myDims={proposal.matchCard.kikoDims.you} matchDims={proposal.matchCard.kikoDims.match} />
                    </div>
                )}

                <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                    <div className="font-semibold text-gray-800">Why you matched</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                        {proposal.reasons?.map((r: string, i: number) => (
                            <li key={i} className="flex items-start">
                                <span className="text-pink-500 mr-2">✦</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="pt-2">
                    <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Candidate Info</div>
                    <div className="text-gray-800 font-medium">✨ School ID: <span className="text-pink-600">{proposal.candidate?.schoolId || proposal.matchCard?.basicInfo?.schoolId || "Unknown"}</span></div>
                </div>
            </div>

            <div className="flex flex-col space-y-3">
                {isPending && (
                    <>
                        <button
                            onClick={() => handleRespond("ACCEPT")}
                            disabled={actionLoading}
                            className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:opacity-50"
                        >
                            Accept Match
                        </button>
                        <button
                            onClick={() => handleRespond("REJECT")}
                            disabled={actionLoading}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50"
                        >
                            Pass
                        </button>
                    </>
                )}

                {isAccepted && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg text-center font-medium">
                        {proposal.status === "MUTUAL_ACCEPTED"
                            ? "🎉 It's a Match! You can now chat."
                            : "You accepted! Waiting for them..."}
                    </div>
                )}

                {isRejected && (
                    <div className="p-4 bg-gray-100 text-gray-500 rounded-lg text-center">
                        You passed on this match.
                    </div>
                )}
            </div>
        </div>
    );
}
