interface NavbarProps {
    onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    return (
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
                    aria-label="Toggle Menu"
                >
                    <span className="material-icons">menu</span>
                </button>
                <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
                    Dashboard Overview
                </h2>
                <h2 className="text-base font-semibold text-gray-800 sm:hidden">
                    Dashboard
                </h2>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">Admin Utama</p>
                    <p className="text-xs text-gray-500">Super Administrator</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200 shadow-sm">
                    A
                </div>
            </div>
        </header>
    );
}
