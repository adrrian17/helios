import { Button } from "@helios/ui/components/button";
import { Input } from "@helios/ui/components/input";
import { Label } from "@helios/ui/components/label";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { HeliosMark } from "@/components/project-mark";
import { authClient } from "@/utils/auth-client";

const focusOnMount = (element: HTMLElement | null) => {
  element?.focus();
};

const requestMagicLink = async (email: string) => {
  const { error } = await authClient.signIn.magicLink({
    email,
    callbackURL: `${window.location.origin}/`,
    errorCallbackURL: `${window.location.origin}/sign-in`,
  });

  if (error) {
    throw new Error(error.message ?? "Solicitud fallida");
  }
};

const SignInPage = () => {
  const { error } = Route.useSearch();
  const [email, setEmail] = useState("");

  const requestLink = useMutation({
    mutationFn: requestMagicLink,
    onError: () => {
      toast.error(
        "No se pudo solicitar el enlace de acceso. Inténtalo de nuevo."
      );
    },
  });

  return (
    <main
      id="main"
      className="bg-sidebar flex min-h-svh flex-col items-center justify-center p-4"
    >
      <div className="grid w-full max-w-[400px] gap-8">
        <div className="grid justify-items-center gap-4 text-center">
          <HeliosMark className="size-10 rounded-xl text-lg" />
          <div className="grid gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Inicia sesión en Helios
            </h1>
            <p className="text-muted-foreground text-sm text-balance">
              Te enviamos por correo un enlace para iniciar sesión.
            </p>
          </div>
        </div>
        <div className="bg-card ring-foreground/10 rounded-2xl p-6 shadow-sm ring-1">
          {requestLink.isSuccess ? (
            <div className="grid gap-4">
              <output
                // Focused so screen readers read it and keyboard focus is not lost with the form.
                ref={focusOnMount}
                tabIndex={-1}
                className="block text-sm leading-relaxed outline-none"
              >
                Si {email} pertenece a un miembro o tiene una invitación, el
                enlace de acceso va en camino. Funciona una sola vez y caduca en
                5 minutos.
              </output>
              <Button
                variant="outline"
                className="h-10"
                onClick={() => {
                  requestLink.reset();
                }}
              >
                Usar otro correo
              </Button>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestLink.mutate(email);
              }}
            >
              {error === undefined ? null : (
                <p role="alert" className="text-destructive text-sm">
                  El enlace de acceso no es válido o ha caducado. Solicita uno
                  nuevo.
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  // Back after choosing another email, so keyboard users keep their place.
                  autoFocus
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  required
                  className="h-10"
                  // Success swaps in a message naming this email, so it must not change meanwhile.
                  readOnly={requestLink.isPending}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                />
              </div>
              <Button
                type="submit"
                className="h-10"
                disabled={requestLink.isPending}
              >
                {requestLink.isPending ? <Spinner /> : null}
                Enviarme un enlace de acceso
              </Button>
            </form>
          )}
        </div>
        <p className="text-muted-foreground text-center text-xs text-balance">
          Solo pueden entrar los miembros del espacio de trabajo y las personas
          invitadas.
        </p>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ error: z.string().optional() }),
  head: () => ({ meta: [{ title: "Iniciar sesión" }] }),
  component: SignInPage,
});
