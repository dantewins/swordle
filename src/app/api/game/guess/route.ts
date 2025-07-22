import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const { game_id, guess } = await req.json();

        // Check if required parameters are provided
        if (!game_id || !guess) {
            return NextResponse.json({ error: 'Game ID or guess missing' }, { status: 400 });
        }

        // Instantiate supabase client
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

        // Fetch game using game_id and user_id
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('id, type, status, secret_word_id')
            .eq('id', game_id)
            .eq('user_id', user.id)
            .single();

        // Check if game exists and if user is authorized
        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });
        }

        // Check if game is still in progress
        if (game.status !== 'started') {
            return NextResponse.json({ error: 'Game is not in started status' }, { status: 400 });
        }

        // Fetch the secret word
        const { data: wordData, error: wordError } = await supabase
            .from('words')
            .select('word')
            .eq('id', game.secret_word_id)
            .single();

        if (wordError || !wordData) {
            return NextResponse.json({ error: 'Failed to fetch word data' }, { status: 500 });
        }

        const secret = wordData.word.toUpperCase();
        const guessUpper = guess.toUpperCase();

        // Validate guess length
        if (guessUpper.length !== secret.length) {
            return NextResponse.json({ error: 'Guess length does not match word length' }, { status: 400 });
        }

        // Compute the result (Wordle-style)
        const result: ('correct' | 'present' | 'absent')[] = new Array(secret.length).fill('absent');
        const secretCounts: Record<string, number> = {};

        // First pass: mark correct positions and count remaining letters
        for (let i = 0; i < secret.length; i++) {
            const s = secret[i];
            const g = guessUpper[i];
            if (g === s) {
                result[i] = 'correct';
            } else {
                secretCounts[s] = (secretCounts[s] || 0) + 1;
            }
        }

        // Second pass: mark present for non-correct positions
        for (let i = 0; i < guessUpper.length; i++) {
            const g = guessUpper[i];
            if (result[i] !== 'correct') {
                if (secretCounts[g] > 0) {
                    result[i] = 'present';
                    secretCounts[g]--;
                }
            }
        }

        // Insert the guess into the guesses table
        const { error: insertError } = await supabase
            .from('guesses')
            .insert({
                game_id: game_id,
                guess: guessUpper,
                result: result
            });

        if (insertError) {
            console.error('Error inserting guess:', insertError);
            return NextResponse.json({ error: 'Failed to insert guess' }, { status: 500 });
        }

        // Fetch the number of guesses made so far (including this one)
        const { count, error: countError } = await supabase
            .from('guesses')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', game_id);

        if (countError) {
            return NextResponse.json({ error: 'Failed to count guesses' }, { status: 500 });
        }

        const numGuesses = count || 0;

        // Determine if win
        const isWin = result.every(r => r === 'correct');

        // Determine if game over
        const isGameOver = isWin || numGuesses >= 6;

        // Update game status if game over
        if (isGameOver) {
            const newStatus = isWin ? 'won' : 'lost';
            const { error: updateError } = await supabase
                .from('games')
                .update({ status: newStatus })
                .eq('id', game_id);

            if (updateError) {
                console.error('Error updating game status:', updateError);
                return NextResponse.json({ error: 'Failed to update game status' }, { status: 500 });
            }
        }

        // Prepare response
        let response: any = {
            result,
            isWin,
            isGameOver,
        };

        if (isGameOver) {
            response.secret = secret.toLowerCase();

            // Fetch user games to compute stats
            const { data: userGames, error: gamesError } = await supabase
                .from('games')
                .select('status')
                .eq('user_id', user.id)
                .in('status', ['won', 'lost'])
                .order('id', { ascending: false });

            if (gamesError) {
                console.error('Error fetching games for stats:', gamesError);
                return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
            }

            const wins = userGames.filter(g => g.status === 'won').length;
            const losses = userGames.length - wins;
            let currentStreak = 0;
            for (const game of userGames) {
                if (game.status === 'won') {
                    currentStreak++;
                } else {
                    break;
                }
            }

            response.stats = { wins, losses, currentStreak };
        }

        return NextResponse.json(response);
    } catch (generalError) {
        console.error('General error:', generalError);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}