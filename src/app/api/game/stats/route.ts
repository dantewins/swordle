import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get('id');

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID missing' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        // Fetch game data
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, status, secret_word_id, user_id')
            .eq('id', gameId)
            .eq('user_id', user.id)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });
        }

        // Fetch word data
        const { data: word, error: wordError } = await supabase
            .from('words')
            .select('word, definition, part_of_speech')
            .eq('id', game.secret_word_id)
            .single();

        if (wordError || !word) {
            return NextResponse.json({ error: 'Word not found' }, { status: 500 });
        }

        // Fetch guess history
        const { data: history, error: historyError } = await supabase
            .from('guesses')
            .select('guess, result')
            .eq('game_id', gameId)
            .order('created_at');

        if (historyError) {
            return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
        }

        // Calculate stats (always included in response)
        const [
            { count: wins, error: winsError },
            { count: losses, error: lossesError },
            { data: recentGames, error: recentError }
        ] = await Promise.all([
            supabase
                .from('games')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'won'),
            supabase
                .from('games')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'lost'),
            supabase
                .from('games')
                .select('status, created_at')
                .eq('user_id', user.id)
                .in('status', ['won', 'lost'])
                .order('created_at', { ascending: false })
                .limit(100)
        ]);

        if (winsError || lossesError || recentError) {
            console.error('Error fetching stats:', { winsError, lossesError, recentError });
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
        }

        // Calculate current streak
        let currentStreak = 0;
        for (const game of recentGames || []) {
            if (game.status === 'won') {
                currentStreak++;
            } else {
                break;
            }
        }

        const responseData = {
            definition: word.definition,
            part_of_speech: word.part_of_speech,
            wordLength: word.word.length,
            history: history || [],
            status: game.status,
            won: game.status === 'won',
            stats: {
                wins: wins || 0,
                losses: losses || 0,
                currentStreak
            },
            secret: word.word.toUpperCase()
        };
        
        return NextResponse.json(responseData);
    } catch (generalError) {
        console.error('General error:', generalError);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}