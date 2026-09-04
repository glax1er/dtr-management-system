export default function AppLogo() {
    return (
        <>
            <div className="-ml-3 flex aspect-square size-15 items-center justify-center overflow-hidden rounded-md">
                <img
                    src="/images/cims-logo-light.png"
                    alt="CIMS logo"
                    className="block h-14 w-auto object-contain"
                />
            </div>

            <div className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="text-[11px] leading-tight font-semibold">
                    TentaKeeper
                </span>
                <span className="text-[9px] leading-tight font-normal">
                    USeP - CIC · Internship Management System
                </span>
            </div>
        </>
    );
}
