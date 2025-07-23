"use client"

import { useState, useEffect } from "react";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Division from '@/components/landing/division';
import GameModes from "@/components/landing/game-modes";
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";
import { useUserAuth } from '@/context/AuthContext';

const features = [
  {
    id: 1,
    title: "Master SAT Vocabulary Through Engaging Puzzles",
    tag: "Core Gameplay",
    imageUrl:
      "https://framerusercontent.com/images/nrnf6fsUlXbEBhqRsgqVzRKEiF4.jpg?scale-down-to=2048",
    alt: "Abstract representation of words forming a puzzle",
  },
  {
    id: 2,
    title: "Daily Challenges to Boost Your Word Knowledge",
    tag: "Daily Practice",
    imageUrl:
      "https://framerusercontent.com/images/W1H8tFK6H8IKNZOBc6gjtpRP1I.jpg?scale-down-to=1024",
    alt: "Geometric pattern symbolizing daily learning",
  },
  {
    id: 3,
    title: "Fun Way to Prepare for SAT with Wordle Mechanics",
    tag: "Educational Fun",
    imageUrl:
      "https://framerusercontent.com/images/ygE08jgxUDqn1kh6jUnQBualh64.jpg?scale-down-to=1024",
    alt: "Sculpture representing intellectual growth",
  },
]

const palette = {
  y: "bg-yellow-400",
  n: "bg-gray-400",
  g: "bg-green-600",
} as const;

type SquareKey = keyof typeof palette;

const squares: SquareKey[] = [
  "n", "n", "n", "n", "n",
  "n", "n", "g", "y", "n",
  "y", "n", "g", "n", "n",
  "n", "y", "g", "n", "y",
  "g", "g", "g", "g", "g",
];

interface LeaderboardEntry {
  name: string;
  wins: number;
  avatar: string;
}

