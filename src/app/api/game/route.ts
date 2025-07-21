import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get("id");

        // Check if game id is provided
        if (!gameId) {
            return NextResponse.json({ error: 'Game id missing' }, { status: 400 });
        }

        // Instatiate supabase client
        const supabase = await createClient();

        // Fetch user info
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 500 });
        }

        // User must be authenticated
        if (!user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        // Fetch game using user id
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, type, status, secret_word_id')
            .eq('id', gameId)
            .eq('user_id', user.id)
            .single();

        // Check if game exists and if user is authorized
        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });
        }

        // Fetch all attempted guesses
        const { data: history, error: historyError } = await supabase
            .from('guesses')
            .select('guess, result')
            .eq('game_id', gameId)
            .order('created_at');

        if (historyError) {
            return NextResponse.json({ error: 'Failed to fetch guesses' }, { status: 500 });
        }

        // Fetch word data for that game
        const { data: wordData, error: wordError } = await supabase
            .from('words')
            .select('word, definition, part_of_speech')
            .eq('id', game.secret_word_id)
            .single();

        if (wordError || !wordData) {
            return NextResponse.json({ error: 'Failed to fetch word data' }, { status: 500 });
        }

        const isGameOver = game.status !== 'started';

        const response = {
            id: game.id,
            type: game.type,
            status: game.status,
            definition: wordData.definition,
            part_of_speech: wordData.part_of_speech,
            wordLength: wordData.word.length,
            history: history.map(h => ({ guess: h.guess, result: h.result })),
            isGameOver,
            won: game.status === 'won',
            secret: ''
        };

        if (isGameOver) {
            response.secret = wordData.word;
        }

        return NextResponse.json(response);
    } catch (generalError) {
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}