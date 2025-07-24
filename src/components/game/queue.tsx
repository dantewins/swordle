"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client"; // Assuming client-side Supabase setup
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from '@/lib/game';

interface Presence {
    user_id: string;
}

export default function Queue({ onMatchFound }: { onMatchFound: (gameId: string) => void }) {
    const [inQueue, setInQueue] = useState(false);
    const [queueLength, setQueueLength] = useState(0);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [toastId, setToastId] = useState<string | number | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getAuthenticatedUser(supabase);
                setUserId(user.id);
            } catch (error) {
                toast.error("Failed to get user. Please log in.");
            }
        };
        fetchUser();
    }, [supabase]);

    useEffect(() => {
        if (!inQueue || !userId) return;

        const channel = supabase.channel('matchmaking');

        channel.on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState<{ user_id: string }>();
            const players = Object.values(presenceState).flat() as Presence[];
            setQueueLength(players.length);

            // Simple matchmaking: If >=2 players, match the first two
            if (players.length >= 2) {
                // Assuming you're players.find(p => p.user_id === userId), match with another
                const opponent = players.find(p => p.user_id !== userId);
                if (opponent) {
                    generateGame().then((game) => {
                        // Broadcast the match to the opponent
                        channel.send({
                            type: 'broadcast',
                            event: 'match',
                            payload: { gameId: game.id, opponent: opponent.user_id }
                        });
                        onMatchFound(game.id); // Or router.push(`/play/${game.id}`)
                    });
                }
            }
        });

        // Listen for match broadcasts
        channel.on('broadcast', { event: 'match' }, ({ payload }) => {
            if (payload.opponent === userId) {
                onMatchFound(payload.gameId); // Or router.push(`/play/${payload.gameId}`)
            }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user_id: userId });
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [inQueue, userId]);

    const generateGame = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/games", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: 'multiplayer' }),
            });

            if (!res.ok) throw new Error('Failed to create multiplayer game');

            const game = await res.json();
            toast.success("Matched! Game starting...");
            return game;
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const joinQueue = () => {
        if (!userId) {
            toast.error("User not loaded. Try again.");
            return;
        }
        setInQueue(true);
        const id = toast.loading('Searching for match...', {
            duration: Infinity,
            position: 'top-center',
            action: {
                label: 'Cancel',
                onClick: () => leaveQueue(),
            },
        });
        setToastId(id);
    };

    const leaveQueue = () => {
        setInQueue(false);
        if (toastId) {
            toast.dismiss(toastId);
            setToastId(null);
        }
    };

    const handleMatchFound = (gameId: string) => {
        if (toastId) {
            toast.dismiss(toastId);
            setToastId(null);
        }
        onMatchFound(gameId);
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            {!inQueue ? (
                <Button onClick={joinQueue} disabled={loading || !userId}>
                    Join Multiplayer Queue {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                </Button>
            ) : (
                <>
                    <p className="text-lg">In queue... {queueLength} players waiting</p>
                    <Button onClick={leaveQueue} variant="destructive" className="mt-2">
                        Leave Queue
                    </Button>
                </>
            )}
        </div>
    );
}