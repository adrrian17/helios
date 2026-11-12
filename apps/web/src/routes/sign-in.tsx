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
    throw new Error(error.message ?? "Request failed");
  }
};

const SignInPage = () => {
  const { error } = Route.useSearch();
  const [email, setEmail] = useState("");

  const requestLink = useMutation({
    mutationFn: requestMagicLink,
    onError: () => {
      toast.error("Could not request a sign-in link. Try again.");
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
          <CardTitle>Sign in to Helios</CardTitle>
          <CardDescription>
            We email you a link that signs you in.
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
                If {email} belongs to a Member or has an Invitation, a sign-in
                link is on its way. It works once and expires in 5 minutes.
              </output>
              <Button
                variant="ghost"
                onClick={() => {
                  requestLink.reset();
                }}
              >
                Use a different email
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
                  That sign-in link is invalid or has expired. Request a new
                  one.
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  // Back after "Use a different email", so keyboard users keep their place.
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
                Email me a sign-in link
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
  head: () => ({ meta: [{ title: "Sign in" }] }),
  component: SignInPage,
});
