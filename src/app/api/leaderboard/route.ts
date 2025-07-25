import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
    try {
        const service = createServiceClient();

        const { data, error } = await service
            .from("game_players")
            .select("user_id")
            .eq("outcome", "won");

        if (error) throw error;

        const counts = new Map<string, number>();
        for (const row of data) {
            counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
        }

        const top5 = Array.from(counts.entries())
            .map(([user_id, wins]) => ({ user_id, wins }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 5);

        const enriched = await Promise.all(
            top5.map(async (entry) => {
                const { data: userRes } = await service.auth.admin.getUserById(entry.user_id);
                const meta = userRes?.user?.user_metadata || {};
                const displayName =
                    meta.displayName ||
                    meta.display_name ||
                    meta.name ||
                    userRes?.user?.email?.split("@")[0] ||
                    "Anonymous";

                return { ...entry, name: displayName };
            })
        );

        return NextResponse.json(enriched);
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message || "Failed to load leaderboard" },
            { status: 500 }
        );
    }
}
