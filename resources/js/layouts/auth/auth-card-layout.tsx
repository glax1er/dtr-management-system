import { Moon, Sun } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAppearance } from '@/hooks/use-appearance';

export default function AuthCardLayout({
    children,
    title,
    description,
    maxWidth = 'max-w-md',
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
    maxWidth?: string;
}>) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const toggleTheme = () => {
        updateAppearance(isDark ? 'light' : 'dark');
    };

    const isWide = maxWidth?.includes('xl') || maxWidth?.includes('2xl');

    return (
        <div className="relative min-h-svh w-full flex items-center justify-center overflow-x-hidden overflow-y-auto selection:bg-primary selection:text-primary-foreground py-10 px-4 sm:px-8 lg:px-12">

            {/* ── Background: USeP Eagle photograph (optimized 720KB vs 4.3MB) ── */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105 pointer-events-none"
                style={{ backgroundImage: "url('/images/USeP-Eagle-opt.jpg')" }}
            />

            {/* ── Background: Rich deep maroon brand overlay ── */}
            <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#180204]/90 via-[#2a060d]/80 to-[#120103]/90 pointer-events-none" />

            {/* ── Background: Subtle vignette to frame the stage ── */}
            <div
                className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10, 2, 4, 0.65) 100%)',
                }}
            />

            {/* ── Theme toggle button (top right) ── */}
            <div className="fixed top-4 right-4 z-30 sm:top-6 sm:right-6">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="size-9.5 rounded-xl border border-white/15 bg-black/25 text-white/80 hover:bg-black/40 hover:text-white backdrop-blur-md shadow-lg cursor-pointer transition-all"
                    aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                    title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                    {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
            </div>

            {/* ── Harmonious Split Container (Left: Branding, Right: Auth Card) ── */}
            <div
                className={`relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-12 xl:gap-16 py-6 ${
                    isWide ? 'max-w-7xl' : 'max-w-6xl'
                }`}
            >

                {/* ── LEFT SIDE: Branding & Headline ── */}
                <div
                    className={`${
                        isWide ? 'lg:col-span-5' : 'lg:col-span-7'
                    } flex flex-col gap-6 text-center lg:text-left items-center lg:items-start`}
                >

                    {/* Logos reverted back (no background) */}
                    <div className="flex items-end justify-center lg:justify-start">
                        <img
                            src="/images/usep-logo.png"
                            alt="USeP logo"
                            className="mb-2 h-12 w-auto object-contain drop-shadow-md"
                        />
                        <img
                            src="/images/uims-logo-dark.png?v=5"
                            alt="UIMS logo"
                            className="h-24 sm:h-27 w-auto object-contain drop-shadow-md"
                        />
                        <img
                            src="/images/cic-logo.png"
                            alt="CIC logo"
                            className="mb-1 h-14 w-auto rounded-full object-contain drop-shadow-md"
                        />
                    </div>

                    {/* System Name / Headline */}
                    <div className="space-y-3">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12] drop-shadow-md">
                            USeP Internship <br />
                            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                                Management System
                            </span>
                        </h1>
                        <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                            A centralized portal connecting interns, faculty coordinators, and host training establishments for automated time records, document compliance, and real-time evaluation.
                        </p>
                    </div>

                    {/* Stepped accent bar */}
                    <div className="flex items-center gap-2 pt-1 justify-center lg:justify-start">
                        <div className="h-1 w-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
                        <div className="h-1 w-5 bg-white/30 rounded-full" />
                        <div className="h-1 w-2 bg-white/20 rounded-full" />
                    </div>
                </div>

                {/* ── RIGHT SIDE: The Auth Card ── */}
                <div
                    className={`${
                        isWide ? 'lg:col-span-7' : 'lg:col-span-5'
                    } flex justify-center lg:justify-end w-full`}
                >
                    <div className={`w-full ${isWide ? 'max-w-2xl' : 'max-w-[460px]'}`}>
                        <Card className="w-full rounded-2xl border border-border/70 bg-card/95 dark:bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/40">
                            <CardHeader className="text-center px-6 pt-7 sm:px-9 sm:pt-8 pb-3">
                                {title && (
                                    <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                        {title}
                                    </CardTitle>
                                )}
                                {description && (
                                    <CardDescription className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                                        {description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="px-6 pb-7 sm:px-9 sm:pb-8 pt-1">
                                {children}
                            </CardContent>
                        </Card>

                        {/* Bottom assistance note */}
                        <p className="text-center text-xs text-white/60 mt-4">
                            Need assistance? Contact administrator.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
