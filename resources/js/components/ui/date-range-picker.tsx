import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRangePickerProps {
    from?: string | null;
    to?: string | null;
    onRangeChange: (from: string, to: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
}

export function DateRangePicker({
    from,
    to,
    onRangeChange,
    className,
    placeholder = 'Pick a date range',
    disabled = false,
    clearable = false,
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false);

    const range: DateRange | undefined = React.useMemo(() => {
        const fromDate = from ? parseISO(from) : undefined;
        const toDate = to ? parseISO(to) : undefined;

        return {
            from: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
            to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
        };
    }, [from, to]);

    const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(range);

    React.useEffect(() => {
        setSelectedRange(range);
    }, [range]);

    const handleSelect = (newRange: DateRange | undefined) => {
        setSelectedRange(newRange);
        if (newRange?.from && newRange?.to) {
            onRangeChange(
                format(newRange.from, 'yyyy-MM-dd'),
                format(newRange.to, 'yyyy-MM-dd'),
            );
        } else if (!newRange?.from && !newRange?.to) {
            onRangeChange('', '');
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedRange(undefined);
        onRangeChange('', '');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal text-xs sm:text-sm h-9 bg-background px-2.5 transition-colors',
                        (!from || !to) && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">
                        {selectedRange?.from ? (
                            selectedRange.to ? (
                                <>
                                    {format(selectedRange.from, 'MMM dd, yyyy')} –{' '}
                                    {format(selectedRange.to, 'MMM dd, yyyy')}
                                </>
                            ) : (
                                format(selectedRange.from, 'MMM dd, yyyy')
                            )
                        ) : (
                            placeholder
                        )}
                    </span>
                    {clearable && (from || to) && !disabled && (
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
            <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                <Calendar
                    mode="range"
                    defaultMonth={selectedRange?.from}
                    selected={selectedRange}
                    onSelect={handleSelect}
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
    );
}
