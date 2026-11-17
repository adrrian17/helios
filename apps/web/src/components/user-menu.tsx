import { limits } from "@helios/api/domain";
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
import { roleLabels } from "@/utils/domain";
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
  const [name, setName] = useState(me.name);

  const save = useMutation({
    ...orpc.workspace.setDisplayName.mutationOptions(),
    onSuccess: () => {
      toast.success("Nombre guardado.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nombre para mostrar</DialogTitle>
          <DialogDescription>
            Tu equipo verá este nombre en las tareas, los comentarios y la
            actividad.
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
              <FieldLabel htmlFor="display-name">Nombre</FieldLabel>
              <Input
                id="display-name"
                autoComplete="name"
                required
                // The dialog closes on success, so nothing typed after submitting may be lost.
                readOnly={save.isPending}
                maxLength={limits.displayName}
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={save.isPending || name.trim() === ""}
            >
              {save.isPending ? <Spinner data-icon="inline-start" /> : null}
              Guardar
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

  // Not a mutation: refetching everything afterwards would only collect 401s.
  const signOut = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.");

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
            <SidebarMenuButton size="lg" aria-label="Cuenta">
              <MemberAvatar member={me} size="sm" />
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-medium">{me.displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {roleLabels[me.role]}
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
              Nombre para mostrar…
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PaletteIcon />
                Tema
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    Claro
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    Oscuro
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    Sistema
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem className="max-md:hidden" onClick={showShortcuts}>
              <KeyboardIcon />
              Atajos de teclado
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
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DisplayNameDialog open={editingName} onOpenChange={setEditingName} />
    </>
  );
};
