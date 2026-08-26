export type User = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'supervisor' | 'intern';
    supervisor_type?: 'hte' | 'ojt' | null;
    is_hte_supervisor?: boolean;
    is_ojt_supervisor?: boolean;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Notification = {
    id: string;
    type: 'resolution_ticket' | string;
    title: string;
    message: string;
    href: string;
    read_at?: string | null;
    created_at?: string | null;
};

export type Auth = {
    user: User;
};

export type Notifications = {
    count: number;
    items: Notification[];
};

export type PageProps = {
    auth: Auth;
    notifications?: Notifications;
    flash?: {
        success?: string | null;
        error?: string | null;
    };
    [key: string]: unknown;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};