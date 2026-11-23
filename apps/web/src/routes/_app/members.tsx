import { Badge } from "@helios/ui/components/badge";
import { Button } from "@helios/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import { Skeleton } from "@helios/ui/components/skeleton";
import { Spinner } from "@helios/ui/components/spinner";
import { cn } from "@helios/ui/lib/utils";
import { ORPCError } from "@orpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  MailIcon,
  MoreHorizontalIcon,
  ShieldIcon,
  ShieldOffIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ConfirmRequest } from "@/components/confirm-dialog";
import { MemberAvatar } from "@/components/issue-meta";
import { PageHeader, PageTitle } from "@/components/page-header";
import {
  SettingsList,
  SettingsPage,
  SettingsSection,
} from "@/components/settings-section";
import { roleLabels } from "@/utils/domain";
import { formatDate } from "@/utils/format";
import { describeError, orpc } from "@/utils/orpc";
import { useMe } from "@/utils/use-me";

const describeInviteError = (error: Error) =>
  error instanceof ORPCError && error.code === "BAD_REQUEST"
    ? "Introduce un correo electrónico válido."
    : describeError(error);

const InviteForm = () => {
  const [email, setEmail] = useState("");

  const invite = useMutation({
    ...orpc.workspace.invite.mutationOptions(),
    meta: { inlineError: true },
    onSuccess: (invited, { email: sent }) => {
      toast.success(`Invitación enviada a ${invited.email}.`);
      setEmail((current) => (current.trim() === sent ? "" : current));
    },
  });

  const error =
    invite.error === null ? undefined : describeInviteError(invite.error);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        invite.mutate({ email: email.trim() });
      }}
    >
      <Field data-invalid={error !== undefined || undefined}>
        <FieldLabel htmlFor="invite-email" className="sr-only">
          Correo electrónico
        </FieldLabel>
        <div className="flex gap-2 max-sm:flex-col">
          <Input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            placeholder="nombre@ejemplo.com"
            aria-invalid={error !== undefined || undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              // Clears a shown error only; resetting a pending request would re-enable the button.
              if (invite.isError) {
                invite.reset();
              }
            }}
          />
          <Button
            type="submit"
            disabled={invite.isPending}
            className="shrink-0"
          >
            {invite.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <MailIcon data-icon="inline-start" />
            )}
            Enviar invitación
          </Button>
        </div>
        {error === undefined ? null : <FieldError>{error}</FieldError>}
      </Field>
    </form>
  );
};

const Invitations = () => {
  const { data: invitations } = useSuspenseQuery(
    orpc.workspace.invitations.queryOptions()
  );

  const revoke = useMutation({
    ...orpc.workspace.revokeInvitation.mutationOptions(),
    onSuccess: () => {
      toast.success("Invitación revocada.");
    },
  });

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        No hay invitaciones pendientes.
      </p>
    );
  }

  return (
    <SettingsList label="Invitaciones pendientes">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full">
            <MailIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {invitation.email}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              Invitado por {invitation.invitedBy} el{" "}
              {formatDate(invitation.createdAt)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={revoke.isPending && revoke.variables.id === invitation.id}
            aria-label={`Revocar la invitación de ${invitation.email}`}
            onClick={() => {
              revoke.mutate({ id: invitation.id });
            }}
          >
            Revocar
          </Button>
        </li>
      ))}
    </SettingsList>
  );
};

