import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Caveat, Indie_Flower } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
})

const indieFlower = Indie_Flower({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-indie-flower",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Coffee Notes Project",
  description:
    "Coffee Notes is a collective archive of advice gathered from our coffee chats with mentors, recruiters, and peers.",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${caveat.variable} ${indieFlower.variable} ${GeistSans.variable} ${GeistMono.variable}`}
        style={{ fontFamily: "var(--font-caveat)" }}
      >
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
