import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Header } from "./components/Header";
import "./globals.css";

export const metadata: Metadata = {
	title: "Flarestack App",
	description: "Full-stack Cloudflare application",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider>
			<html lang="en">
				<body>
					<Header />
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
