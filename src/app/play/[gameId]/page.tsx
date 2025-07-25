"use client";
import { Delete, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Result = "correct" | "present" | "absent";

export default function GamePage() {
    const maxGuesses = 6;
    const { gameId } = useParams();
    const router = useRouter();
    const supabase = createClient();

    const [userId, setUserId] = useState<string | null>(null);
    const [secret, setSecret] = useState("");
    const [definition, setDefinition] = useState("");
    const [partOfSpeech, setPartOfSpeech] = useState("");
    const [wordLength, setWordLength] = useState(0);
    const [gameType, setGameType] = useState<string>("solo");
    const isMultiplayer = gameType === "multiplayer";

    const [history, setHistory] = useState<{ guess: string; result: Result[] }[]>([]);
    const [opponentHistory, setOpponentHistory] = useState<
        { guess: string; result: Result[] }[]
    >([]);
    const [opponentId, setOpponentId] = useState<string>("");
    const [opponentName, setOpponentName] = useState<string>("Opponent");
    const [showOpponentBoard, setShowOpponentBoard] = useState(false);

    const [current, setCurrent] = useState("");
    const [keyStates, setKeyStates] = useState<Record<string, Result>>({});
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [streak, setStreak] = useState(0);
    const [isBoardLoaded, setIsBoardLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [guessLoading, setGuessLoading] = useState(false);
    const [stats, setStats] =
        useState<{ wins: number; losses: number; currentStreak: number } | null>(
            null
        );
    const [buttonLoading, setButtonLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [bothJoined, setBothJoined] = useState(false);
    const [tooltipPos, setTooltipPos] = useState<"top" | "bottom">("top");

    const triggerRef = useRef<HTMLDivElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const pendingGameOverRef = useRef<{ isWin: boolean } | null>(null);
    const confettiFiredRef = useRef(false);

    function fireConfettiOnce() {
        if (confettiFiredRef.current) return;
        confettiFiredRef.current = true;
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, [supabase]);

    useEffect(() => {
        if (showOpponentBoard && triggerRef.current && popoverRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const popoverHeight = popoverRef.current.offsetHeight;
            const margin = 8;
            const hasSpaceAbove = triggerRect.top >= popoverHeight + margin;
            setTooltipPos(hasSpaceAbove ? "top" : "bottom");
        }
    }, [showOpponentBoard, opponentHistory, wordLength]);

    const rebuildKeyStates = useCallback(
        (allGuesses: { guess: string; result: Result[] }[]) => {
            const next: Record<string, Result> = {};
            for (const { guess, result } of allGuesses) {
                for (let i = 0; i < guess.length; i++) {
                    const ch = guess[i];
                    const state = result[i];
                    if (state === "correct") next[ch] = "correct";
                    else if (state === "present" && next[ch] !== "correct") next[ch] = "present";
                    else if (state === "absent" && !next[ch]) next[ch] = "absent";
                }
            }
            setKeyStates(next);
        },
        []
    );

    const loadGame = useCallback(async () => {
        if (!gameId || !userId) return;
        try {
            const res = await fetch(`/api/games/${gameId}`);
            if (!res.ok) {
                router.push("/");
                return;
            }
            const data = await res.json();

            setGameType(data.type || "solo");
            setDefinition(data.definition || "");
            setPartOfSpeech(data.part_of_speech || "");
            setWordLength(data.wordLength || 0);
            setHistory(data.history || []);
            setOpponentHistory(data.opponentHistory || []);
            setOpponentId(data.opponentId || "");
            setOpponentName(data.opponentDisplayName || "Opponent");
            setSecret(data.secret || "");
            setWon(!!data.won);
            setGameOver(data.status !== "started");
            if (data.stats) {
                setStats(data.stats);
                setStreak(data.stats.currentStreak || 0);
            }
            if (data.type === "multiplayer") {
                setBothJoined((data.players || []).length === 2);
            } else {
                setBothJoined(true);
            }
            rebuildKeyStates(data.history || []);
            setIsBoardLoaded(true);
            setLoading(false);

            if (data.status !== "started") {
                const hasGuesses = data.history && data.history.length > 0;
                const delay = hasGuesses ? (data.wordLength || 0) * 150 + 600 : 0;
                setTimeout(() => {
                    if (data.won) fireConfettiOnce();
                    setDialogOpen(true);
                }, delay);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to load game");
        }
    }, [gameId, userId, rebuildKeyStates, router]);

    useEffect(() => {
        loadGame();
        confettiFiredRef.current = false;
    }, [loadGame]);

    useEffect(() => {
        if (!gameId || !userId || !isMultiplayer) return;
        const channel = supabase
            .channel(`game-${gameId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
                () => loadGame()
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "game_players",
                    filter: `game_id=eq.${gameId}`,
                },
                () => loadGame()
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "guesses",
                    filter: `game_id=eq.${gameId}`,
                },
                (payload) => {
                    const g = payload.new as { user_id: string; guess: string; result: Result[] };
                    const guessObj = { guess: g.guess.toUpperCase(), result: g.result };
                    if (g.user_id === userId) {
                        // Ignore own realtime guess; we add it after fetch resolves.
                        return;
                    }
                    setOpponentHistory((prev) => [...prev, guessObj]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, userId, isMultiplayer, supabase, loadGame]);

    const handleGuess = async () => {
        if (!bothJoined || current.length !== wordLength || guessLoading || gameOver) return;

        setGuessLoading(true);
        const guessToSend = current;

        try {
            const res = await fetch(`/api/games/${gameId}/guess`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guess: guessToSend }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to submit guess");

            const {
                result,
                isWin,
                isGameOver,
                secret: revealedSecret,
                stats: responseStats,
            } = await res.json();

            // Update board (solo and multiplayer) only AFTER loading completes.
            setHistory((prev) => {
                const next = [...prev, { guess: guessToSend, result }];
                rebuildKeyStates(next);
                return next;
            });
            setCurrent("");

            if (responseStats) {
                setStats(responseStats);
                setStreak(responseStats.currentStreak);
            }
            if (revealedSecret) setSecret(revealedSecret);

            if (isWin || isGameOver) {
                setGameOver(true);
                setWon(isWin);
                const delay = wordLength * 150 + 600;
                setTimeout(() => {
                    if (isWin) fireConfettiOnce();
                    setDialogOpen(true);
                }, delay);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to submit guess");
        } finally {
            setGuessLoading(false);
        }
    };

    const handleKey = (key: string) => {
        if (gameOver || !isBoardLoaded || guessLoading || !bothJoined) return;
        if (key === "BACKSPACE") setCurrent((prev) => prev.slice(0, -1));
        else if (key === "ENTER") handleGuess();
        else if (current.length < wordLength && /^[A-Z]$/.test(key))
            setCurrent((prev) => prev + key);
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (gameOver || !isBoardLoaded || guessLoading || !bothJoined) return;
            if (e.key === "Enter") handleKey("ENTER");
            else if (e.key === "Backspace") handleKey("BACKSPACE");
            else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toUpperCase());
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [gameOver, isBoardLoaded, guessLoading, current, wordLength, bothJoined]);

    const row1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
    const row2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
    const row3 = ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"];

    const getButtonClass = (key: string): string => {
        const base = "text-xl font-bold rounded-sm shadow-none";
        if (key === "ENTER" || key === "BACKSPACE")
            return `${base} bg-gray-200 text-black hover:bg-gray-300`;
        const state = keyStates[key];
        if (state === "correct") return `${base} bg-green-600 text-white hover:bg-green-700`;
        if (state === "present") return `${base} bg-yellow-400 text-white hover:bg-yellow-500`;
        if (state === "absent") return `${base} bg-gray-400 text-white hover:bg-gray-500`;
        return `${base} bg-gray-200 text-black hover:bg-gray-300`;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading game...</p>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-[100vh] flex-col items-center justify-center bg-white gap-4 sm:gap-6 p-4">
            {isMultiplayer && !bothJoined && !gameOver && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm text-gray-600">Waiting for opponent to join…</p>
                </div>
            )}
            <div className="w-full max-w-[90vw] sm:w-96 lg:w-110 flex justify-between items-center">
                <p className="text-lg text-left max-w-[50%]">
                    "{definition}" ({partOfSpeech})
                </p>
                {!isMultiplayer ? (
                    <p className="text-lg text-right">🔥{streak}</p>
                ) : (
                    <div
                        ref={triggerRef}
                        className="relative"
                        onClick={() => setShowOpponentBoard(!showOpponentBoard)}
                        onMouseEnter={() => setShowOpponentBoard(true)}
                        onMouseLeave={() => setShowOpponentBoard(false)}
                    >
                        <Image
                            src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(opponentId)}`}
                            alt={`${opponentName} avatar`}
                            width={40}
                            height={40}
                        />
                        <p className="text-lg text-right cursor-pointer">{opponentName}</p>
                        {showOpponentBoard && (
                            <div
                                ref={popoverRef}
                                className={`absolute right-0 ${tooltipPos === "top" ? "bottom-full mb-2" : "top-full mt-2"
                                    } p-3 bg-white border border-gray-200 rounded-md z-30 shadow`}
                            >
                                <div
                                    className="grid gap-0.5"
                                    style={{
                                        gridTemplateColumns: `repeat(${wordLength}, 16px)`,
                                        gridTemplateRows: `repeat(${maxGuesses},16px)`,
                                    }}
                                >
                                    {Array.from({ length: wordLength * maxGuesses }).map((_, i) => {
                                        const r = Math.floor(i / wordLength);
                                        const c = i % wordLength;
                                        let bg = "bg-gray-200";
                                        if (r < opponentHistory.length) {
                                            const state = opponentHistory[r].result[c];
                                            if (state === "correct") bg = "bg-green-600";
                                            else if (state === "present") bg = "bg-yellow-400";
                                            else if (state === "absent") bg = "bg-gray-400";
                                        }
                                        return <div key={i} className={`w-4 h-4 ${bg}`} />;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                className="w-full max-w-[90vw] sm:w-96 lg:w-110 grid gap-0.5 sm:gap-1"
                style={{
                    aspectRatio: `${wordLength}/${maxGuesses}`,
                    gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${maxGuesses}, minmax(0, 1fr))`,
                } as React.CSSProperties}
            >
                {Array.from({ length: wordLength * maxGuesses }).map((_, index) => {
                    const r = Math.floor(index / wordLength);
                    const c = index % wordLength;

                    let letter = "";
                    let bg = "bg-white";
                    let text = "text-black";

                    if (r < history.length) {
                        const { guess, result } = history[r];
                        letter = guess[c];
                        if (result[c] === "correct") {
                            bg = "bg-green-600";
                            text = "text-white";
                        } else if (result[c] === "present") {
                            bg = "bg-yellow-400";
                            text = "text-white";
                        } else if (result[c] === "absent") {
                            bg = "bg-gray-400";
                            text = "text-white";
                        }
                    } else if (r === history.length && c < current.length) {
                        letter = current[c];
                    }

                    return (
                        <div
                            key={index}
                            className={`flex items-center justify-center text-3xl font-bold relative overflow-hidden ${letter && r === history.length ? "animate-pop" : ""
                                }`}
                            style={{ perspective: "1000px" }}
                        >
                            <div
                                className={`w-full h-full [transform-style:preserve-3d] ${r < history.length ? "animate-flip" : ""
                                    }`}
                                style={r < history.length ? { animationDelay: `${c * 150}ms` } : {}}
                            >
                                <div className="absolute w-full h-full flex items-center justify-center [backface-visibility:hidden] bg-white text-black border-2 border-gray-300">
                                    {letter}
                                </div>
                                <div
                                    className={`absolute w-full h-full flex items-center justify-center [backface-visibility:hidden] ${bg} ${text}`}
                                    style={{ transform: "rotateX(180deg)" }}
                                >
                                    {letter}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isBoardLoaded && (
                <div className="w-full max-w-[90vw] flex flex-col gap-1 sm:gap-2">
                    {[row1, row2, row3].map((row, rowIdx) => (
                        <div key={rowIdx} className="flex justify-center gap-0.5 sm:gap-1">
                            {row.map((key) => {
                                if (key === "ENTER") {
                                    return (
                                        <Button
                                            key={key}
                                            onClick={() => handleKey(key)}
                                            className={`${getButtonClass(
                                                key
                                            )} w-10 h-5 text-xs sm:text-lg sm:w-20 sm:h-12 sm:font-bold font-normal`}
                                            disabled={guessLoading || !bothJoined}
                                        >
                                            Enter
                                        </Button>
                                    );
                                }
                                if (key === "BACKSPACE") {
                                    return (
                                        <Button
                                            key={key}
                                            onClick={() => handleKey(key)}
                                            className={`${getButtonClass(
                                                key
                                            )} items-center justify-center w-5 h-5 sm:w-12 sm:h-12 sm:font-bold font-normal`}
                                            disabled={guessLoading || !bothJoined}
                                        >
                                            <Delete className="!w-4 !h-4 sm:!w-6 sm:!h-6" />
                                        </Button>
                                    );
                                }
                                return (
                                    <Button
                                        key={key}
                                        onClick={() => handleKey(key)}
                                        className={`${getButtonClass(
                                            key
                                        )} w-5 h-5 text-xs sm:text-lg sm:w-12 sm:h-12 flex sm:font-bold font-normal`}
                                        disabled={guessLoading || !bothJoined}
                                    >
                                        {key}
                                    </Button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {stats && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent
                        className="sm:max-w-md rounded-lg bg-white shadow-xl border border-gray-200"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <div className="relative">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-bold text-center mt-2">
                                    {won ? "Victory!" : "Game over"}
                                </DialogTitle>
                                <DialogDescription className="text-center text-gray-600" asChild>
                                    <div className="mb-4 text-lg">
                                        The word was <span className="font-semibold">{secret}</span>.
                                    </div>
                                </DialogDescription>
                                <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-medium text-gray-500">Wins</span>
                                        <span className="text-xl font-bold text-gray-800">{stats.wins}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-medium text-gray-500">Losses</span>
                                        <span className="text-xl font-bold text-gray-800">
                                            {stats.losses}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-medium text-gray-500">Streak</span>
                                        <span className="text-xl font-bold text-gray-800">
                                            {stats.currentStreak}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => router.push("/")}
                                    className="w-full text-white font-semibold py-2 rounded-lg transition-colors"
                                    disabled={buttonLoading}
                                >
                                    Go home{" "}
                                    {buttonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : ""}
                                </Button>
                            </DialogHeader>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {guessLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}
        </div>
    );
}
