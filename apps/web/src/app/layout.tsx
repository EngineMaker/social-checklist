import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Header } from "./components/Header";
import "./globals.css";

export const metadata: Metadata = {
	title: "Social Checklist - みんなのチェックリスト",
	description: "イベントのチェックリストを作成・共有・フォークしよう",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider>
			<html lang="ja">
				<body>
					<Header />
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
