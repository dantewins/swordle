import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { type } = await req.json();

        // Check if game type is valid
        if (!['solo', 'multiplayer', 'daily_challenge'].includes(type)) {
            return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
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

        // Check if user already has an active game
        const { data: activeGames, error: activeError } = await supabase
            .from('games')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'started')
            .limit(1);

        if (activeError) {
            console.error('Error checking active games:', activeError);
            return NextResponse.json({ error: 'Failed to check active games' }, { status: 500 });
        }

        if (activeGames && activeGames.length > 0) {
            return NextResponse.json({ error: 'You already have an active game' }, { status: 409 });
        }

        // Select a random word from words table
        const { data: secret_word_id, error: rpcError } = await supabase.rpc('get_random_word');
        if (rpcError) {
            console.error('Error fetching random word:', rpcError);
            return NextResponse.json({ error: 'Failed to select random word' }, { status: 500 });
        }

        // Check if our first query worked
        if (!secret_word_id) {
            return NextResponse.json({ error: 'No random word found' }, { status: 404 });
        }

        // Create a game for the user based on given game type
        const { data: game, error: insertError } = await supabase
            .from('games')
            .insert({
                user_id: user.id,
                type,
                secret_word_id
            })
            .select('id')
            .single();

        // Check if our insert query worked
        if (insertError) {
            console.error('Error creating game:', insertError);
            return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
        }

        return NextResponse.json(game);
    } catch (generalError) {
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}