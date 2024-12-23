import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import MobileNavbar from "@/components/MobileNavbar";

export default function RootLayout({
children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const loggedIn = { firstName: 'MAVIAN', lastName: 'Dev'};

    return (
        <main className="flex h-screen w-full font-inter">
            <Sidebar user={loggedIn} />

            <div className="flex size-full flex-col">
                <div className="root-layout">
                    <Image src="/icons/logo.svg" alt="menuIcon" width={30} height={30} />
                    <div className="">
                        <MobileNavbar user={loggedIn} />
                    </div>
                </div>
                {children}
            </div>
        </main>
    );
}
