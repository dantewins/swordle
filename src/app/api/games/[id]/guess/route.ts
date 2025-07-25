import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedUser, calculateStats, assertParticipant } from "@/lib/game";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const userClient = await createClient();
        const service = createServiceClient();
        const user = await getAuthenticatedUser(userClient);

        const { id } = await params;
        const gameId = Number(id);
        const { guess } = await req.json();
        if (!guess) throw new Error("Guess missing");

        await assertParticipant(userClient, gameId, user.id);

        const { data: game, error: gameError } = await service
            .from("games")
            .select("id,type,status,secret_word_id")
            .eq("id", gameId)
            .single();
        if (gameError || !game) throw new Error("Game not found");
        if (game.status !== "started") throw new Error("Game is not in started status");

        const { data: wordData, error: wordError } = await service
            .from("words")
            .select("word")
            .eq("id", game.secret_word_id)
            .single();
        if (wordError || !wordData) throw new Error("Failed to fetch word data");

        const secret = wordData.word.toUpperCase();
        const guessUpper = guess.toUpperCase();
        if (guessUpper.length !== secret.length) throw new Error("Guess length does not match word length");

        const result: ("correct" | "present" | "absent")[] = Array(secret.length).fill("absent");
        const secretCounts: Record<string, number> = {};

        for (let i = 0; i < secret.length; i++) {
            if (guessUpper[i] === secret[i]) {
                result[i] = "correct";
            } else {
                secretCounts[secret[i]] = (secretCounts[secret[i]] || 0) + 1;
            }
        }
        for (let i = 0; i < guessUpper.length; i++) {
            const g = guessUpper[i];
            if (result[i] !== "correct" && secretCounts[g] > 0) {
                result[i] = "present";
                secretCounts[g]--;
            }
        }

        const { error: insertError } = await service
            .from("guesses")
            .insert({ game_id: gameId, user_id: user.id, guess: guessUpper, result });
        if (insertError) throw new Error("Failed to insert guess");

        const { count } = await service
            .from("guesses")
            .select("id", { head: true, count: "exact" })
            .eq("game_id", gameId)
            .eq("user_id", user.id);
        const numGuesses = count || 0;

        const isWin = result.every(r => r === "correct");
        const finishedForPlayer = isWin || numGuesses >= 6;

        if (finishedForPlayer) {
            const { error: selfErr } = await service
                .from("game_players")
                .update({ outcome: isWin ? "won" : "lost" })
                .eq("game_id", gameId)
                .eq("user_id", user.id);
            if (selfErr) throw new Error("Failed to update player outcome");

            if (isWin) {
                const { error: loseErr } = await service
                    .from("game_players")
                    .update({ outcome: "lost" })
                    .eq("game_id", gameId)
                    .eq("outcome", "pending")
                    .neq("user_id", user.id);
                if (loseErr) throw new Error("Failed to update opponent outcomes");

                const { data: winners, error: winReadErr } = await service
                    .from("game_players")
                    .select("user_id")
                    .eq("game_id", gameId)
                    .eq("outcome", "won");
                if (winReadErr) throw new Error("Failed to read winners");

                if ((winners?.length || 0) > 1) {
                    const { error: drawErr } = await service
                        .from("game_players")
                        .update({ outcome: "draw" })
                        .eq("game_id", gameId)
                        .in("user_id", winners!.map(w => w.user_id));
                    if (drawErr) throw new Error("Failed to mark draw outcomes");
                }
            }

            const { count: pendingCount, error: pendingErr } = await service
                .from("game_players")
                .select("user_id", { head: true, count: "exact" })
                .eq("game_id", gameId)
                .eq("outcome", "pending");
            if (pendingErr) throw new Error("Failed to count pending players");

            if (pendingCount === 0) {
                const { error: statusErr } = await service
                    .from("games")
                    .update({ status: "completed" })
                    .eq("id", gameId);
                if (statusErr) throw new Error("Failed to mark game completed");
            }
        }

        const response: any = { result, isWin, isGameOver: false };
        const { data: refreshedGame } = await service
            .from("games")
            .select("status")
            .eq("id", gameId)
            .single();
        if (refreshedGame?.status === "completed") {
            response.isGameOver = true;
            response.secret = secret.toLowerCase();
            response.stats = await calculateStats(service, user.id);
        }

        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
