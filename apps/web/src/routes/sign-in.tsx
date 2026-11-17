import { Button } from "@helios/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@helios/ui/components/card";
import { Input } from "@helios/ui/components/input";
import { Label } from "@helios/ui/components/label";
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
      className="flex min-h-svh flex-col items-center justify-center gap-6 p-4"
    >
      <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <HeliosMark className="size-7 rounded-md text-sm" />
        Helios
      </p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Inicia sesión en Helios</CardTitle>
          <CardDescription>
            Te enviamos por correo un enlace para iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestLink.isSuccess ? (
            <div className="grid gap-4">
              <output
                // Focused so screen readers read it and keyboard focus is not lost with the form.
                ref={focusOnMount}
                tabIndex={-1}
                className="block outline-none"
              >
                Si {email} pertenece a un miembro o tiene una invitación, el
                enlace de acceso va en camino. Funciona una sola vez y caduca en
                5 minutos.
              </output>
              <Button
                variant="ghost"
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
                  required
                  className="h-11"
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
                className="h-11"
                disabled={requestLink.isPending}
              >
                Enviarme un enlace de acceso
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ error: z.string().optional() }),
  head: () => ({ meta: [{ title: "Iniciar sesión" }] }),
  component: SignInPage,
});
