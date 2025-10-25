"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import Home from "@/components/Tabs/Home";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSelector } from "react-redux";

export default function Page() {
  const tab = useSelector((state) => state.activeTab).activeTab;
  const ActiveTav = [<Home />, <div>Hello World</div>];

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="!m-0 !mt-2 !rounded-b-none overflow-y-scroll">
        <SiteHeader />
        {ActiveTav[tab]}
      </SidebarInset>
    </SidebarProvider>
  );
}