const Members = () => {
  const me = useMe();
  const router = useRouter();

  const { data: members } = useSuspenseQuery(
    orpc.workspace.members.queryOptions()
  );

  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const setRole = useMutation(orpc.workspace.setRole.mutationOptions());
  const deactivate = useMutation(orpc.workspace.deactivate.mutationOptions());
  const reactivate = useMutation(orpc.workspace.reactivate.mutationOptions());

  const demoteSelf = async () => {
    await setRole.mutateAsync({ memberId: me.id, role: "member" });
    // Re-runs the Admin route guards, so Admin pages close at once.
    await router.invalidate();
  };

  return (
    <>
      <SettingsList label="Miembros">
        {members.map((member) => {
          const self = member.id === me.id;
          const admin = member.role === "admin";

          return (
            <li
              key={member.id}
              className="flex items-center gap-3 px-4 py-2.5 max-md:flex-wrap max-md:gap-y-1"
            >
              <span className={cn("shrink-0", !member.active && "opacity-50")}>
                <MemberAvatar member={member} size="default" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium max-md:flex-wrap",
                    !member.active && "text-muted-foreground"
                  )}
                >
                  <span className="truncate max-md:break-all max-md:whitespace-normal">
                    {member.displayName}
                  </span>
                  {self ? <Badge variant="outline">Tú</Badge> : null}
                </span>
                {member.displayName === member.email ? null : (
                  <span className="text-muted-foreground truncate text-xs max-md:break-all max-md:whitespace-normal">
                    {member.email}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 max-md:order-last max-md:w-full max-md:pl-11">
                {member.active ? null : (
                  <Badge variant="destructive">Desactivado</Badge>
                )}
                <Badge variant={admin ? "secondary" : "outline"}>
                  {roleLabels[member.role]}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="muted"
                      size="icon-sm"
                      aria-label={`Acciones para ${member.displayName}`}
                    />
                  }
                >
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuGroup>
                    {admin ? (
                      <DropdownMenuItem
                        onClick={() => {
                          if (self) {
                            setConfirm({
                              title: "¿Dejar de ser administrador?",
                              description:
                                "Pasarás a ser miembro y perderás el acceso a Miembros y a la configuración de los proyectos.",
                              confirmLabel: "Hacerme miembro",
                              destructive: true,
                              onConfirm: demoteSelf,
                            });
                          } else {
                            setRole.mutate({
                              memberId: member.id,
                              role: "member",
                            });
                          }
                        }}
                      >
                        <ShieldOffIcon />
                        Hacer miembro
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => {
                          setRole.mutate({
                            memberId: member.id,
                            role: "admin",
                          });
                        }}
                      >
                        <ShieldIcon />
                        Hacer administrador
                      </DropdownMenuItem>
                    )}
                    {member.active && !self ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setConfirm({
                            title: `¿Desactivar a ${member.displayName}?`,
                            description:
                              "Se cerrará su sesión en todas partes de inmediato y no podrá volver a iniciarla hasta que lo reactives. Sus tareas, comentarios y actividad se conservan.",
                            confirmLabel: "Desactivar",
                            destructive: true,
                            onConfirm: async () => {
                              await deactivate.mutateAsync({
                                memberId: member.id,
                              });
                            },
                          });
                        }}
                      >
                        <UserXIcon />
                        Desactivar
                      </DropdownMenuItem>
                    ) : null}
                    {member.active ? null : (
                      <DropdownMenuItem
                        onClick={() => {
                          reactivate.mutate({ memberId: member.id });
                        }}
                      >
                        <UserCheckIcon />
                        Reactivar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </SettingsList>
      <ConfirmDialog
        request={confirm}
        onClose={() => {
          setConfirm(null);
        }}
      />
    </>
  );
};

const MembersPage = () => {
  const { data: members } = useSuspenseQuery(
    orpc.workspace.members.queryOptions()
  );

  const { data: invitations } = useSuspenseQuery(
    orpc.workspace.invitations.queryOptions()
  );

  return (
    <>
      <PageHeader>
        <PageTitle>Miembros</PageTitle>
      </PageHeader>
      <SettingsPage>
        <SettingsSection
          title="Invitar personas"
          description="Las personas invitadas inician sesión con un enlace mágico enviado a su correo y se convierten en miembros."
        >
          <InviteForm />
        </SettingsSection>
        <SettingsSection
          title={`Invitaciones pendientes · ${invitations.length}`}
        >
          <Invitations />
        </SettingsSection>
        <SettingsSection
          title={`Miembros · ${members.length}`}
          description="Los miembros desactivados no pueden iniciar sesión, pero siguen visibles en sus tareas y comentarios."
        >
          <Members />
        </SettingsSection>
      </SettingsPage>
    </>
  );
};

const ROWS = ["a", "b", "c"];

const MembersSkeleton = () => (
  <>
    <PageHeader>
      <PageTitle>Miembros</PageTitle>
    </PageHeader>
    <SettingsPage>
      <output
        aria-busy="true"
        aria-label="Cargando miembros"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-5 w-32" />
        {ROWS.map((row) => (
          <Skeleton key={row} className="h-12" />
        ))}
      </output>
    </SettingsPage>
  </>
);

export const Route = createFileRoute("/_app/members")({
  beforeLoad: ({ context: { me } }) => {
    if (me.role !== "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing.
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context: { orpc: api, queryClient } }) => {
    await Promise.all([
      queryClient.query({
        ...api.workspace.members.queryOptions(),
        staleTime: "static",
      }),
      queryClient.query({
        ...api.workspace.invitations.queryOptions(),
        staleTime: "static",
      }),
    ]);
  },
  head: () => ({ meta: [{ title: "Miembros" }] }),
  pendingComponent: MembersSkeleton,
  component: MembersPage,
});
