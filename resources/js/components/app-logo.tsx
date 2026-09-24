export default function AppLogo() {
    return (
        <>
            <div className="-ml-3 flex aspect-square size-15 items-center justify-center overflow-hidden rounded-md">
                <img
                    src="/images/cims-logo-light.png?v=3"
                    alt="CIMS logo"
                    className="block h-14 w-auto object-contain dark:hidden"
                />
                <img
                    src="/images/cims-logo-dark.png?v=5"
                    alt="CIMS logo dark"
                    className="hidden h-14 w-auto object-contain dark:block"
                />
            </div>

            <div className="-ml-1.5 grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="text-[11px] leading-tight font-semibold">
                    USeP
                </span>
                <span className="text-[9px] leading-tight font-normal">
                    Internship Management System
                </span>
            </div>
        </>
    );
}
