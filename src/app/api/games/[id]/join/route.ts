import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedUser } from "@/lib/game";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const { id } = await params;
    const gameId = Number(id);
    const supabase = await createClient();
    const service = await createServiceClient();
    const user = await getAuthenticatedUser(supabase);

    const { data: game, error: gameErr } = await service
        .from("games")
        .select("id,type,status")
        .eq("id", gameId)
        .single();

    console.log(gameErr);
    console.log(game);
    if (gameErr || !game || game.type !== "multiplayer" || game.status !== "started") {
        return NextResponse.json({ error: "Game not joinable" }, { status: 400 });
    }

    const { data: otherActive, error: dupErr } = await supabase
        .from("game_players")
        .select("game_id,games!inner(id,type,status)")
        .eq("user_id", user.id)
        .eq("games.type", "multiplayer")
        .eq("games.status", "started")
        .neq("game_id", gameId)
        .limit(1)
        .maybeSingle();

    if (dupErr) {
        return NextResponse.json({ error: "Failed to check active games" }, { status: 500 });
    }
    if (otherActive) {
        return NextResponse.json(
            { error: "Already in an active multiplayer game" },
            { status: 400 }
        );
    }

    const { error: upsertErr } = await supabase
        .from("game_players")
        .upsert({ game_id: gameId, user_id: user.id }, { onConflict: "game_id,user_id" });

    console.log(upsertErr)
    if (upsertErr) {
        return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
