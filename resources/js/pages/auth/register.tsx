import { Form, Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import VerifyEmailDialog from '@/components/verify-email-dialog';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Program = {
    program_id: number;
    program_name: string;
};

type Hte = {
    hte_id: number;
    hte_name: string;
};

type Props = {
    passwordRules: string;
    verifyEmail?: boolean;
    registeredEmail?: string;
    programs: Program[];
    htes: Hte[];
};

export default function Register({
    passwordRules,
    verifyEmail,
    registeredEmail,
    programs,
    htes,
}: Props) {
    // CHANGED — was showApprovalDialog. Now shows the "verify your email"
    // dialog right after Create Account, instead of a "pending approval"
    // dialog. Approval is still required, but it happens after email
    // verification, so it's mentioned in the dialog copy rather than
    // being the headline.
    const [showVerifyDialog, setShowVerifyDialog] = useState(
        verifyEmail ?? false,
    );

    const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    // ADDED — tracks whether the person has scrolled to the bottom of the
    // policy text. Stays true once reached, even if they scroll back up.
    const [hasReadPolicy, setHasReadPolicy] = useState(false);

    useEffect(() => {
        if (verifyEmail) {
            setShowVerifyDialog(true);
        }
    }, [verifyEmail]);

    const goToLogin = () => router.visit(login());

    // ADDED — fires on every scroll inside the policy text box.
    // Marks the policy as "read" once the user reaches (near) the bottom.
    const handlePolicyScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const reachedBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 16; // small buffer
        if (reachedBottom) {
            setHasReadPolicy(true);
        }
    };

    return (
        <>
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            {/* Name / Email */}
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">
                                        Name{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="name"
                                        name="name"
                                        placeholder="Full name"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        Email address{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        name="email"
                                        placeholder="email@usep.edu.ph"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            {/* ID number / Contact number */}
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="id_number">
                                        ID number{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="id_number"
                                        type="text"
                                        required
                                        tabIndex={3}
                                        autoComplete="off"
                                        name="id_number"
                                        placeholder="e.g. 2021-00123"
                                    />
                                    <InputError message={errors.id_number} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="contact_number">
                                        Contact Number (optional)
                                    </Label>
                                    <Input
                                        id="contact_number"
                                        type="text"
                                        tabIndex={4}
                                        autoComplete="tel"
                                        name="contact_number"
                                        placeholder="09XXXXXXXXX"
                                    />
                                    <InputError
                                        message={errors.contact_number}
                                    />
                                </div>
                            </div>

                            {/* Sex / Program */}
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="sex">
                                        Sex{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Select name="sex" required>
                                        <SelectTrigger
                                            id="sex"
                                            tabIndex={5}
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select sex" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">
                                                Male
                                            </SelectItem>
                                            <SelectItem value="female">
                                                Female
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.sex} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="program_id">
                                        Program{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Select name="program_id" required>
                                        <SelectTrigger
                                            id="program_id"
                                            tabIndex={6}
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select program" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {programs.map((program) => (
                                                <SelectItem
                                                    key={program.program_id}
                                                    value={String(
                                                        program.program_id,
                                                    )}
                                                >
                                                    {program.program_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.program_id} />
                                </div>
                            </div>

                            {/* HTE (full width) */}
                            <div className="grid gap-2">
                                <Label htmlFor="hte_id">
                                    Host training establishment{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select name="hte_id" required>
                                    <SelectTrigger
                                        id="hte_id"
                                        tabIndex={7}
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select HTE" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {htes.map((hte) => (
                                            <SelectItem
                                                key={hte.hte_id}
                                                value={String(hte.hte_id)}
                                            >
                                                {hte.hte_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.hte_id} />
                            </div>

                            {/* Password / Confirm password */}
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">
                                        Password{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        required
                                        tabIndex={8}
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Password"
                                        passwordrules={passwordRules}
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm password{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        tabIndex={9}
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Confirm password"
                                        passwordrules={passwordRules}
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>
                            </div>

                            {/* ADDED — privacy policy consent checkbox */}
                            <div className="flex items-start gap-2">
                                <Checkbox
                                    id="privacy_accepted"
                                    name="privacy_accepted" // matches the backend's validated field name
                                    tabIndex={10}
                                    checked={privacyAccepted} // controlled by React state
                                    // CHANGED — checkbox can't be checked until the policy has been read
                                    disabled={!hasReadPolicy}
                                    onCheckedChange={(checked) =>
                                        setPrivacyAccepted(checked === true)
                                    }
                                    className="mt-0.5"
                                />
                                <Label
                                    htmlFor="privacy_accepted"
                                    className="text-sm font-normal text-muted-foreground"
                                >
                                    I have read and agree to the{' '}
                                    <button
                                        type="button" // prevents this from submitting the form
                                        className="underline underline-offset-2 hover:text-foreground"
                                        onClick={() =>
                                            setShowPrivacyDialog(true)
                                        }
                                    >
                                        Privacy Policy
                                    </button>
                                </Label>
                            </div>

                            {/* ADDED — shows backend validation error if privacy_accepted fails server-side */}
                            <InputError message={errors.privacy_accepted} />

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={11} // CHANGED — was 10, shifted by 1 for the new checkbox
                                disabled={!privacyAccepted} // ADDED — blocks submit until accepted
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={12}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            <VerifyEmailDialog
                open={showVerifyDialog}
                onOpenChange={(open) => {
                    setShowVerifyDialog(open);
                    if (!open) {
                        goToLogin();
                    }
                }}
                email={registeredEmail}
                title="Verify your email"
                description={`We've sent a verification link to ${registeredEmail ?? 'your email address'}. Click it to verify your account. After that, an administrator still needs to approve your registration before you can log in.`}
                secondaryAction={{
                    label: 'Go to login',
                    onClick: goToLogin,
                }}
            />

            {/* ADDED — the Privacy Policy dialog itself, opened by the link above */}
            <Dialog
                open={showPrivacyDialog}
                onOpenChange={setShowPrivacyDialog}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Privacy Policy</DialogTitle>
                        <DialogDescription>
                            Please read before registering.
                        </DialogDescription>
                    </DialogHeader>

                    {/* scrollable policy text so long content doesn't blow up the dialog height */}
                    <div
                        onScroll={handlePolicyScroll}
                        className="max-h-[30vh] overflow-y-auto pr-2 text-sm text-muted-foreground"
                    >
                        <p className="mb-3">
                            This DTR Management System collects your name, email
                            address, ID number, contact number, sex, program,
                            and assigned host training establishment (HTE)
                            solely for the purpose of monitoring your on-the-job
                            training attendance and required hours.
                        </p>
                        <p className="mb-3">
                            Your information will be accessible to your assigned
                            supervisor and system administrators for the purpose
                            of verifying attendance, approving your
                            registration, and generating your Daily Time Record
                            (DTR) reports.
                        </p>
                        <p className="mb-3">
                            Your data will be retained for the duration of your
                            internship and for a reasonable period afterward for
                            academic and reporting purposes, in accordance with
                            the Data Privacy Act of 2012 (RA 10173). Your data
                            will not be shared with third parties outside of
                            this purpose.
                        </p>
                        <p>
                            By accepting this policy, you consent to the
                            collection and processing of your personal
                            information as described above.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            // ADDED — Accept button also blocked until scrolled to bottom
                            disabled={!hasReadPolicy}
                            onClick={() => {
                                // clicking Accept both closes the dialog and checks the box
                                setPrivacyAccepted(true);
                                setShowPrivacyDialog(false);
                            }}
                        >
                            {hasReadPolicy
                                ? 'I Accept'
                                : 'Scroll to read first'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Enter your details below to create your account',
    maxWidth: 'max-w-xl',
};