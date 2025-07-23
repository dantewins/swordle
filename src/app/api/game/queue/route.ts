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
    } catch (generalError) {
        console.error('General error:', generalError);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}