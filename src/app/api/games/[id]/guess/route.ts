import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, calculateStats, assertParticipant } from '@/lib/game';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);
        const gameId = Number(params.id);
        const { guess } = await req.json();

        if (!guess) throw new Error('Guess missing');

        await assertParticipant(supabase, gameId, user.id);

        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id,type,status,secret_word_id')
            .eq('id', gameId)
            .single();
        if (gameError || !game) throw new Error('Game not found');
        if (game.status !== 'started') throw new Error('Game is not in started status');

        const { data: wordData, error: wordError } = await supabase
            .from('words')
            .select('word')
            .eq('id', game.secret_word_id)
            .single();
        if (wordError || !wordData) throw new Error('Failed to fetch word data');

        const secret = wordData.word.toUpperCase();
        const guessUpper = guess.toUpperCase();
        if (guessUpper.length !== secret.length) throw new Error('Guess length does not match word length');

        const result: ('correct' | 'present' | 'absent')[] = Array(secret.length).fill('absent');
        const secretCounts: Record<string, number> = {};

        for (let i = 0; i < secret.length; i++) {
            if (guessUpper[i] === secret[i]) {
                result[i] = 'correct';
            } else {
                secretCounts[secret[i]] = (secretCounts[secret[i]] || 0) + 1;
            }
        }
        for (let i = 0; i < guessUpper.length; i++) {
            const g = guessUpper[i];
            if (result[i] !== 'correct' && secretCounts[g] > 0) {
                result[i] = 'present';
                secretCounts[g]--;
            }
        }

        const { error: insertError } = await supabase
            .from('guesses')
            .insert({ game_id: gameId, user_id: user.id, guess: guessUpper, result });
        if (insertError) throw new Error('Failed to insert guess');

        const { count } = await supabase
            .from('guesses')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('user_id', user.id);
        const numGuesses = count || 0;

        const isWin = result.every(r => r === 'correct');
        const isGameOver = isWin || numGuesses >= 6;

        if (isGameOver) {
            const { error: gpErr } = await supabase
                .from('game_players')
                .update({ outcome: isWin ? 'won' : 'lost' })
                .eq('game_id', gameId)
                .eq('user_id', user.id);
            if (gpErr) throw new Error('Failed to update player outcome');

            if (isWin) {
                const { data: others } = await supabase
                    .from('game_players')
                    .select('user_id,outcome')
                    .eq('game_id', gameId);

                const otherWinners = (others || []).filter(p => p.user_id !== user.id && p.outcome === 'won');
                if (otherWinners.length) {
                    await supabase
                        .from('game_players')
                        .update({ outcome: 'draw' })
                        .eq('game_id', gameId)
                        .in('user_id', [user.id, ...otherWinners.map(p => p.user_id)]);
                } else {
                    const { error: othersErr } = await supabase
                        .from('game_players')
                        .update({ outcome: 'lost' })
                        .eq('game_id', gameId)
                        .neq('user_id', user.id)
                        .eq('outcome', 'pending');

                    if (othersErr) throw new Error('Failed to update opponent outcomes');
                }
            }

            const { count: pending } = await supabase
                .from('game_players')
                .select('user_id', { head: true, count: 'exact' })
                .eq('game_id', gameId)
                .eq('outcome', 'pending');

            if (pending === 0) {
                const { count: draws } = await supabase
                    .from('game_players')
                    .select('user_id', { head: true, count: 'exact' })
                    .eq('game_id', gameId)
                    .eq('outcome', 'draw');

                const finalStatus = draws ? 'draw' : (isWin ? 'won' : 'lost');
                const { error: statusErr } = await supabase
                    .from('games')
                    .update({ status: finalStatus })
                    .eq('id', gameId);
                if (statusErr) throw new Error('Failed to update game status');
            }
        }

        const response: any = { result, isWin, isGameOver };
        if (isGameOver) {
            response.secret = secret.toLowerCase();
            response.stats = await calculateStats(supabase, user.id);
        }

        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
