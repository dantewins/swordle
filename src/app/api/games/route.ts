import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/game';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);
        const { searchParams } = new URL(req.url);

        let query = supabase.from('game_players').select('games:games(*)').eq('user_id', user.id).order('games(created_at)', { ascending: false });

        const filters = ['id', 'type', 'status', 'created_at'];
        for (const f of filters) {
            const v = searchParams.get(f);
            if (!v) continue;
            query = query.eq(`games.${f}`, v);
        }

        const { data: games, error } = await query;
        if (error) throw new Error('Failed to fetch games');
        return NextResponse.json(games);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { type } = await req.json();
        const validTypes = ["solo", "multiplayer", "daily_challenge"];
        if (!validTypes.includes(type)) throw new Error("Invalid game type");

        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);

        const { data: dup, error: dupErr } = await supabase
            .from("game_players")
            .select("game_id, games!inner(id,type,status)")
            .eq("user_id", user.id)
            .eq("games.type", type)
            .eq("games.status", "started")
            .limit(1)
            .maybeSingle();

        if (dupErr) throw new Error("Failed to check existing games");
        if (dup) throw new Error("You already have an active game");

        const { data: secret_word_id, error: wordErr } = await supabase.rpc(
            "get_random_word"
        );
        if (wordErr || !secret_word_id) throw new Error("Failed to select word");

        const { data: game, error: gameErr } = await supabase
            .from("games")
            .insert({
                user_id: user.id,
                type,
                secret_word_id,
                status: "started",
            })
            .select("id")
            .single();
        if (gameErr || !game) throw new Error("Failed to create game");

        const { error: regErr } = await supabase
            .from("game_players")
            .upsert(
                { game_id: game.id, user_id: user.id },
                { onConflict: "game_id,user_id" }
            );
        if (regErr) throw new Error("Failed to register player");

        return NextResponse.json(game);
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || "Unexpected error" },
            { status: 500 }
        );
    }
}