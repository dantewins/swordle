import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/game";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const gameId = Number(params.id);
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    const { error: joinErr } = await supabase
        .from("game_players")
        .upsert({ game_id: gameId, user_id: user.id }, { onConflict: "game_id,user_id" });
    if (joinErr) {
        return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
    }

    const { data: game, error } = await supabase
        .from("games")
        .select("id,type,status")
        .eq("id", gameId)
        .single();
    if (error || !game || game.type !== "multiplayer" || game.status !== "started") {
        await supabase.from("game_players").delete().eq("game_id", gameId).eq("user_id", user.id);
        return NextResponse.json({ error: "Game not joinable" }, { status: 400 });
    }

    const { data: dup } = await supabase
        .from("game_players")
        .select("game_id, games!inner(id,type,status)")
        .eq("user_id", user.id)
        .eq("games.type", "multiplayer")
        .eq("games.status", "started")
        .neq("game_id", gameId)
        .limit(1)
        .maybeSingle();

    if (dup) {
        await supabase.from("game_players").delete().eq("game_id", gameId).eq("user_id", user.id);
        return NextResponse.json({ error: "Already in an active multiplayer game" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
