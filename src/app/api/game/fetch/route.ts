import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        // Build the query for games, always filter by user's own games
        let query = supabase
            .from('games')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // Apply filters based on query parameters
        const id = searchParams.get('id');
        if (id) {
            query = query.eq('id', id);
        }

        const type = searchParams.get('type');
        if (type) {
            query = query.eq('type', type);
        }

        const status = searchParams.get('status');
        if (status) {
            query = query.eq('status', status);
        }

        const created_at = searchParams.get('created_at');
        if (created_at) {
            query = query.eq('created_at', created_at);
        }

        // Execute the query
        const { data: games, error: gamesError } = await query;

        if (gamesError) {
            console.error('Error fetching games:', gamesError);
            return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
        }

        return NextResponse.json(games);
    } catch (generalError) {
        console.error('General error:', generalError);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}