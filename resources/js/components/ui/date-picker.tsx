import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
    date?: string | Date | null;
    onDateChange: (dateString: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    minDate?: string | Date;
    maxDate?: string | Date;
    id?: string;
    clearable?: boolean;
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'right' | 'bottom' | 'left';
}

export function DatePicker({
    date,
    onDateChange,
    placeholder = 'Pick a date',
    className,
    disabled = false,
    minDate,
    maxDate,
    id,
    clearable = false,
    align = 'start',
    side = 'bottom',
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => {
        if (!date) return undefined;
        if (date instanceof Date) return date;
        const parsed = parseISO(date);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }, [date]);

    const handleSelect = (newDate: Date | undefined) => {
        if (!newDate) {
            onDateChange('');
        } else {
            onDateChange(format(newDate, 'yyyy-MM-dd'));
        }
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDateChange('');
    };

    const min = React.useMemo(() => {
        if (!minDate) return undefined;
        if (minDate instanceof Date) return minDate;
        const parsed = parseISO(minDate);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }, [minDate]);

    const max = React.useMemo(() => {
        if (!maxDate) return undefined;
        if (maxDate instanceof Date) return maxDate;
        const parsed = parseISO(maxDate);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }, [maxDate]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal text-xs sm:text-sm h-9 bg-background px-2.5 transition-colors',
                        !date && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">
                        {selectedDate ? (
                            format(selectedDate, 'MMM dd, yyyy')
                        ) : (
                            placeholder
                        )}
                    </span>
                    {clearable && date && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleClear(e as unknown as React.MouseEvent);
                                }
                            }}
                            className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                            <X className="size-3" />
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 shadow-lg max-w-[calc(100vw-1rem)]"
                align={align}
                side={side}
                sideOffset={4}
                collisionPadding={12}
                avoidCollisions={true}
            >
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    autoFocus
                    disabled={(d) => {
                        if (min && d < min) return true;
                        if (max && d > max) return true;
                        return false;
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