export default function LandingPage() {
  const [showModes, setShowModes] = useState(false);
  const [ongoingGameId, setOngoingGameId] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const { user } = useUserAuth();
  const router = useRouter();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setOngoingGameId(null);
      return;
    }

    let cancelled = false;
    async function fetchOngoingGame() {
      try {
        const res = await fetch('/api/games?status=started');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          const latest = data
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          [0];
          if (!cancelled) setOngoingGameId(latest.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchOngoingGame();

    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke('leaderboard', {
          method: 'GET',
        });
        if (error) {
          console.error('Error fetching leaderboard:', error);
          return;
        }
        if (data && Array.isArray(data)) {
          const mappedData = data.map((entry: any) => ({
            name: entry.username || 'Anonymous',
            wins: entry.wins,
            avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(entry.user_id)}`,
          }));
          setLeaderboardEntries(mappedData);
        }
      } catch (error) {
        console.error('Unexpected error fetching leaderboard:', error);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <>
      {/* Hero section */}
      <div className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
        <div className="my-16">
          <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-24 gap-4 items-center">
            <h1 className="text-6xl lg:text-8xl leading-tight font-bold tracking-[-0.06em]">
              <span>
                Swordle.
                <br />
                SAT Wordle
              </span>
            </h1>
            <div className="flex flex-col gap-6">
              <p className="text-3xl leading-snug font-semibold tracking-[-0.05em]">
                Swordle is a Wordle-inspired game that challenges players with SAT-level vocabulary, helping students prepare for the exam while having fun.
              </p>
              <div className="flex gap-2">
                <Badge
                  id="play-button"
                  variant="outline"
                  className="border-black rounded-full text-sm px-3 py-1 hover:text-white hover:bg-black cursor-pointer"
                  onClick={() => setShowModes(true)}
                >
                  Play
                </Badge>
                <Badge
                  variant="outline"
                  className="border-black rounded-full text-sm px-2 py-1 hover:text-white hover:bg-black cursor-pointer"
                  onClick={() => scrollToSection('leaderboard')}
                >
                  Leaderboard
                </Badge>
                {ongoingGameId && (
                  <Badge
                    variant="outline"
                    className="border-black rounded-full text-sm px-2 py-1 hover:text-white hover:bg-black cursor-pointer"
                    onClick={() => router.push(`/play/${ongoingGameId}`)}
                  >
                    Rejoin
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="my-16 lg:my-24">
          <div className="grid gap-2 sm:gap-4 grid-cols-5 mx-0 sm:mx-6 md:mx-15 lg:mx-25 xl:mx-10">
            {
              squares.map((square, i) => (
                <div className='flex items-center justify-center' key={i}>
                  <div className={`h-20 w-20 sm:h-25 sm:w-25 md:h-30 md:w-30 lg:h-36 lg:w-36 xl:h-48 xl:w-48 ${palette[square]}`} />
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Features section */}
      <div id="features" className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
        <div className="mb-4">
          <Division text="Features" />
        </div>
        <div className="mb-32 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.id} className="group flex flex-col cursor-pointer">
              <div className="relative h-96 w-full rounded-3xl overflow-hidden">
                <Image
                  src={feature.imageUrl}
                  alt={feature.alt}
                  fill
                  quality={100}
                  className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground transition-opacity duration-300 ease-in-out group-hover:opacity-50">
                {feature.tag}
              </p>
              <h2 className="mt-1 text-2xl font-semibold leading-snug transition-opacity duration-300 ease-in-out group-hover:opacity-50">
                {feature.title}
              </h2>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard section */}
      <div id="leaderboard" className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
        <div className="mt-32 mb-4">
          <Division text="Leaderboard" />
        </div>
        <div className="mt-4 mb-4 grid gap-1 grid-cols-1">
          {leaderboardEntries.map((entry, i) => (
            <div key={i} className="flex items-center justify-center py-2 hover:scale-101 transition-transform duration-300 ease-in-out">
              <div className="w-full h-20 flex items-center rounded-lg border-none bg-[#f9fafb] shadow-none">
                <div className="flex items-center justify-between w-full text-left mx-6">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-10 h-10 text-xl font-semibold border-2 border-black rounded-lg">{i + 1}</span>
                    <Image
                      src={entry.avatar}
                      alt={`${entry.name} avatar`}
                      width={40}
                      height={40}
                    />
                    <h3 className="font-semibold text-lg">{entry.name}</h3>
                  </div>
                  <span className="flex items-center gap-1 text-lg">
                    {entry.wins}
                    <Trophy className="w-5 h-5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 mb-32">
          <div className="h-16 flex items-center justify-center rounded">
            <Button
              variant="outline"
              className="group w-full h-full text-black border-black border-2 rounded-full text-lg px-2 py-1 transition ease-in-out duration-500 hover:text-white hover:bg-black cursor-pointer"
            >
              View full leaderboard{" "}
              <ArrowRight
                style={{ width: "1.5rem", height: "1.5rem" }}
                className="transition-transform duration-1000 ease-in-out transform group-hover:rotate-[360deg]"
              />
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ section */}
      <div id="questions" className="mx-auto px-4 sm:px-12 sm:max-w-7xl">
        <div className="mt-32 mb-4">
          <Division text="Questions" />
        </div>
        <div className="mt-4 mb-32">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger value="item-1" iconName="HelpCircle">How do I play Swordle?</AccordionTrigger>
              <AccordionContent>
                Swordle is played like Wordle but with SAT-level words. You get 6 guesses to figure out the secret word based on a given definition and part of speech. Green means correct letter in the right position, yellow means correct letter in the wrong position, and gray means the letter isn't in the word.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger value="item-2" iconName="BookOpen">What is SAT Vocabulary?</AccordionTrigger>
              <AccordionContent>
                SAT vocabulary refers to advanced words commonly tested on the SAT exam. Swordle uses a curated list of these words to help players expand their vocabulary in a fun, interactive way through daily puzzles and solo games.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger value="item-3" iconName="Users">Can I play with friends?</AccordionTrigger>
              <AccordionContent>
                Yes! Swordle supports multiplayer modes where you can challenge friends to guess the same word or compete in real-time. Check out the game modes for more options like solo, daily, and multiplayer.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger value="item-4" iconName="Trophy">How does the leaderboard work?</AccordionTrigger>
              <AccordionContent>
                The leaderboard ranks players based on wins, streaks, and total games played. Climb the ranks by winning games and maintaining long streaks. Daily challenges contribute to your overall stats.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger value="item-5" iconName="Calendar">Are there daily puzzles?</AccordionTrigger>
              <AccordionContent>
                Absolutely! Swordle offers a new daily puzzle every day with a unique SAT word. Complete it to build your streak and compare your performance with others on the leaderboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
        <div className="mb-16">
          <footer className="h-[45rem] bg-[#171616] text-white rounded-[50px] flex flex-col justify-between px-4">
            <div className="mt-6 mx-auto max-w-7xl w-full text-center flex-1 flex flex-col items-center justify-center">
              <h2 className="font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[-0.05em]">
                Ready to Master
                <br />
                the SAT?
              </h2>
              <div className="mt-10">
                <Button
                  variant="outline"
                  className="group h-full text-black rounded-full text-lg !py-3 transition ease-in-out duration-500 cursor-pointer"
                  size="lg"
                  onClick={() => scrollToSection('play-button')}
                >
                  Play now{" "}
                  <ArrowRight
                    style={{ width: "1.5rem", height: "1.5rem" }}
                    className="transition-transform duration-1000 ease-in-out transform group-hover:rotate-[360deg]"
                  />
                </Button>
              </div>
              <a href="#" className="mt-12 transition duration-300 ease-in-out hover:opacity-75 text-md sm:text-lg">
                Made with ❤️ by Danny Kim
              </a>
            </div>
          </footer>

        </div>
      </div>

      {showModes && <GameModes onClose={() => setShowModes(false)} />}
    </>
  );
}