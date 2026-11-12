import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@helios/ui/components/alert-dialog";
import { Spinner } from "@helios/ui/components/spinner";

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}

/** One confirmation at a time: pass a request to open it, null to close it. */
export const ConfirmDialog = ({
  request,
  pending,
  onClose,
}: {
  request: ConfirmRequest | null;
  pending: boolean;
  onClose: () => void;
}) => (
  <AlertDialog
    open={request !== null}
    onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{request?.title}</AlertDialogTitle>
        <AlertDialogDescription>{request?.description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant={request?.destructive === true ? "destructive" : "default"}
          disabled={pending}
          onClick={() => {
            // A failed mutation was already reported as a toast by the mutation cache.
            void request
              ?.onConfirm()
              .catch(() => null)
              .finally(onClose);
          }}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {request?.confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
