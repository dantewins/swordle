import { SupabaseClient } from '@supabase/supabase-js';

export async function getAuthenticatedUser(supabase: SupabaseClient) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        throw new Error('User not authenticated');
    }
    return user;
}

export async function calculateStats(supabase: SupabaseClient, userId: string) {
    const [
        { count: wins },
        { count: losses },
        { data: recentGames }
    ] = await Promise.all([
        supabase.from('games').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'won'),
        supabase.from('games').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'lost'),
        supabase.from('games').select('status').eq('user_id', userId).in('status', ['won', 'lost']).order('created_at', { ascending: false }).limit(100)
    ]);

    let currentStreak = 0;
    for (const game of recentGames || []) {
        if (game.status === 'won') currentStreak++;
        else break;
    }

    return { wins: wins || 0, losses: losses || 0, currentStreak };
}