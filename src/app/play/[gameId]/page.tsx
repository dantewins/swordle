"use client"

import { Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useParams, redirect } from 'next/navigation'

export default function GamePage() {
    const maxGuesses = 6
    const { gameId } = useParams()
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

    type Result = 'correct' | 'present' | 'absent'

    useEffect(() => {
        const loadGame = async () => {
            if (!gameId) return

            try {
                const res = await fetch(`/api/game?id=${gameId}`)
                if (!res.ok) {
                    console.error('Failed to load game')
                    return
                }

                const data = await res.json()
                setDefinition(data.definition)
                setPartOfSpeech(data.part_of_speech)
                setWordLength(data.wordLength)
                setHistory(data.history || [])
                setGameOver(data.status !== 'started')
                setWon(data.won || false)
                if (data.status !== 'started' && !data.won) {
                    setSecret(data.secret || '')
                }
                setIsBoardLoaded(true)

                // Compute keyStates from history
                let newKeyStates: Record<string, Result> = {}
                for (const { guess, result } of data.history || []) {
                    for (let i = 0; i < guess.length; i++) {
                        const char = guess[i]
                        const state = result[i]
                        if (state === 'correct') {
                            newKeyStates[char] = 'correct'
                        } else if (state === 'present' && newKeyStates[char] !== 'correct') {
                            newKeyStates[char] = 'present'
                        } else if (state === 'absent' && !newKeyStates[char]) {
                            newKeyStates[char] = 'absent'
                        }
                    }
                }
                setKeyStates(newKeyStates)

                // Load streak from localStorage
                const savedStreak = localStorage.getItem('streak')
                if (savedStreak) setStreak(parseInt(savedStreak))
            } catch (error) {

            } finally {
                setLoading(false)
            }
        }

        loadGame()
    }, [gameId])

    useEffect(() => {
        localStorage.setItem('streak', streak.toString())
    }, [streak])

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
        if (current.length !== wordLength) return

        try {
            const res = await fetch('/api/game/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, guess: current })
            })

            if (!res.ok) {
                console.error('Failed to submit guess')
                return
            }

            const { result, isWin, isGameOver, secret: revealedSecret } = await res.json()

            setHistory(prev => [...prev, { guess: current, result }])
            updateKeyStates(result, current)

            if (isWin) {
                setWon(true)
                setGameOver(true)
                setStreak(prev => prev + 1)
            } else if (isGameOver) {
                setGameOver(true)
                setStreak(0)
                if (revealedSecret) setSecret(revealedSecret)
            }

            setCurrent('')
        } catch (error) {
            console.error('Error submitting guess:', error)
        }
    }

    const handleKey = (key: string) => {
        if (gameOver || !isBoardLoaded) return

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
            if (gameOver || !isBoardLoaded) return

            if (e.key === 'Enter') handleKey('ENTER')
            else if (e.key === 'Backspace') handleKey('BACKSPACE')
            else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toUpperCase())
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [gameOver, current, history, wordLength, isBoardLoaded])

    const playAgain = async () => {
        try {
            const res = await fetch("/api/game/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: 'solo' })
            })

            if (!res.ok) {
                console.error('Failed to create new game')
                return
            }

            const { id } = await res.json()
            redirect(`/play/${id}`)
        } catch (error) {
            console.error('Error creating new game:', error)
        }
    }

    const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
    const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
    const row3 = ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']

    if (loading) {
        return <div className="flex min-h-[91vh] items-center justify-center">Loading game...</div>
    }

    return (
        <div className="flex min-h-[91vh] flex-col items-center justify-center bg-white gap-4 sm:gap-6 p-4">
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

                    if (r < history.length) {
                        const { guess, result } = history[r]
                        letter = guess[c]

                        if (result[c] === 'correct') {
                            bg = 'bg-green-600'
                            text = 'text-white'
                        } else if (result[c] === 'present') {
                            bg = 'bg-yellow-400'
                            text = 'text-white'
                        } else {
                            bg = 'bg-gray-400'
                            text = 'text-white'
                        }
                    } else if (r === history.length && c < current.length) {
                        letter = current[c]
                    }

                    return (
                        <div
                            key={index}
                            className={`${letter ? '' : 'border-2'} flex items-center justify-center text-3xl font-bold ${letter ? 'border-gray-400' : 'border-gray-300'} relative overflow-hidden ${letter && r === history.length ? 'animate-pop' : ''}`}
                            style={{ perspective: '1000px' }}
                        >
                            <div 
                                className={`w-full h-full [transform-style:preserve-3d] ${r < history.length ? 'animate-flip' : ''}`}
                                style={r < history.length ? { animationDelay: `${c * 150}ms` } : {}}
                            >
                                <div className={`absolute w-full h-full flex items-center justify-center [backface-visibility:hidden] bg-white text-black`}>
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
                                    >
                                        {key}
                                    </Button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            )}
            {gameOver && (
                <div className="text-2xl font-bold mt-4 text-center">
                    <p>{won ? 'You won!' : `Game over! The word was ${secret}.`}</p>
                    <Button onClick={playAgain} className="mt-2">
                        Play Again
                    </Button>
                </div>
            )}
        </div>
    )
}