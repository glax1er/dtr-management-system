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
    console.log('AuthCardLayout received maxWidth:', maxWidth);
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className={`flex w-full ${maxWidth} flex-col gap-6`}>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="px-10 pt-4 pb-0 text-center">
                            {/* for logo, you can use an image or a component */}
                            {/* <img src="/logo.png" alt="Logo" className="mx-auto mb-3 h-12 w-auto" /> */}
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
