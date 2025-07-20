"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface GameModesProps {
  onClose: () => void;
}

export default function GameModes({ onClose }: GameModesProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 800); // Timeout to allow animations to complete
  };

  const modes = [
    {
      title: "Solo Play",
      description: "Practice SAT vocabulary alone. Guess random words based on definitions with classic Wordle rules.",
      imageUrl: "https://framerusercontent.com/images/nrnf6fsUlXbEBhqRsgqVzRKEiF4.jpg?scale-down-to=1024",
      alt: "Solo puzzle abstraction",
      link: "/solo",
    },
    {
      title: "Multiplayer Queue",
      description: "Join a queue, match with an opponent, and compete to guess the SAT word in fewer attempts.",
      imageUrl: "https://framerusercontent.com/images/W1H8tFK6H8IKNZOBc6gjtpRP1I.jpg?scale-down-to=1024",
      alt: "Competitive geometric pattern",
      link: "/multiplayer",
    },
    {
      title: "Daily Challenge",
      description: "Tackle the daily SAT word puzzle shared by everyone. Track your streak and compare scores.",
      imageUrl: "https://framerusercontent.com/images/ygE08jgxUDqn1kh6jUnQBualh64.jpg?scale-down-to=1024",
      alt: "Daily intellectual sculpture",
      link: "/daily",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-[clip-path] duration-500 ease-in-out ${
          isVisible ? "animate-ripples" : ""
        }`}
      />
      {/* <div
        className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-4 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {modes.map((mode, index) => (
          <Card
            key={mode.title}
            className={`w-80 overflow-hidden rounded-none transition-opacity duration-500 ease-in-out ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: isVisible ? `${index * 150}ms` : `${(modes.length - 1 - index) * 150}ms` }}
          >
            <div className="relative h-48">
              <Image
                src={mode.imageUrl}
                alt={mode.alt}
                fill
                quality={100}
                className="object-cover transition-transform duration-300 ease-in-out hover:scale-110"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{mode.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">{mode.description}</CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Link href={mode.link}>
                <Button variant="default" className="bg-black text-white hover:bg-gray-800">
                  Play Now
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div> */}
      <Button
        variant="ghost"
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-20"
        onClick={handleClose}
      >
        <X size={24} />
      </Button>
    </div>
  );
}