import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@helios/ui/components/dialog";
import { Kbd, KbdGroup } from "@helios/ui/components/kbd";

import { keysOf, shortcuts } from "@/utils/shortcuts";

const byScope = Object.groupBy(
  Object.entries(shortcuts),
  ([, shortcut]) => shortcut.scope
);

const scopes = ["Anywhere", "Issue view"] as const;

/** The `?` help: every shortcut from the registry, grouped by where it works. */
export const ShortcutsDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => (
  <Dialog
    open={open}
    onOpenChange={(next) => {
      if (!next) {
        onClose();
      }
    }}
  >
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Single keys pause while you type in a field or a dialog is open.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {scopes.map((scope) => (
          <section key={scope} aria-labelledby={`shortcuts-${scope}`}>
            <h3
              id={`shortcuts-${scope}`}
              className="text-muted-foreground mb-1 text-xs font-medium"
            >
              {scope}
            </h3>
            <dl className="divide-y">
              {byScope[scope]?.map(([name, shortcut]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <dt>{shortcut.label}</dt>
                  <dd>
                    <KbdGroup>
                      {keysOf(shortcut).map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);
