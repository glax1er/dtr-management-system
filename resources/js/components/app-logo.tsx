export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-15 -ml-3 items-center justify-center overflow-hidden rounded-md">
                <img
                    src="/images/cims-logo-light.png"
                    alt="CIMS logo"
                    className="block h-14 w-auto object-contain"
                />
            </div>

            <div className="-ml-2 grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="text-[11px] font-semibold leading-tight">
                    TentaKeeper
                </span>
                <span className="text-[9px] font-normal leading-tight">
                    Internship Management System
                </span>
            </div>
        </>
    );
}