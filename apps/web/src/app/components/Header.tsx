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
							Sign In
						</button>
					</SignInButton>
				</SignedOut>
				<SignedIn>
					<Link href="/checklists/new" className="btn btn-primary">
						+ New
					</Link>
					<UserButton />
				</SignedIn>
			</nav>
		</header>
	);
}
