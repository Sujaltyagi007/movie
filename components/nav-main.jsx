"use client";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { setActiveTab } from "@/redux/slice/activeTab";
import { useDispatch } from "react-redux";

export function NavMain({ items }) {
  const dispatch = useDispatch();
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item, index) => (
            <SidebarMenuItem
              onClick={() => dispatch(setActiveTab(index))}
              key={item.title}
            >
              <SidebarMenuButton
                tooltip={item.title}
                className={"cursor-pointer"}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
