import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

interface Props {
  children: ReactNode;
  hideHeader?: boolean;
  hideNav?: boolean;
}

/**
 * Standard app shell: renders Header + children + BottomNav.
 * Pages keep their own outer container/padding so per-page layouts stay intact.
 */
export const MainAppLayout = ({ children, hideHeader, hideNav }: Props) => (
  <>
    {!hideHeader && <Header />}
    {children}
    {!hideNav && <BottomNav />}
  </>
);

export default MainAppLayout;