import { Form, Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
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
    registered?: boolean;
    programs: Program[];
    htes: Hte[];
};

export default function Register({
    passwordRules,
    registered,
    programs,
    htes,
}: Props) {
    const [showApprovalDialog, setShowApprovalDialog] = useState(
        registered ?? false,
    );

    // Inertia redirects back to this same page component after a
    // successful registration — it doesn't remount, it just updates
    // props. So the dialog has to react to `registered` changing,
    // not just its value at first mount.
    useEffect(() => {
        if (registered) {
            setShowApprovalDialog(true);
        }
    }, [registered]);

    const goToLogin = () => router.visit(login());

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
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
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
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="id_number">ID number</Label>
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
                                    Contact number
                                </Label>
                                <Input
                                    id="contact_number"
                                    type="text"
                                    tabIndex={4}
                                    autoComplete="tel"
                                    name="contact_number"
                                    placeholder="09XXXXXXXXX (optional)"
                                />
                                <InputError message={errors.contact_number} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="sex">Sex</Label>
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
                                <Label htmlFor="program_id">Program</Label>
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

                            <div className="grid gap-2">
                                <Label htmlFor="hte_id">
                                    Host training establishment
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

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
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
                                    Confirm password
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

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={10}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={11}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

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
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Enter your details below to create your account',
};