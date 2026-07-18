import AuthLayoutTemplate from '@/layouts/auth/auth-card-layout';

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
        </AuthLayoutTemplate>
    );
}