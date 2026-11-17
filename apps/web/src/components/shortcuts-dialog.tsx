import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@helios/ui/components/dialog";
import { Kbd, KbdGroup } from "@helios/ui/components/kbd";

import { boardKeys, keysOf, shortcuts } from "@/utils/shortcuts";

const byScope = Object.entries(
  Object.groupBy(Object.entries(shortcuts), ([, shortcut]) => shortcut.scope)
);

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
        <DialogTitle>Atajos de teclado</DialogTitle>
        <DialogDescription>
          Las teclas sueltas se pausan mientras escribes en un campo o hay un
          diálogo abierto.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {byScope.map(([scope, entries]) => (
          <Section key={scope} title={scope}>
            {entries.map(([name, shortcut]) => (
              <ShortcutRow
                key={name}
                label={shortcut.label}
                keys={keysOf(shortcut)}
              />
            ))}
          </Section>
        ))}
        <Section title="Tablero">
          {boardKeys.map((entry) => (
            <ShortcutRow key={entry.label} {...entry} />
          ))}
        </Section>
      </div>
    </DialogContent>
  </Dialog>
);
