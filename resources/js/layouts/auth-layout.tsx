import AuthLayoutTemplate from '@/layouts/auth/auth-card-layout';
import { FlashToaster } from '@/components/flash-toaster';

export default function AuthLayout({
    title = '',
    description = '',
    maxWidth,
    children,
}: {
    title?: string;
    description?: string;
    maxWidth?: string;
    children: React.ReactNode;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} maxWidth={maxWidth}>
            {children}
            <FlashToaster />
        </AuthLayoutTemplate>
    );
}