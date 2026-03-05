import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Seedream 5 Lite Sandbox",
    description: "Test the replicate bytedance/seedream-5-lite end point",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
