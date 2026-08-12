import type { Metadata } from "next";
import {
  Gowun_Dodum,
} from "next/font/google";

import "./globals.css";

import {
  AuthProvider,
} from "@/components/AuthProvider";

const gowunDodum =
  Gowun_Dodum({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
  });

export const metadata: Metadata = {
  title: "우리",
  description:
    "둘이 함께 만드는 약속과 기록",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className="h-full"
    >
      <body
        className={`${gowunDodum.className} min-h-full flex flex-col antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}