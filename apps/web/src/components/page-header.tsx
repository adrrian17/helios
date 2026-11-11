import { SidebarTrigger } from "@helios/ui/components/sidebar";

import { PhoneCommands } from "@/components/commands";

/** The bar on top of every page; on phones it also holds the button that opens the sidebar drawer. */
export const PageHeader = ({
  children,
  actions,
}: {
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 max-md:h-14 max-md:px-2">
    <SidebarTrigger aria-label="Open navigation" className="md:hidden" />
    <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    <div className="flex shrink-0 items-center gap-1">
      <PhoneCommands />
      {actions}
    </div>
  </header>
);

export const PageTitle = ({ children }: { children: React.ReactNode }) => (
  <h1 className="truncate text-sm font-medium">{children}</h1>
);
