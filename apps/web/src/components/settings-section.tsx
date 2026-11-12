/** A titled block on settings-style pages (Members, Project settings). */
export const SettingsSection = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-end gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-base font-medium">{title}</h2>
        {description === undefined ? null : (
          <p className="text-muted-foreground text-sm text-pretty">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/** The bordered, divided list every settings section uses for its rows. */
export const SettingsList = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <ul
    aria-label={label}
    className="bg-card divide-y overflow-hidden rounded-lg border"
  >
    {children}
  </ul>
);

export const SettingsPage = ({ children }: { children: React.ReactNode }) => (
  <main id="main" className="flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-6 md:px-8 md:py-10">
      {children}
    </div>
  </main>
);
