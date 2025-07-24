"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/game";
import { toast } from "sonner";

interface Presence { user_id: string }

export default function Queue({ onMatchFound, onCancel }: { onMatchFound: (gameId: string) => void, onCancel: () => void }) {
    const [userId, setUserId] = useState<string | null>(null);
    const supabase = useRef(createClient()).current;
    const toastId = useRef<string | number | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const hasMatchedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const user = await getAuthenticatedUser(supabase);
                if (cancelled) return;
                setUserId(user.id);
            } catch {
                toast.error("You need to be logged in to play.");
            }
        })();
        return () => { cancelled = true };
    }, [supabase]);

    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel("matchmaking");
        channelRef.current = channel;

        channel.on("presence", { event: "sync" }, () => {
            const players = Object.values(channel.presenceState<Presence>()).flat();
            if (players.length >= 2 && !hasMatchedRef.current) {
                const sortedIds = players.map(p => p.user_id).sort();
                const hostId = sortedIds[0];
                if (hostId === userId) {
                    hasMatchedRef.current = true;
                    createGame()
                        .then(game => {
                            channel.send({
                                type: "broadcast",
                                event: "match",
                                payload: { gameId: game.id, opponent: sortedIds.find(id => id !== userId) },
                            });
                            finish(game.id);
                        })
                        .catch(() => { hasMatchedRef.current = false });
                }
            }
        });

        channel.on("broadcast", { event: "match" }, async ({ payload }) => {
            if (payload.opponent === userId && !hasMatchedRef.current) {
                hasMatchedRef.current = true;
                const res = await fetch(`/api/games/${payload.gameId}/join`, { method: "POST" });
                if (!res.ok) {
                    const { error } = await res.json().catch(() => ({ error: "Join failed" }));
                    toast.error(error || "Failed to join game");
                    hasMatchedRef.current = false;
                    return;
                }
                finish(payload.gameId);
            }
        });

        channel.subscribe(async status => {
            if (status === "SUBSCRIBED") {
                await channel.track({ user_id: userId });
            }
        });

        return () => { channel.unsubscribe() };
    }, [userId]);

    useEffect(() => {
        const started = Date.now();
        const format = (ms: number) => {
            const total = Math.floor(ms / 1000);
            const m = String(Math.floor(total / 60)).padStart(2, "0");
            const s = String(total % 60).padStart(2, "0");
            return `${m}:${s}`;
        };

        toastId.current = toast.message("Searching for an opponent", {
            description: format(Date.now() - started),
            duration: Infinity,
            position: "top-center",
            action: { label: "Cancel", onClick: cancel },
        });

        const interval = setInterval(() => {
            if (toastId.current) {
                toast.message("Searching for an opponent", {
                    id: toastId.current,
                    description: format(Date.now() - started),
                    duration: Infinity,
                    position: "top-center",
                    action: { label: "Cancel", onClick: cancel },
                });
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            if (toastId.current) {
                toast.dismiss(toastId.current);
                toastId.current = null;
            }
        };
    }, []);

    const cancel = () => {
        channelRef.current?.unsubscribe();
        if (toastId.current) toast.dismiss(toastId.current);
        toastId.current = null;
        onCancel();
    };

    const finish = (gameId: string) => {
        if (toastId.current)
            toast.success("Match found", {
                description: "Redirecting to your game",
                id: toastId.current,
                duration: 1000,
            });
        setTimeout(() => onMatchFound(gameId), 1000);
    };

    const createGame = async () => {
        const res = await fetch("/api/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "multiplayer" }),
        });
        if (!res.ok) throw new Error("Failed to create game");
        return res.json();
    };

    return null;
}
