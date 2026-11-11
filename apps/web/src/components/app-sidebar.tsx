import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@helios/ui/components/sidebar";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";

import { authClient } from "@/utils/auth-client";
import { orpc } from "@/utils/orpc";

const UserMenu = () => {
  const { data: me } = useSuspenseQuery(orpc.me.queryOptions());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: async () => await authClient.signOut(),
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/sign-in" });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" aria-label="Account">
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium">
                {me.name || me.email}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {me.role === "admin" ? "Admin" : "Member"}
              </span>
            </span>
            <ChevronsUpDownIcon />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuItem
          onClick={() => {
            signOut.mutate();
          }}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const AppSidebar = () => (
  <Sidebar>
    <SidebarHeader>
      <span className="px-2 py-1.5 text-lg font-semibold">Helios</span>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <UserMenu />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
);
