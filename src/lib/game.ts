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
        supabase.from('game_players').select('game_id', { head: true, count: 'exact' }).eq('user_id', userId).eq('outcome', 'won'),
        supabase.from('game_players').select('game_id', { head: true, count: 'exact' }).eq('user_id', userId).eq('outcome', 'lost'),
        supabase.from('game_players').select('outcome').eq('user_id', userId).neq('outcome', 'pending').order('joined_at', { ascending: false }).limit(100)
    ]);

    let currentStreak = 0;
    for (const game of recentGames || []) {
        if (game.outcome === 'won') currentStreak++;
        else break;
    }

    return { wins: wins || 0, losses: losses || 0, currentStreak };
}

export const assertParticipant = async (
    supabase: SupabaseClient,
    gameId: number,
    userId: string,
) => {
    const id = Number(gameId);
    const { data, error } = await supabase
        .from('game_players')
        .select('game_id')
        .eq('game_id', id)
        .eq('user_id', userId)
        .single();

    if (error || !data) throw new Error('Game not found or unauthorized');
};