import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/game";

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);
        const { searchParams } = new URL(req.url);

        let query = supabase
            .from("game_players")
            .select("outcome,games:games!inner(*)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false, foreignTable: "games" });

        const gameFilters = ["id", "type", "status", "created_at"];
        for (const f of gameFilters) {
            const v = searchParams.get(f);
            if (v) query = query.eq(`games.${f}`, v);
        }

        const outcome = searchParams.get("outcome");
        if (outcome) query = query.eq("outcome", outcome);

        const { data: rows, error } = await query;
        if (error) throw new Error("Failed to fetch games");
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { type } = await req.json();
        const validTypes = ["solo", "multiplayer", "daily_challenge"];
        if (!validTypes.includes(type)) throw new Error("Invalid game type");

        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);

        const { data: active, error: activeErr } = await supabase
            .from("game_players")
            .select("games:games!inner(id,type,status)")
            .eq("user_id", user.id)
            .eq("games.type", type)
            .eq("games.status", "started")
            .limit(1)
            .maybeSingle();
        if (activeErr) throw new Error("Failed to check existing games");

        if (active) {
            const existing = Array.isArray(active.games) ? active.games[0] : active.games;
            if (!existing) throw new Error("Corrupted join response");
            return NextResponse.json({ id: existing.id, fromExisting: true });
        }

        const { data: secret_word_id, error: wordErr } = await supabase.rpc("get_random_word");
        if (wordErr || !secret_word_id) throw new Error("Failed to select word");

        const { data: inserted, error: gameErr } = await supabase
            .from("games")
            .insert({ user_id: user.id, type, secret_word_id, status: "started" })
            .select("id")
            .single();
        if (gameErr || !inserted) throw new Error("Failed to create game");

        const { error: regErr } = await supabase
            .from("game_players")
            .upsert({ game_id: inserted.id, user_id: user.id }, { onConflict: "game_id,user_id" });
        if (regErr) throw new Error("Failed to register player");

        return NextResponse.json({ id: inserted.id, fromExisting: false });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
    }
}
