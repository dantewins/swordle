"use client"

import { useState } from "react";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import Image from 'next/image';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Division from '@/components/landing/division';
import GameModes from "@/components/landing/game-modes";

const features = [
  {
    id: 1,
    title: "Master SAT Vocabulary Through Engaging Puzzles",
    date: "July 18, 2025",
    imageUrl:
      "https://framerusercontent.com/images/nrnf6fsUlXbEBhqRsgqVzRKEiF4.jpg?scale-down-to=2048",
    alt: "Abstract representation of words forming a puzzle",
  },
  {
    id: 2,
    title: "Daily Challenges to Boost Your Word Knowledge",
    date: "July 18, 2025",
    imageUrl:
      "https://framerusercontent.com/images/W1H8tFK6H8IKNZOBc6gjtpRP1I.jpg?scale-down-to=1024",
    alt: "Geometric pattern symbolizing daily learning",
  },
  {
    id: 3,
    title: "Fun Way to Prepare for SAT with Wordle Mechanics",
    date: "July 18, 2025",
    imageUrl:
      "https://framerusercontent.com/images/ygE08jgxUDqn1kh6jUnQBualh64.jpg?scale-down-to=1024",
    alt: "Sculpture representing intellectual growth",
  },
]

const works = [
  {
    title: "FireFly",
    image: "https://framerusercontent.com/images/NIZVyUxsAfTXib8VDzl1QuAdlUg.png",
  },
  {
    title: "Prola",
    image: "https://framerusercontent.com/images/IwQGpm16IrG3DUIAqlXEFJefk.png?scale-down-to=1024",
  },
  {
    title: "Kozmo",
    image: "https://framerusercontent.com/images/VSuH84MNgmwVbJxtGujcvYqTOIg.png?scale-down-to=1024",
  },
  {
    title: "Slate AI",
    image: "https://framerusercontent.com/images/gnqxx4ffUgrD3uvgo2zKbUeLtk.png?scale-down-to=1024",
  },
  {
    title: "Go Jarvis",
    image: "https://framerusercontent.com/images/SO8PdMYTO2GQIYvbslUHHJmaUQ.png?scale-down-to=1024",
  },
  {
    title: "Trinity",
    image: "https://framerusercontent.com/images/JZTFz167pysdqtJV4zXShLQQ.png?scale-down-to=1024",
  }
];

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

