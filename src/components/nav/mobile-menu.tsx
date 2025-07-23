"use client";

import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Variants } from "framer-motion";
import { useUserAuth } from '@/context/AuthContext';

export function MobileMenu({ scroll }: { scroll: (sectionId: string) => void }) {
    const { user, signOut } = useUserAuth();
    const [open, setOpen] = useState(false);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => setPortalNode(document.body), []);

    useEffect(() => {
        if (open) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY) * -1);
            }
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [open]);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 640px)");

        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches) setOpen(false);
        };

        handleChange(mq);

        mq.addEventListener?.("change", handleChange);

        return () => {
            mq.removeEventListener?.("change", handleChange);
        };
    }, []);

    const slideIn: Variants = {
        show: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 20 },
        },
        exit: {
            opacity: 0,
            transition: { type: "spring", stiffness: 300, damping: 20, delay: 0.4 },
        }
    };

    const iconSpin: Variants = {
        hidden: { rotate: 0 },
        show: { rotate: 360, transition: { duration: 0.3 } },
        exit: { rotate: 0, transition: { duration: 0.3 } },
    };

    const HEADER_OFFSET = "top-20";
    const Z = "z-40";

    const drawer = (
        <AnimatePresence>
            {open && (
                <>
                    <motion.nav
                        key="panel"
                        variants={slideIn}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className={`fixed inset-x-0 bottom-0 ${HEADER_OFFSET} ${Z} flex flex-col bg-background p-4 overflow-y-auto`}
                    >
                        <div className="flex flex-col gap-4 p-4">
                            {["Features", "Leaderboard", "Questions"].map((item, index) => (
                                <motion.p
                                    key={item}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Button variant="ghost" className="w-full justify-start text-xl px-4" size="lg" onClick={() => {
                                        setOpen(false);
                                        setTimeout(() => {
                                            scroll(item.toLowerCase());
                                        }, 400);
                                    }}>
                                        {item}
                                    </Button>
                                </motion.p>
                            ))}
                        </div>
                        <div className="mt-auto flex flex-col gap-1 mb-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    asChild
                                    className="w-full text-lg mb-4"
                                    onClick={() => {
                                        setOpen(false);
                                        scroll('play-button');
                                    }}
                                >
                                    <Link href="#">
                                        Play
                                    </Link>
                                </Button>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ delay: 0.5 }}
                            >
                                {user ? (
                                    <Button
                                        size="lg"
                                        className="w-full text-lg"
                                        onClick={async () => {
                                            await signOut()
                                            setOpen(false);
                                        }}
                                    >
                                        Sign out
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        className="w-full text-lg"
                                        asChild
                                        onClick={() => setOpen(false)}
                                    >
                                        <Link href="/auth/login">
                                            Sign in
                                        </Link>
                                    </Button>
                                )}
                            </motion.div>
                        </div>
                    </motion.nav>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <>
            <button
                onClick={() => setOpen(o => !o)}
                aria-label="Toggle menu"
                className="sm:hidden relative z-50 p-2 rounded-md hover:bg-accent transition"
            >
                <AnimatePresence initial={false} mode="wait">
                    {open ? (
                        <motion.div
                            key="close"
                            variants={iconSpin}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                        >
                            <X className="h-8 w-8" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="menu"
                            variants={iconSpin}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                        >
                            <Menu className="h-8 w-8" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>
            {portalNode && ReactDOM.createPortal(drawer, portalNode)}
        </>
    );
}