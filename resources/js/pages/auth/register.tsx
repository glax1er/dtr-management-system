import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
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

type College = {
    id: number;
    name: string;
    code: string;
    campus?: string | null;
};

type Program = {
    program_id: number;
    college_id?: number | null;
    program_name: string;
};

type Hte = {
    hte_id: number;
    hte_name: string;
    college_id?: number | null;
};

type Props = {
    passwordRules: string;
    registered?: boolean;
    campuses?: string[];
    colleges?: College[];
    programs: Program[];
    htes: Hte[];
};

export default function Register({
    passwordRules,
    registered,
    campuses = [],
    colleges = [],
    programs,
    htes,
}: Props) {
    const [showApprovalDialog, setShowApprovalDialog] = useState(
        registered ?? false,
    );
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [hasReadPolicy, setHasReadPolicy] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    const passwordChecks = useMemo(
        () => [
            { label: 'At least 8 characters', met: passwordInput.length >= 8 },
            {
                label: 'At least 1 uppercase letter (A-Z)',
                met: /[A-Z]/.test(passwordInput),
            },
            {
                label: 'At least 1 lowercase letter (a-z)',
                met: /[a-z]/.test(passwordInput),
            },
            { label: 'At least 1 number (0-9)', met: /\d/.test(passwordInput) },
            {
                label: 'At least 1 symbol (@$!%*#?&)',
                met: /[^A-Za-z0-9]/.test(passwordInput),
            },
        ],
        [passwordInput],
    );

    const [selectedSex, setSelectedSex] = useState<string>('');
    const [selectedCampus, setSelectedCampus] = useState<string>('');
    const [selectedCollege, setSelectedCollege] = useState<string>('');
    const [selectedProgram, setSelectedProgram] = useState<string>('');
    const [selectedHte, setSelectedHte] = useState<string>('');

    const defaultCampuses = useMemo(
        () => ['Mabini', 'Malabog', 'Mintal', 'Obrero', 'Tagum'],
        [],
    );

    const campusOptions = useMemo(
        () =>
            campuses && campuses.length > 0
                ? campuses
                : Array.from(
                      new Set([
                          ...defaultCampuses,
                          ...colleges
                              .map((c) => c.campus)
                              .filter((c): c is string => Boolean(c)),
                      ]),
                  ).sort(),
        [campuses, colleges, defaultCampuses],
    );

    const availableColleges = useMemo(
        () =>
            selectedCampus
                ? colleges.filter((c) => c.campus === selectedCampus)
                : colleges,
        [selectedCampus, colleges],
    );

    const availablePrograms = useMemo(
        () =>
            selectedCollege
                ? programs.filter(
                      (p) => String(p.college_id) === String(selectedCollege),
                  )
                : [],
        [selectedCollege, programs],
    );

    const availableHtes = useMemo(
        () =>
            selectedCollege
                ? htes.filter(
                      (h) => String(h.college_id) === String(selectedCollege),
                  )
                : [],
        [selectedCollege, htes],
    );

    const selectedCollegeObj = useMemo(
        () => colleges.find((c) => String(c.id) === String(selectedCollege)),
        [selectedCollege, colleges],
    );

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (registered) {
            // Rendered after a successful registration redirect, so the approval
            // dialog is intentionally opened from the prop-driven flag.
            setShowApprovalDialog(true);
        }
    }, [registered]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const goToLogin = () => router.visit(login());

    const handlePolicyScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const reachedBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 16;

        if (reachedBottom) {
            setHasReadPolicy(true);
        }
    };

    const getCsrfToken = () => {
        const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

        return match ? decodeURIComponent(match[1]) : '';
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        const formData = new FormData(e.currentTarget);
        const payload: Record<string, any> = {
            name: formData.get('name') ?? '',
            email: formData.get('email') ?? '',
            id_number: formData.get('id_number') ?? '',
            contact_number: formData.get('contact_number') ?? '',
            sex: selectedSex || (formData.get('sex') as string) || '',
            campus: selectedCampus || (formData.get('campus') as string) || '',
            college_id:
                selectedCollege || (formData.get('college_id') as string) || '',
            program_id:
                selectedProgram || (formData.get('program_id') as string) || '',
            hte_id: selectedHte || (formData.get('hte_id') as string) || '',
            password: formData.get('password') ?? '',
            password_confirmation: formData.get('password_confirmation') ?? '',
            privacy_accepted: privacyAccepted,
        };

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 422) {
                const data = await response.json();
                const fieldErrors: Record<string, string> = {};

                if (data.errors) {
                    Object.keys(data.errors).forEach((key) => {
                        fieldErrors[key] = Array.isArray(data.errors[key])
                            ? data.errors[key][0]
                            : data.errors[key];
                    });
                }

                setFormErrors(fieldErrors);
            } else if (response.ok) {
                setVerificationEmail(String(payload.email || ''));
                setShowVerifyModal(true);
            } else {
                const data = await response.json().catch(() => ({}));
                setFormErrors({
                    email:
                        data.message ||
                        'Registration could not be completed. Please try again.',
                });
            }
        } catch {
            setFormErrors({
                email: 'Network connection error. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Head title="Register">
                <link rel="preload" as="image" href="/images/USeP-Eagle-opt.jpg" />
            </Head>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-4">
                    {/* Name / Email */}
                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="name">
                                Full Name{' '}
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
                                disabled={isSubmitting}
                            />
                            <InputError message={formErrors.name} />
                        </div>

                        <div className="grid min-w-0 gap-2">
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
                                disabled={isSubmitting}
                            />
                            <InputError message={formErrors.email} />
                        </div>
                    </div>

                    {/* ID number / Contact number */}
                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
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
                                disabled={isSubmitting}
                            />
                            <InputError message={formErrors.id_number} />
                        </div>

                        <div className="grid min-w-0 gap-2">
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
                                disabled={isSubmitting}
                            />
                            <InputError message={formErrors.contact_number} />
                        </div>
                    </div>

                    {/* Sex & Campus */}
                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="sex">
                                Sex <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                name="sex"
                                value={selectedSex}
                                onValueChange={setSelectedSex}
                                required
                                disabled={isSubmitting}
                            >
                                <SelectTrigger
                                    id="sex"
                                    tabIndex={5}
                                    className="w-full min-w-0 overflow-hidden"
                                >
                                    <SelectValue placeholder="Select sex" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">
                                        Female
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={formErrors.sex} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="campus">
                                Campus <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                name="campus"
                                value={selectedCampus}
                                onValueChange={(val) => {
                                    setSelectedCampus(val);
                                    setSelectedCollege('');
                                    setSelectedProgram('');
                                    setSelectedHte('');
                                }}
                                required
                                disabled={isSubmitting}
                            >
                                <SelectTrigger
                                    id="campus"
                                    tabIndex={6}
                                    className="w-full min-w-0 overflow-hidden"
                                >
                                    <SelectValue placeholder="Select campus" />
                                </SelectTrigger>
                                <SelectContent>
                                    {campusOptions.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={formErrors.campus} />
                        </div>
                    </div>

                    {/* College / Program */}
                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="college_id">
                                College / Department{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                name="college_id"
                                value={selectedCollege}
                                onValueChange={(value) => {
                                    setSelectedCollege(value);
                                    setSelectedProgram('');
                                    setSelectedHte('');
                                }}
                                required
                                disabled={isSubmitting || !selectedCampus}
                            >
                                <SelectTrigger
                                    id="college_id"
                                    tabIndex={7}
                                    className="w-full min-w-0 overflow-hidden"
                                    title={
                                        selectedCollegeObj
                                            ? `${selectedCollegeObj.code} — ${selectedCollegeObj.name}`
                                            : undefined
                                    }
                                >
                                    <SelectValue
                                        placeholder={
                                            selectedCampus
                                                ? availableColleges.length > 0
                                                    ? 'Select college / department'
                                                    : 'No colleges under this campus'
                                                : 'Select campus first'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableColleges.map((college) => (
                                        <SelectItem
                                            key={college.id}
                                            value={String(college.id)}
                                            title={`${college.code} — ${college.name}`}
                                        >
                                            <span className="truncate">
                                                {college.code} — {college.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={formErrors.college_id} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="program_id">
                                Program <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                name="program_id"
                                value={selectedProgram}
                                onValueChange={setSelectedProgram}
                                required
                                disabled={isSubmitting || !selectedCollege}
                            >
                                <SelectTrigger
                                    id="program_id"
                                    tabIndex={8}
                                    className="w-full min-w-0 overflow-hidden"
                                    title={
                                        availablePrograms.find(
                                            (p) =>
                                                String(p.program_id) ===
                                                String(selectedProgram),
                                        )?.program_name
                                    }
                                >
                                    <SelectValue
                                        placeholder={
                                            selectedCollege
                                                ? availablePrograms.length > 0
                                                    ? 'Select program'
                                                    : 'No programs under this college'
                                                : 'Select college first'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePrograms.map((program) => (
                                        <SelectItem
                                            key={program.program_id}
                                            value={String(program.program_id)}
                                            title={program.program_name}
                                        >
                                            <span className="truncate">
                                                {program.program_name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={formErrors.program_id} />
                        </div>
                    </div>

                    {/* HTE (full width) */}
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="hte_id">
                            Host training establishment{' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            name="hte_id"
                            value={selectedHte}
                            onValueChange={setSelectedHte}
                            required
                            disabled={isSubmitting || !selectedCollege}
                        >
                            <SelectTrigger
                                id="hte_id"
                                tabIndex={9}
                                className="w-full min-w-0 overflow-hidden"
                                title={
                                    availableHtes.find(
                                        (h) =>
                                            String(h.hte_id) ===
                                            String(selectedHte),
                                    )?.hte_name
                                }
                            >
                                <SelectValue
                                    placeholder={
                                        selectedCollege
                                            ? availableHtes.length > 0
                                                ? 'Select HTE'
                                                : 'No HTEs under this college'
                                            : 'Select college first'
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {availableHtes.map((hte) => (
                                    <SelectItem
                                        key={hte.hte_id}
                                        value={String(hte.hte_id)}
                                        title={hte.hte_name}
                                    >
                                        <span className="truncate">
                                            {hte.hte_name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={formErrors.hte_id} />
                    </div>

                    {/* Password / Confirm password */}
                    <div className="relative grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        {/* Floating password requirements placed BESIDE the card on desktop */}
                        {passwordInput.length > 0 && (
                            <div className="hidden lg:flex flex-col gap-2 absolute right-[calc(100%+3rem)] top-0 w-64 rounded-xl border border-border/80 bg-card/95 dark:bg-card/90 backdrop-blur-xl p-3.5 shadow-2xl z-40 animate-in fade-in slide-in-from-right-3 duration-200">
                                <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                    <span className="text-[11px] font-semibold tracking-wider text-foreground/85 uppercase">
                                        Password requirements
                                    </span>
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                        {passwordChecks.filter((c) => c.met).length}/{passwordChecks.length}
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    {passwordChecks.map((rule) => (
                                        <div
                                            key={rule.label}
                                            className={
                                                rule.met
                                                    ? 'flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400'
                                                    : 'flex items-center gap-2 text-muted-foreground'
                                            }
                                        >
                                            <span
                                                className={`size-4 flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                    rule.met
                                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {rule.met ? '✓' : '•'}
                                            </span>
                                            <span className="leading-tight">{rule.label}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Pointer arrow pointing toward the card */}
                                <div className="absolute -right-1.5 top-7 size-3 rotate-45 border-r border-t border-border/80 bg-card/95 dark:bg-card/90" />
                            </div>
                        )}

                        <div className="relative grid min-w-0 gap-2">
                            <Label htmlFor="password">
                                Password <span className="text-red-500">*</span>
                            </Label>
                            <PasswordInput
                                id="password"
                                required
                                tabIndex={9}
                                autoComplete="new-password"
                                name="password"
                                placeholder="Password"
                                passwordrules={passwordRules}
                                value={passwordInput}
                                onChange={(e) =>
                                    setPasswordInput(e.target.value)
                                }
                                disabled={isSubmitting}
                            />
                            
                            {/* Mobile-only compact overlay: floats below password field without pushing grid layout */}
                            {passwordInput.length > 0 && (
                                <div className="lg:hidden absolute top-[calc(100%+0.25rem)] left-0 w-full rounded-lg border border-border/80 bg-card/95 backdrop-blur-md p-2.5 text-xs shadow-xl z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/50">
                                        <span className="text-[10px] font-semibold tracking-wider text-foreground/80 uppercase">
                                            Password requirements
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {passwordChecks.filter((c) => c.met).length}/{passwordChecks.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {passwordChecks.map((rule) => (
                                            <div
                                                key={rule.label}
                                                className={
                                                    rule.met
                                                        ? 'flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400'
                                                        : 'flex items-center gap-1.5 text-muted-foreground'
                                                }
                                            >
                                                <span className="text-[10px]">{rule.met ? '✓' : '•'}</span>
                                                <span className="leading-snug">{rule.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <InputError message={formErrors.password} />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirm password{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                required
                                tabIndex={10}
                                autoComplete="new-password"
                                name="password_confirmation"
                                placeholder="Confirm password"
                                passwordrules={passwordRules}
                                disabled={isSubmitting}
                            />
                            <InputError
                                message={formErrors.password_confirmation}
                            />
                        </div>
                    </div>

                    {/* privacy policy consent checkbox */}
                    <div className="flex items-start gap-2">
                        <Checkbox
                            id="privacy_accepted"
                            name="privacy_accepted"
                            tabIndex={11}
                            checked={privacyAccepted}
                            disabled={!hasReadPolicy || isSubmitting}
                            onCheckedChange={(checked) =>
                                setPrivacyAccepted(checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="text-sm">
                            <Label
                                htmlFor="privacy_accepted"
                                className="font-normal opacity-50"
                            >
                                I have read and agree to the{' '}
                            </Label>
                            <button
                                type="button"
                                className="cursor-pointer text-foreground underline underline-offset-2 hover:text-blue-800 dark:text-white"
                                onClick={() => setShowPrivacyDialog(true)}
                            >
                                Privacy Policy
                            </button>
                        </div>
                    </div>

                    <InputError message={formErrors.privacy_accepted} />

                    <Button
                        type="submit"
                        className="w-full"
                        tabIndex={11}
                        disabled={!privacyAccepted || isSubmitting}
                        data-test="register-user-button"
                    >
                        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                        Create account
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <TextLink href={login()} tabIndex={12}>
                        Log in
                    </TextLink>
                </div>
            </form>

            {/* Registration Submitted Dialog */}
            <Dialog
                open={showApprovalDialog}
                onOpenChange={(open) => {
                    setShowApprovalDialog(open);

                    if (!open) {
                        goToLogin();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registration submitted</DialogTitle>
                        <DialogDescription>
                            Your account has been created and is now pending
                            approval from an administrator. You'll be able to
                            log in once your registration has been approved.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={goToLogin}>Go to login</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Privacy Policy dialog */}
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

                    <div
                        onScroll={handlePolicyScroll}
                        className="max-h-[30vh] overflow-y-auto pr-2 text-justify text-sm text-muted-foreground"
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
                            disabled={!hasReadPolicy}
                            onClick={() => {
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

            <VerifyEmailDialog
                open={showVerifyModal}
                onOpenChange={setShowVerifyModal}
                email={verificationEmail}
            />
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Enter your details below to create your account',
    maxWidth: 'max-w-xl',
};
