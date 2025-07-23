import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, calculateStats } from '@/lib/game';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);
        const gameId = params.id;
        const { guess } = await req.json();

        if (!guess) throw new Error('Guess missing');

        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, type, status, secret_word_id')
            .eq('id', gameId)
            .eq('user_id', user.id)
            .single();

        if (gameError || !game) throw new Error('Game not found or unauthorized');
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

        const result: ('correct' | 'present' | 'absent')[] = new Array(secret.length).fill('absent');
        const secretCounts: Record<string, number> = {};
        for (let i = 0; i < secret.length; i++) {
            const s = secret[i];
            const g = guessUpper[i];
            if (g === s) {
                result[i] = 'correct';
            } else {
                secretCounts[s] = (secretCounts[s] || 0) + 1;
            }
        }
        for (let i = 0; i < guessUpper.length; i++) {
            const g = guessUpper[i];
            if (result[i] !== 'correct' && secretCounts[g] > 0) {
                result[i] = 'present';
                secretCounts[g]--;
            }
        }

        const { error: insertError } = await supabase.from('guesses').insert({ game_id: gameId, guess: guessUpper, result });
        if (insertError) throw new Error('Failed to insert guess');

        const { count } = await supabase.from('guesses').select('id', { count: 'exact', head: true }).eq('game_id', gameId);
        const numGuesses = count || 0;

        const isWin = result.every(r => r === 'correct');
        const isGameOver = isWin || numGuesses >= 6;

        if (isGameOver) {
            const newStatus = isWin ? 'won' : 'lost';
            const { error: updateError } = await supabase.from('games').update({ status: newStatus }).eq('id', gameId);
            if (updateError) throw new Error('Failed to update game status');
        }

        let response: any = { result, isWin, isGameOver };

        if (isGameOver) {
            response.secret = secret.toLowerCase();
            response.stats = await calculateStats(supabase, user.id);
        }

        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}