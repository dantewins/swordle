import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedUser, calculateStats, assertParticipant } from "@/lib/game";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userClient = await createClient();
        const service = createServiceClient();
        const user = await getAuthenticatedUser(userClient);
        const { id } = await params;
        const gameId = Number(id);

        await assertParticipant(userClient, gameId, user.id);

        const { data: game, error: gameErr } = await service
            .from("games")
            .select("id,type,status,secret_word_id")
            .eq("id", gameId)
            .single();
        if (gameErr || !game) throw new Error("Game not found");

        const { data: word, error: wordErr } = await service
            .from("words")
            .select("word,definition,part_of_speech")
            .eq("id", game.secret_word_id)
            .single();
        if (wordErr || !word) throw new Error("Word not found");

        const { data: players, error: playersErr } = await service
            .from("game_players")
            .select("user_id,outcome")
            .eq("game_id", gameId);
        if (playersErr) throw new Error("Failed to fetch players");

        const me = players.find(p => p.user_id === user.id);
        if (!me) throw new Error("Player not found");

        const { data: guesses, error: guessesErr } = await service
            .from("guesses")
            .select("user_id,guess,result,created_at")
            .eq("game_id", gameId)
            .order("created_at", { ascending: true });
        if (guessesErr) throw new Error("Failed to fetch guesses");

        const myHistory = (guesses || [])
            .filter(g => g.user_id === user.id)
            .map(g => ({ guess: g.guess.toUpperCase(), result: g.result }));

        let opponentHistory: { guess: string; result: string[] }[] = [];
        let opponentDisplayName = "";
        let opponentId: string | null = null;

        if (game.type === "multiplayer") {
            opponentId = players.find(p => p.user_id !== user.id)?.user_id || null;

            if (opponentId) {
                opponentHistory = (guesses || [])
                    .filter(g => g.user_id === opponentId)
                    .map(g => ({ guess: g.guess.toUpperCase(), result: g.result }));

                const { data, error: oppErr } = await service.auth.admin.getUserById(opponentId);
                if (oppErr || !data?.user) throw new Error("Failed to fetch opponent details");

                opponentDisplayName = data.user.user_metadata?.display_name || "Opponent";
            }
        }

        const isGameOver = game.status === "completed";
        const won = me.outcome === "won";
        const stats = await calculateStats(service, user.id);

        return NextResponse.json({
            id: game.id,
            type: game.type,
            status: game.status,
            outcome: me.outcome,
            players,
            bothJoined: players.length === 2,
            definition: word.definition,
            part_of_speech: word.part_of_speech,
            wordLength: word.word.length,
            history: myHistory,
            opponentHistory,
            opponentDisplayName,
            opponentId,
            isGameOver,
            won,
            stats,
            secret: isGameOver ? word.word : ""
        });
    } catch (error: any) {
        console.log(error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
