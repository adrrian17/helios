import { Button } from "@helios/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@helios/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import { SidebarMenuButton } from "@helios/ui/components/sidebar";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronsUpDownIcon,
  KeyboardIcon,
  LogOutIcon,
  PaletteIcon,
  UserPenIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import { useCommands } from "@/components/commands";
import { MemberAvatar } from "@/components/issue-meta";
import { authClient } from "@/utils/auth-client";
import { orpc } from "@/utils/orpc";
import { useMe } from "@/utils/use-me";

const DisplayNameDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const me = useMe();
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.name);

  const save = useMutation({
    ...orpc.workspace.setDisplayName.mutationOptions(),
    onSuccess: async () => {
      // `me` is cached as static by the route guard, so refetch it explicitly.
      await queryClient.refetchQueries({ queryKey: orpc.me.key() });
      toast.success("Display name saved.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Display name</DialogTitle>
          <DialogDescription>
            Teammates see this on Issues, Comments and Activity.
          </DialogDescription>
        </DialogHeader>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({ name });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="display-name">Name</FieldLabel>
              <Input
                id="display-name"
                autoComplete="name"
                required
                // The dialog closes on success, so nothing typed after Save may be lost.
                readOnly={save.isPending}
                maxLength={80}
                placeholder={me.email}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={save.isPending || name.trim() === ""}
            >
              {save.isPending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const UserMenu = () => {
  const me = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { theme = "system", setTheme } = useTheme();
  const { showShortcuts } = useCommands();
  const [editingName, setEditingName] = useState(false);
  const displayName = me.name.trim() === "" ? me.email : me.name;

  // Not a mutation: refetching everything afterwards would only collect 401s.
  const signOut = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error("Could not sign out. Try again.");

      return;
    }

    queryClient.clear();
    await navigate({ to: "/sign-in" });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton size="lg" aria-label="Account">
              <MemberAvatar member={{ id: me.id, displayName }} size="sm" />
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {me.role === "admin" ? "Admin" : "Member"}
                </span>
              </span>
              <ChevronsUpDownIcon />
            </SidebarMenuButton>
          }
        />
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-(--anchor-width) min-w-56"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block truncate">{me.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                setEditingName(true);
              }}
            >
              <UserPenIcon />
              Display name…
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PaletteIcon />
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem className="max-md:hidden" onClick={showShortcuts}>
              <KeyboardIcon />
              Keyboard shortcuts
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                void signOut();
              }}
            >
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DisplayNameDialog open={editingName} onOpenChange={setEditingName} />
    </>
  );
};
