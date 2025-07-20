import Image from "next/image"
import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-medium">
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
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block" />
        </div>
    )
}
