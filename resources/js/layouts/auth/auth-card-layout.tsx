import type { PropsWithChildren } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

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
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className={`flex w-full ${maxWidth} flex-col gap-6`}>
                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="text-center">
                            <div className="flex items-end justify-center">
                                <img
                                    src="/images/usep-logo.png"
                                    alt="USEP logo"
                                    className="mb-2 h-12 w-auto object-contain"
                                />
                                <img
                                    src="/images/cims-logo-light.png"
                                    alt="CIC logo"
                                    className="h-27 w-auto object-contain dark:hidden"
                                />
                                <img
                                    src="/images/cims-logo-dark.png"
                                    className="hidden h-27 w-auto object-contain dark:block"
                                    alt="CIC logo dark"
                                />
                                <img
                                    src="/images/cic-logo.png"
                                    alt="App logo"
                                    className="mb-2 h-12 w-auto rounded-full object-contain"
                                />
                            </div>
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-2">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
