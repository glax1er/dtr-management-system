// import type { HTMLAttributes } from 'react';
// import { cn } from '@/lib/utils';

// export default function InputError({
//     message,
//     className = '',
//     ...props
// }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
//     if (!message) return null;

//     return (
//         <p
//             {...props}
//             aria-live="polite"
//             className={cn('text-xs leading-4 text-red-600 dark:text-red-400', className)}
//         >
//             {message}
//         </p>
//     );
// }

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            className={cn(
                'text-[10px] leading-none text-red-600 dark:text-red-400',
                className,
            )}
        >
            {message}
        </p>
    ) : null;
}