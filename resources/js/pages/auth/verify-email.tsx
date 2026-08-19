import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import VerifyEmailDialog from '@/components/verify-email-dialog';
import { logout } from '@/routes';

interface Props {
    status?: string;
    email?: string;
}

export default function VerifyEmail({ status, email }: Props) {
    const [open, setOpen] = useState(true);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            router.post(logout());
        }
    };

    return (
        <>
            <Head title="Email Verification" />
            <VerifyEmailDialog
                open={open}
                onOpenChange={handleOpenChange}
                email={email}
                status={status}
            />
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verify Your Email',
    description: 'Please verify your email address to proceed',
};

