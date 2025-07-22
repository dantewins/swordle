"use client"

import { Delete, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function GamePage() {
    const maxGuesses = 6
    const { gameId } = useParams()
    const router = useRouter()
    const [secret, setSecret] = useState<string>('')
    const [definition, setDefinition] = useState<string>('')
    const [partOfSpeech, setPartOfSpeech] = useState<string>('')
    const [wordLength, setWordLength] = useState<number>(0)
    const [history, setHistory] = useState<{ guess: string; result: Result[] }[]>([])
    const [current, setCurrent] = useState<string>('')
    const [keyStates, setKeyStates] = useState<Record<string, Result>>({})
    const [gameOver, setGameOver] = useState<boolean>(false)
    const [won, setWon] = useState<boolean>(false)
    const [streak, setStreak] = useState<number>(0)
    const [isBoardLoaded, setIsBoardLoaded] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const [guessLoading, setGuessLoading] = useState<boolean>(false)
    const [stats, setStats] = useState<{ wins: number; losses: number; currentStreak: number } | null>(null)
    const [buttonLoading, setButtonLoading] = useState<boolean>(false)
    const [dialogOpen, setDialogOpen] = useState<boolean>(false)

    type Result = 'correct' | 'present' | 'absent'

    useEffect(() => {
        const loadGame = async () => {
            if (!gameId) return;

            try {
                const res = await fetch(`/api/game?id=${gameId}`);

                const data = await res.json();
                setDefinition(data.definition || '');
                setPartOfSpeech(data.part_of_speech || '');
                setWordLength(data.wordLength || 0);
                setHistory(data.history || []);
                setGameOver(data.status !== 'started');
                setWon(data.won || false);
                setStats(data.stats || { wins: 0, losses: 0, currentStreak: 0 });
                setStreak(data.stats?.currentStreak ?? 0);
                setDialogOpen(data.status !== 'started');
                setSecret(data.secret || '');
                setIsBoardLoaded(true);

                let newKeyStates: Record<string, Result> = {};
                for (const { guess, result } of data.history || []) {
                    for (let i = 0; i < guess.length; i++) {
                        const char = guess[i];
                        const state = result[i];
                        if (state === 'correct') {
                            newKeyStates[char] = 'correct';
                        } else if (state === 'present' && newKeyStates[char] !== 'correct') {
                            newKeyStates[char] = 'present';
                        } else if (state === 'absent' && !newKeyStates[char]) {
                            newKeyStates[char] = 'absent';
                        }
                    }
                }
                setKeyStates(newKeyStates);
                setLoading(false);
            } catch (error: any) {
                toast.error(error.message || "An unexpected error occurred while creating the game");
            }
        };

        loadGame();
    }, [gameId]);

    const updateKeyStates = (result: Result[], guess: string) => {
        setKeyStates(prev => {
            const next = { ...prev }
            for (let i = 0; i < wordLength; i++) {
                const char = guess[i]
                const state = result[i]
                if (state === 'correct') {
                    next[char] = 'correct'
                } else if (state === 'present' && next[char] !== 'correct') {
                    next[char] = 'present'
                } else if (state === 'absent' && !next[char]) {
                    next[char] = 'absent'
                }
            }
            return next
        })
    }

    const handleGuess = async () => {
        if (current.length !== wordLength || guessLoading) return

        setGuessLoading(true)
        try {
            const res = await fetch('/api/game/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, guess: current })
            })

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to submit guess');
            }

            const { result, isWin, isGameOver, secret: revealedSecret, stats: responseStats } = await res.json()

            setHistory(prev => [...prev, { guess: current, result }])
            updateKeyStates(result, current)

            if (isWin) {
                setWon(true)
                setGameOver(true)
                setDialogOpen(true)
            } else if (isGameOver) {
                setGameOver(true)
                setDialogOpen(true)
            }

            if (isGameOver) {
                setStats(responseStats)
                setSecret(revealedSecret)
                setStreak(responseStats.currentStreak)
            }

            setCurrent('')
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred while creating the game");
        } finally {
            setGuessLoading(false)
        }
    }

    const handleKey = (key: string) => {
        if (gameOver || !isBoardLoaded || guessLoading) return

        if (key === 'BACKSPACE') {
            setCurrent(prev => prev.slice(0, -1))
        } else if (key === 'ENTER') {
            handleGuess()
        } else if (current.length < wordLength && /^[A-Z]$/.test(key)) {
            setCurrent(prev => prev + key)
        }
    }

    const getButtonClass = (key: string): string => {
        const base = 'text-xl font-bold rounded-sm shadow-none'
        if (key === 'ENTER' || key === 'BACKSPACE') {
            return `${base} bg-gray-200 text-black hover:bg-gray-300`
        }
        const state = keyStates[key]
        if (state === 'correct') return `${base} bg-green-600 text-white hover:bg-green-700`
        if (state === 'present') return `${base} bg-yellow-400 text-white hover:bg-yellow-500`
        if (state === 'absent') return `${base} bg-gray-400 text-white hover:bg-gray-500`
        return `${base} bg-gray-200 text-black hover:bg-gray-300`
    }

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (gameOver || !isBoardLoaded || guessLoading) return
            if (e.key === 'Enter') handleKey('ENTER')
            else if (e.key === 'Backspace') handleKey('BACKSPACE')
            else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toUpperCase())
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [gameOver, current, history, wordLength, isBoardLoaded, guessLoading])

    const playAgain = async () => {
        try {
            setButtonLoading(true)

            const res = await fetch("/api/game/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: 'solo' })
            })

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create game");
            }

            const { id } = await res.json()
            toast.success("Game created successfully!", { duration: 2000 });
            setTimeout(() => router.push(`/play/${id}`), 1000);
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred while creating the game");
        } finally {
            setButtonLoading(false)
        }
    }

    const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
    const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
    const row3 = ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']

    if (loading) {
        return <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading game...</p>
        </div>
    }

    return (
        <div className="relative flex min-h-[100vh] flex-col items-center justify-center bg-white gap-4 sm:gap-6 p-4">
            <div className="w-full max-w-[90vw] sm:w-96 lg:w-110 flex justify-between items-center">
                <p className="text-lg text-left max-w-[50%]">"{definition}" ({partOfSpeech})</p>
                <p className="text-lg text-right">🔥{streak}</p>
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
                    const r = Math.floor(index / wordLength)
                    const c = index % wordLength

                    let letter = ''
                    let bg = 'bg-white'
                    let text = 'text-black'
                    let border = 'border-2 border-gray-300'

                    if (r < history.length) {
                        const { guess, result } = history[r]
                        letter = guess[c]

                        border = r < history.length ? 'border-2 border-gray-300' : 'border-0'

                        if (result[c] === 'correct') {
                            bg = 'bg-green-600'
                            text = 'text-white'
                            border = 'border-0'
                        } else if (result[c] === 'present') {
                            bg = 'bg-yellow-400'
                            text = 'text-white'
                            border = 'border-0'
                        } else if (result[c] === 'absent') {
                            bg = 'bg-gray-400'
                            text = 'text-white'
                            border = 'border-0'
                        }
                    } else if (r === history.length && c < current.length) {
                        letter = current[c]
                        border = letter && 'animate-pop' in document.documentElement.style ? 'border-2 border-gray-300' : 'border-2 border-gray-300'
                    }

                    return (
                        <div
                            key={index}
                            className={`flex items-center justify-center text-3xl font-bold relative overflow-hidden ${letter && r === history.length ? 'animate-pop' : ''}`}
                            style={{ perspective: '1000px' }}
                        >
                            <div
                                className={`w-full h-full [transform-style:preserve-3d] ${r < history.length ? 'animate-flip' : ''}`}
                                style={r < history.length ? { animationDelay: `${c * 150}ms` } : {}}
                            >
                                <div className={`absolute w-full h-full flex items-center justify-center [backface-visibility:hidden] bg-white text-black border-2 border-gray-300`}>
                                    {letter}
                                </div>
                                <div className={`absolute w-full h-full flex items-center justify-center [backface-visibility:hidden] ${bg} ${text}`} style={{ transform: 'rotateX(180deg)' }}>
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
                            {row.map(key => {
                                if (key === 'ENTER') {
                                    return (
                                        <Button
                                            key={key}
                                            onClick={() => handleKey(key)}
                                            className={`${getButtonClass(key)} w-10 h-5 text-xs sm:text-lg sm:w-20 sm:h-12 sm:font-bold font-normal`}
                                            disabled={guessLoading}
                                        >
                                            Enter
                                        </Button>
                                    )
                                }

                                if (key === 'BACKSPACE') {
                                    return (
                                        <Button
                                            key={key}
                                            onClick={() => handleKey(key)}
                                            className={`${getButtonClass(key)} items-center justify-center w-5 h-5 sm:w-12 sm:h-12 sm:font-bold font-normal`}
                                            disabled={guessLoading}
                                        >
                                            <Delete className="!w-4 !h-4 sm:!w-6 sm:!h-6" />
                                        </Button>
                                    )
                                }

                                return (
                                    <Button
                                        key={key}
                                        onClick={() => handleKey(key)}
                                        className={`${getButtonClass(key)} w-5 h-5 text-xs sm:text-lg sm:w-12 sm:h-12 flex sm:font-bold font-normal`}
                                        disabled={guessLoading}
                                    >
                                        {key}
                                    </Button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            )}
            {stats && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-lg bg-white shadow-xl border border-gray-200">
                        <div className="relative">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-bold text-center mt-2">
                                    {won ? 'Victory!' : 'Game over'}
                                </DialogTitle>
                                <DialogDescription className="text-center text-gray-600" asChild>
                                    <div className="mb-4 text-lg">
                                        The word was <span className="font-semibold">{secret}</span>.
                                    </div>
                                </DialogDescription>
                                <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-medium text-gray-500">Wins</span>
                                        <span className="text-xl font-bold text-gray-800">{stats.wins}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-medium text-gray-500">Losses</span>
                                        <span className="text-xl font-bold text-gray-800">{stats.losses}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-medium text-gray-500">Streak</span>
                                        <span className="text-xl font-bold text-gray-800">{stats.currentStreak}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={playAgain}
                                    className="w-full text-white font-semibold py-2 rounded-lg transition-colors"
                                    disabled={buttonLoading}
                                >
                                    Play Again {buttonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : ""}
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
    )
}