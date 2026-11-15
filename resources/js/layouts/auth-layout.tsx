import type React from 'react';
import { FlashToaster } from '@/components/flash-toaster';
import AuthLayoutTemplate from '@/layouts/auth/auth-card-layout';

export default function AuthLayout({
    title,
    description,
    maxWidth,
    children,
}: {
    title?: string;
    description?: string;
    maxWidth?: string;
    children: React.ReactNode;
}) {
    const pageLayout =
        children &&
        typeof children === 'object' &&
        'type' in children &&
        typeof (children as React.ReactElement).type === 'function'
            ? ((children as React.ReactElement).type as unknown as {
                  layout?: {
                      title?: string;
                      description?: string;
                      maxWidth?: string;
                  };
              }).layout
            : undefined;

    const resolvedTitle = title ?? pageLayout?.title ?? '';
    const resolvedDescription = description ?? pageLayout?.description ?? '';
    const resolvedMaxWidth = maxWidth ?? pageLayout?.maxWidth ?? 'max-w-md';

    return (
        <AuthLayoutTemplate
            title={resolvedTitle}
            description={resolvedDescription}
            maxWidth={resolvedMaxWidth}
        >
            {children}
            <FlashToaster />
        </AuthLayoutTemplate>
    );
}
