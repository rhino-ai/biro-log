import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

interface Props {
  children: ReactNode;
  hideHeader?: boolean;
  hideNav?: boolean;
  className?: string;
}

/**
 * Standard app shell: sticky top bar + scrollable main + bottom nav.
 * Pages can still render their own Header/BottomNav directly — this is opt-in.
 */
export const MainAppLayout = ({ children, hideHeader, hideNav, className }: Props) => (
  <div className="min-h-screen bg-background pb-20">
    {!hideHeader && <Header />}
    <main className={className ?? "px-4 py-6 max-w-lg mx-auto"}>{children}</main>
    {!hideNav && <BottomNav />}
  </div>
);

export default MainAppLayout;