export default function LandingPage() {
  const [showModes, setShowModes] = useState(false);

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
                  variant="outline"
                  className="border-black rounded-full text-sm px-3 py-1 hover:text-white hover:bg-black cursor-pointer"
                  onClick={() => setShowModes(true)}
                >
                  Play
                </Badge>
                <Badge
                  variant="outline"
                  className="border-black rounded-full text-sm px-2 py-1 hover:text-white hover:bg-black cursor-pointer"
                >
                  Leaderboard
                </Badge>
                <Badge
                  variant="outline"
                  className="border-black rounded-full text-sm px-2 py-1 hover:text-white hover:bg-black cursor-pointer"
                >
                  How to play
                </Badge>
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
                {feature.date}
              </p>
              <h2 className="mt-1 text-2xl font-semibold leading-snug transition-opacity duration-300 ease-in-out group-hover:opacity-50">
                {feature.title}
              </h2>
            </div>
          ))}
        </div>
      </div>

      {/* Works section */}
      <div id="leaderboard" className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
        <div className="mt-32 mb-4">
          <Division text="Leaderboard" />
        </div>
        <div className="mt-4 mb-4 grid gap-8 grid-cols-1 grid-rows-3 lg:grid-cols-2">
          {works.map((x, i) => (
            <div key={i} className="h-[73vh] flex items-center justify-center">
              <Card className="w-full h-full rounded-3xl border-none bg-[#f9fafb] cursor-pointer shadow-none p-0 gap-0">
                <CardContent className="p-0">
                  <div className="relative h-[60vh] overflow-hidden">
                    {x.image && (
                      <Image
                        src={x.image}
                        alt={x.title}
                        fill
                        quality={100}
                        className="object-cover transform ease-in-out duration-300 hover:scale-105"
                      />
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col items-start text-left">
                  <h3 className="font-semibold text-3xl">{x.title}</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["UI/UX", "Branding", "Motion"].map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="border-black rounded-full text-sm px-2 py-1 hover:text-white hover:bg-black cursor-pointer"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
        <div className="mt-4 mb-32">
          <div className="h-16 flex items-center justify-center rounded">
            <Button
              variant="outline"
              className="group w-full h-full text-black border-black border-2 rounded-full text-lg px-2 py-1 transition ease-in-out duration-500 hover:text-white hover:bg-black cursor-pointer"
            >
              All case studies{" "}
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
              <AccordionTrigger value="item-1" iconName="Figma">UI Design</AccordionTrigger>
              <AccordionContent>
                Our UI design service focuses on crafting intuitive and visually appealing user interfaces that enhance the overall user experience. We pay meticulous attention to detail, ensuring that every element is thoughtfully designed to optimize usability and engagement. Whether it's for web, mobile, or software applications, we strive to create interfaces that not only look great but also function seamlessly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger value="item-2" iconName="Box">Development</AccordionTrigger>
              <AccordionContent>
                Our development service encompasses a wide range of capabilities, from website development to custom software solutions. We leverage the latest technologies and industry best practices to deliver robust, scalable, and high-performance solutions tailored to our clients' specific needs. Whether you're looking to build a responsive website, a complex web application, or streamline your business processes with custom software, our team of experienced developers is ready to bring your vision to life.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger value="item-3" iconName="Pen">Branding</AccordionTrigger>
              <AccordionContent>
                With our branding service, we help businesses establish a strong and memorable brand identity that sets them apart from the competition. From logo design to brand strategy, we work closely with our clients to develop cohesive brand assets that effectively communicate their values, personality, and vision. Whether you're a startup looking to make a splash or an established company in need of a brand refresh, we're here to help you make a lasting impression.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger value="item-4" iconName="MonitorPlay">Animation</AccordionTrigger>
              <AccordionContent>
                Bring your ideas to life with our animation service. Whether you're looking to create eye-catching explainer videos, dynamic motion graphics, or immersive 3D animations, we have the expertise to turn your concepts into captivating visual experiences. Our talented animators combine creativity with technical skill to deliver animations that engage and delight audiences across various platforms and mediums.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger value="item-5" iconName="Film">Motion</AccordionTrigger>
              <AccordionContent>
                Elevate your digital presence with our motion design service. From interactive website elements to captivating social media content, we specialize in creating dynamic motion graphics that enhance user engagement and brand storytelling. Whether it's adding subtle animations to enhance user interactions or producing full-motion videos to showcase your products or services, we'll help you stand out in today's crowded digital landscape.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
        <div className="mb-16">
          <footer className="h-[45rem] bg-[#171616] text-white rounded-[50px] flex flex-col px-4">
            {/* Main Content (Headline + CTA) */}
            <div className="mt-10 mx-auto max-w-7xl w-full text-center flex-grow flex flex-col items-center justify-center">
              <h2 className="font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[-0.05em]">
                Let’s create your
                <br />
                next big idea.
              </h2>

              <div className="mt-12">
                <Button
                  variant="outline"
                  className="group h-full text-black rounded-full text-lg py-3 transition ease-in-out duration-500 cursor-pointer"
                >
                  Schedule a call{" "}
                  <ArrowRight
                    style={{ width: "1.5rem", height: "1.5rem" }}
                    className="transition-transform duration-1000 ease-in-out transform group-hover:rotate-[360deg]"
                  />
                </Button>
              </div>
            </div>

            {/* Bottom Nav + Copyright */}
            <div className="mx-auto max-w-7xl w-full text-center mb-28 font-semibold">
              <nav className="flex flex-wrap justify-center gap-6 text-md sm:text-lg">
                <a href="#" className="transition duration-300 ease-in-out hover:opacity-75">
                  Home
                </a>
                <a href="#" className="transition duration-300 ease-in-out hover:opacity-75">
                  Case studies
                </a>
                <a href="#" className="transition duration-300 ease-in-out hover:opacity-75">
                  About
                </a>
                <a href="#" className="transition duration-300 ease-in-out hover:opacity-75">
                  Contact
                </a>
                <a href="#" className="transition duration-300 ease-in-out hover:opacity-75">
                  Blog
                </a>
                <a href="#" className="transition duration-300 ease-in-out hover:opacity-75">
                  Terms
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </div>

      {showModes && <GameModes onClose={() => setShowModes(false)} />}
    </>
  );
}