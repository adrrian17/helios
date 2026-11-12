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

/** Keys on a focused Board card; the card handles them, so they are not in the registry. */
const boardKeys = [
  { label: "Pick up the focused Issue", keys: ["Space"] },
  { label: "Move it within or across columns", keys: ["←", "↑", "↓", "→"] },
  { label: "Drop it", keys: ["Space"] },
  { label: "Put it back", keys: ["Esc"] },
];

const ShortcutRow = ({ label, keys }: { label: string; keys: string[] }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <dt>{label}</dt>
    <dd>
      <KbdGroup>
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    </dd>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section aria-labelledby={`shortcuts-${title}`}>
    <h3
      id={`shortcuts-${title}`}
      className="text-muted-foreground mb-1 text-xs font-medium"
    >
      {title}
    </h3>
    <dl className="divide-y">{children}</dl>
  </section>
);

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
          <Section key={scope} title={scope}>
            {byScope[scope]?.map(([name, shortcut]) => (
              <ShortcutRow
                key={name}
                label={shortcut.label}
                keys={keysOf(shortcut)}
              />
            ))}
          </Section>
        ))}
        <Section title="Board">
          {boardKeys.map((entry) => (
            <ShortcutRow key={entry.label} {...entry} />
          ))}
        </Section>
      </div>
    </DialogContent>
  </Dialog>
);
