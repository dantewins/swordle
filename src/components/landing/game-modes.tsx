"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const palette = {
  0: "bg-gradient-to-br from-yellow-400 to-yellow-600",
  1: "bg-gradient-to-br from-gray-500 to-gray-700",
  2: "bg-gradient-to-br from-green-500 to-green-700",
} as const;

interface Mode {
  id: keyof typeof palette;
  type: "solo" | "multiplayer" | "daily_challenge";
  title: string;
  description: string;
  icon: string;
  disabled: boolean;
}

const modes: Mode[] = [
  {
    id: 0,
    type: "solo",
    title: "Solo",
    description: "Study random words based on definitions with classic Wordle rules.",
    icon: "🧩",
    disabled: false,
  },
  {
    id: 1,
    type: "multiplayer",
    title: "Multiplayer",
    description: "Join a queue, match with an opponent, and compete to guess the SAT word in fewer attempts.",
    icon: "🏆",
    disabled: false,
  },
  {
    id: 2,
    type: "daily_challenge",
    title: "Daily challenge",
    description: "Tackle the daily SAT word puzzle shared by everyone. Track your streak and compare scores.",
    icon: "📅",
    disabled: true,
  },
];

export default function GameModes({
  onClose,
  onQueueRequest,
  queueing,
  setQueueing,
  queueingRef,
}: {
  onClose: () => void;
  onQueueRequest: () => void;
  queueing: boolean;
  setQueueing: (value: boolean) => void;
  queueingRef: React.MutableRefObject<boolean>;
}) {
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState<boolean[]>(
    new Array(modes.length).fill(false)
  );
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);
  const [activeGames, setActiveGames] = useState<{ solo?: number; multiplayer?: number }>({});
  const router = useRouter();

  useEffect(() => {
    const loadActives = async () => {
      try {
        const [soloRes, multiRes] = await Promise.all([
          fetch("/api/games?type=solo&status=started"),
          fetch("/api/games?type=multiplayer&status=started"),
        ]);
        const next: { solo?: number; multiplayer?: number } = {};
        if (soloRes.ok) {
          const rows = await soloRes.json();
          if (Array.isArray(rows) && rows[0]?.games?.id) next.solo = rows[0].games.id;
        }
        if (multiRes.ok) {
          const rows = await multiRes.json();
          if (Array.isArray(rows) && rows[0]?.games?.id) next.multiplayer = rows[0].games.id;
        }
        setActiveGames(next);
      } catch {
        /* ignore */
      }
    };
    loadActives();
  }, []);

  const generateGame = async (type: "solo" | "multiplayer") => {
    try {
      setLoading(true);
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create game");
      if (!data?.id) throw new Error("Invalid game ID received");

      toast.success("Game created successfully!", { duration: 2000 });

      if (type === "multiplayer") {
        queueingRef.current = true;
        setQueueing(true);
        onQueueRequest();
        return;
      }

      setTimeout(() => router.push(`/play/${data.id}`), 1000);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        router.push("/auth/login");
      } else {
        toast.error(error.message || "An unexpected error occurred while creating the game");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSolo = () => {
    if (activeGames.solo) {
      router.push(`/play/${activeGames.solo}`);
    } else {
      generateGame("solo");
    }
  };

  const handleMultiplayer = () => {
    if (activeGames.multiplayer) {
      router.push(`/play/${activeGames.multiplayer}`);
      return;
    }
    if (queueing || queueingRef.current) return;

    queueingRef.current = true;
    setQueueing(true);
    onQueueRequest();
  };

  useEffect(() => {
    const timer = setTimeout(() => setBackdropVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!backdropVisible) return;
    const timer = setTimeout(() => {
      const timers = modes.map((_, index) =>
        setTimeout(() => {
          setCardsVisible((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
          });
        }, index * 200)
      );
      return () => timers.forEach(clearTimeout);
    }, 700);
    return () => clearTimeout(timer);
  }, [backdropVisible]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)");
    const update = () => setIsLgUp(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    modes.forEach((_, index) => {
      setTimeout(() => {
        setCardsVisible((prev) => {
          const next = [...prev];
          next[modes.length - 1 - index] = false;
          return next;
        });
      }, index * 200);
    });
    setTimeout(() => {
      setBackdropVisible(false);
      setTimeout(onClose, 900);
    }, modes.length * 200);
  };

  const backdropAnimation = isExiting
    ? "animate-ripples-exit"
    : backdropVisible
      ? "animate-ripples-enter"
      : "";
  const backdropStyle =
    !backdropVisible && !isExiting ? { clipPath: "circle(0 at 50% 50%)" } : {};
  const isBusy = loading || queueing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${backdropAnimation}`}
        style={backdropStyle}
      />
      <div
        className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto px-4 py-6 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {modes.map((mode, index) => {
          const rejoinId =
            mode.type === "solo" ? activeGames.solo : mode.type === "multiplayer" ? activeGames.multiplayer : undefined;
          const buttonLabel = mode.disabled
            ? "Coming soon..."
            : rejoinId
              ? "Rejoin"
              : "Play Now";
          const busy =
            (loading && mode.type === "solo" && !rejoinId) ||
            (queueing && mode.type === "multiplayer" && !rejoinId);

          return (
            <Card
              key={index}
              className={`border-none w-full max-w-md mx-auto ${palette[mode.id]} overflow-hidden rounded-none shadow-xl ${cardsVisible[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                } hover:scale-103 hover:shadow-2xl sm:cursor-pointer transition-all duration-300 ease-in-out ${!mode.disabled && !isBusy ? "lg:cursor-default cursor-pointer" : ""
                }`}
              onClick={() => {
                if (isLgUp) return;
                if (mode.disabled || queueingRef.current) return;
                if (mode.type === "multiplayer") handleMultiplayer();
                else if (mode.type === "solo") handleSolo();
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-white">
                  {mode.title}
                  <span className="inline-flex lg:hidden">
                    {busy && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
                  </span>
                </CardTitle>
                <span className="text-4xl">{mode.icon}</span>
              </CardHeader>
              <CardContent className="lg:min-h-[120px] min-h-0 hidden lg:inline">
                <CardDescription className="text-white/90 text-md">
                  {mode.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="flex justify-end items-end hidden h-0 lg:flex lg:h-24">
                <Button
                  variant="default"
                  className="bg-white/20 backdrop-blur-sm flexed items-center justify-center transition ease-in-out hover:bg-white/10 hover:cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode.disabled) return;
                    if (mode.type === "multiplayer") handleMultiplayer();
                    else if (mode.type === "solo") handleSolo();
                  }}
                  disabled={mode.disabled || (mode.type === "solo" ? loading && !rejoinId : queueing && !rejoinId)}
                >
                  {buttonLabel}{" "}
                  {busy && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
