import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/game';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);
        const { searchParams } = new URL(req.url);

        let query = supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

        const filters = ['id', 'type', 'status', 'created_at'];
        for (const filter of filters) {
            const value = searchParams.get(filter);
            if (value) query = query.eq(filter, value);
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

        // Check if game type is valid
        if (!['solo', 'multiplayer', 'daily_challenge'].includes(type)) {
            throw new Error('Invalid game type');
        }

        const supabase = await createClient();
        const user = await getAuthenticatedUser(supabase);

        // Check for existing game
        let checkQuery = supabase
            .from('games')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', type)
            .eq('status', 'started')
            .limit(1);

        if (type === 'daily_challenge') {
            const today = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
            checkQuery = supabase
                .from('games')
                .select('id')
                .eq('user_id', user.id)
                .eq('type', type)
                .gte('created_at', today)
                .limit(1);
        }

        const { data: existingGames, error: checkError } = await checkQuery;

        if (checkError) throw new Error('Failed to check existing games');
        if (existingGames?.length > 0) {
            throw new Error(type === 'daily_challenge' ? 'You already played today\'s challenge' : 'You already have an active game');
        }

        // Select a random word
        const { data: secret_word_id, error: rpcError } = await supabase.rpc('get_random_word');
        if (rpcError || !secret_word_id) throw new Error('Failed to select random word');

        // Create game
        const { data: game, error: insertError } = await supabase
            .from('games')
            .insert({
                user_id: user.id,
                type,
                secret_word_id,
                status: 'started'
            })
            .select('id')
            .single();

        if (insertError || !game) throw new Error('Failed to create game');
        return NextResponse.json(game);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}