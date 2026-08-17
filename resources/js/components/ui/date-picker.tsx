import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal text-xs sm:text-sm h-9 bg-background',
                        !date && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
                    {selectedDate ? (
                        format(selectedDate, 'PPP')
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    autoFocus
                    disabled={(d) => {
                        if (minDate) {
                            const min = minDate instanceof Date ? minDate : parseISO(minDate);
                            if (!isNaN(min.getTime()) && d < min) return true;
                        }
                        if (maxDate) {
                            const max = maxDate instanceof Date ? maxDate : parseISO(maxDate);
                            if (!isNaN(max.getTime()) && d > max) return true;
                        }
                        return false;
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
