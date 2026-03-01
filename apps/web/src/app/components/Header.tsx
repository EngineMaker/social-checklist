"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function Header() {
	return (
		<header className="header">
			<Link href="/" className="header-logo">
				Social Checklist
			</Link>
			<nav className="header-nav">
				<SignedOut>
					<SignInButton mode="modal">
						<button type="button" className="btn-signin">
							ログイン
						</button>
					</SignInButton>
				</SignedOut>
				<SignedIn>
					<Link href="/checklists/new" className="btn btn-primary">
						+ 新規作成
					</Link>
					<UserButton />
				</SignedIn>
			</nav>
		</header>
	);
}
