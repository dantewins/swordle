"use client";

import { Button } from '@/components/ui/button';
// import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';

export function Header() {
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <header className="border-b border-gray-300">
            <div className="px-4 sm:px-12 sm:mx-auto sm:max-w-7xl">
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center space-x-2">
                        <Link href="/">
                            <div className="relative h-12 w-[33px]">
                                <Image
                                    src="/logo.jpg"
                                    alt="@shadcn"
                                    fill
                                    sizes="100px"
                                    priority
                                    className="object-cover rounded-full"
                                />
                            </div>
                        </Link>
                    </div>
                    <nav className="hidden sm:flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => scrollToSection('features')}>
                            Features
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => scrollToSection('leaderboard')}>
                            Leaderboard
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => scrollToSection('questions')}>
                            Questions
                        </Button>
                        <Link href="/auth/login">
                            <Button size="sm">
                                Login
                            </Button>
                        </Link>
                        {/* <Avatar className='ml-2'>
                            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar> */}
                    </nav>
                </div>
            </div>
        </header>
    );
}
