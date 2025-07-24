import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, calculateStats } from '@/lib/game';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);
        const gameId = params.id;

        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, type, status, secret_word_id, user_id')
            .eq('id', gameId)
            .eq('user_id', user.id)
            .single();

        if (gameError || !game) throw new Error('Game not found or unauthorized');

        const { data: word, error: wordError } = await supabase
            .from('words')
            .select('word, definition, part_of_speech')
            .eq('id', game.secret_word_id)
            .single();

        if (wordError || !word) throw new Error('Word not found');

        const { data: history, error: historyError } = await supabase
            .from('guesses')
            .select('guess, result')
            .eq('game_id', gameId)
            .order('created_at');

        if (historyError) throw new Error('Failed to fetch history');

        const stats = await calculateStats(supabase, user.id);
        const isGameOver = game.status !== 'started';

        return NextResponse.json({
            id: game.id,
            type: game.type,
            status: game.status,
            definition: word.definition,
            part_of_speech: word.part_of_speech,
            wordLength: word.word.length,
            history: history?.map(h => ({ guess: h.guess.toUpperCase(), result: h.result })) || [],
            isGameOver,
            won: game.status === 'won',
            stats,
            secret: isGameOver ? word.word : ''
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}