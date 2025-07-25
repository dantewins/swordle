<div align="center">
  <a href="https://shipwrecked.hackclub.com/?t=ghrm" target="_blank">
    <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png" 
         alt="This project is part of Shipwrecked, the world's first hackathon on an island!" 
         style="width: 35%;">
  </a>
</div>

# Swordle?

A Wordle-inspired SAT vocabulary game built with Next.js, TypeScript, and Supabase.

## Overview

Swordle challenges players to guess SAT-level vocabulary words in six tries, using Wordle-style feedback (green, yellow, gray). It offers solo practice, daily puzzles, and real-time multiplayer modes, with authentication, data persistence, and real-time updates powered by Supabase. The app is built with Next.js’s App Router, React, and TypeScript, and styled using Tailwind CSS and shadcn/ui components.

## Architecture

## Features

- Wordle-style guessing with definitions and parts of speech for SAT vocabulary
- Solo practice, daily challenges, and real-time multiplayer modes
- User authentication and session management via Supabase Auth
- Persistent game state and stats tracking (wins, losses, streaks)
- Leaderboard showcasing top performers using a Supabase Edge Function
- Responsive design with Tailwind CSS, shadcn/ui, Radix UI, and theme support
- Real-time updates and presence via Supabase Realtime
- Modular codebase leveraging the Next.js App Router and TypeScript

## Installation

```bash
git clone https://github.com/dantewins/swordle.git
cd swordle
npm install
```

## Configuration

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

## Usage

- Run the development server: `npm run dev`
- Open http://localhost:3000 in your browser
- Sign up or log in via `/auth/signup` and `/auth/login`
- Click “Play” to choose a mode and start guessing
- Visit `/play/<gameId>` to continue an ongoing game

## Contributing

- Fork the repository
- Create a feature branch: `git checkout -b feature/your-feature`
- Commit your changes with a descriptive message
- Push to your branch and open a Pull Request

## Acknowledgements

- Next.js – React framework for production
- Supabase – Backend-as-a-Service for auth, database, and realtime
- Tailwind CSS – Utility-first styling
- shadcn/ui & Radix UI – Accessible component libraries
- Lucide React – Icon library
- Sonner – Notification system
- canvas-confetti – Celebration effects
