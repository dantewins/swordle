"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation'
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface GameModesProps {
  onClose: () => void;
}

const palette = {
  0: "bg-gradient-to-br from-yellow-400 to-yellow-600",
  1: "bg-gradient-to-br from-gray-500 to-gray-700",
  2: "bg-gradient-to-br from-green-500 to-green-700",
} as const;

type ModeKey = keyof typeof palette;

interface Mode {
  id: ModeKey;
  type: string;
  title: string;
  description: string;
  alt: string;
  icon: string;
  disabled: boolean;
}

const modes: Mode[] = [
  {
    id: 0,
    type: 'solo',
    title: "Solo",
    description: "Study random words based on definitions with classic Wordle rules.",
    alt: "Solo puzzle abstraction",
    icon: "🧩",
    disabled: false,
  },
  {
    id: 1,
    type: 'multiplayer',
    title: "Multiplayer",
    description: "Join a queue, match with an opponent, and compete to guess the SAT word in fewer attempts.",
    alt: "Competitive geometric pattern",
    icon: "🏆",
    disabled: true,
  },
  {
    id: 2,
    type: 'daily_challenge',
    title: "Daily challenge",
    description: "Tackle the daily SAT word puzzle shared by everyone. Track your streak and compare scores.",
    alt: "Daily intellectual sculpture",
    icon: "📅",
    disabled: true
  },
];

export default function GameModes({ onClose }: GameModesProps) {
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState<boolean[]>(new Array(modes.length).fill(false));
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<String>("");
  const router = useRouter();

  const generateGame = async (type: string) => {
    try {
      setLoading(true);
      setSelected(type);

      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create game");
      }

      const game = await res.json();
      if (!game?.id) {
        throw new Error("Invalid game ID received");
      }

      toast.success("Game created successfully!", { duration: 2000 });
      setTimeout(() => router.push(`/play/${game.id}`), 1000);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        router.push('/auth/login');
      } else {
        toast.error(error.message || "An unexpected error occurred while creating the game");
      }
    } finally {
      setLoading(false)
      setSelected("");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setBackdropVisible(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (backdropVisible) {
      const timer = setTimeout(() => {
        const timers = modes.map((_, index) => {
          return setTimeout(() => {
            setCardsVisible((prev) => {
              const newVisible = [...prev];
              newVisible[index] = true;
              return newVisible;
            });
          }, index * 200);
        });
        return () => timers.forEach(clearTimeout);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [backdropVisible]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    modes.map((_, index) => {
      return setTimeout(() => {
        setCardsVisible((prev) => {
          const newVisible = [...prev];
          newVisible[modes.length - 1 - index] = false;
          return newVisible;
        });
      }, index * 200);
    });
    setTimeout(() => {
      setBackdropVisible(false);
      setTimeout(onClose, 900);
    }, modes.length * 200);
  };

  const backdropAnimation = isExiting ? "animate-ripples-exit" : backdropVisible ? "animate-ripples-enter" : "";
  const backdropStyle = (!backdropVisible && !isExiting) ? { clipPath: "circle(0 at 50% 50%)" } : {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${backdropAnimation}`}
        style={backdropStyle}
      />
      <div
        className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto px-4 py-6 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {modes.map((mode, index) => (
          <Card
            className={`border-none w-full max-w-md mx-auto ${palette[mode.id]} overflow-hidden rounded-none shadow-xl ${cardsVisible[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} hover:scale-103 hover:shadow-2xl sm:cursor-pointer transition-all duration-300 ease-in-out ${!mode.disabled && !loading ? 'lg:cursor-default cursor-pointer' : ''}`}
            key={index}
            onClick={() => {
              if (!mode.disabled && !loading) {
                generateGame(mode.type);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold text-white">
                {mode.title} {loading && selected === mode.type && <Loader2 className="inline-block h-4 w-4 animate-spin ml-2" />}
              </CardTitle>
              <span className="text-4xl">{mode.icon}</span>
            </CardHeader>
            <CardContent className="lg:min-h-[120px] min-h-0 hidden lg:inline">
              <CardDescription className="text-white/90 text-md">{mode.description}</CardDescription>
            </CardContent>
            <CardFooter className="flex justify-end items-end hidden h-0 lg:flex lg:h-24">
              <Button 
                variant="default" 
                className="bg-white/20 backdrop-blur-sm flexed items-center justify-center transition ease-in-out hover:bg-white/10 hover:cursor-pointer" 
                onClick={() => generateGame(mode.type)} 
                disabled={mode.disabled || (loading && selected === mode.type)}
              >
                {mode.disabled ? "Coming soon..." : "Play Now"} {loading && selected === mode.type ? <Loader2 className="h-4 w-4 animate-spin" /> : ""}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}