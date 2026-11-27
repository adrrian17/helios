import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@helios/ui/components/collapsible";
import { Kbd, KbdGroup } from "@helios/ui/components/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@helios/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import {
  ArchiveIcon,
  ChevronRightIcon,
  CircleUserRoundIcon,
  PlusIcon,
  SearchIcon,
  SquarePenIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";

import { useCommands } from "@/components/commands";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { HeliosMark, ProjectMark } from "@/components/project-mark";
import { UserMenu } from "@/components/user-menu";
import { orpc } from "@/utils/orpc";
import { keysOf, shortcuts } from "@/utils/shortcuts";
import { useMe } from "@/utils/use-me";

const SKELETON_ROWS = ["a", "b", "c"];

const NavLink = ({
  icon,
  label,
  activePath,
  ...link
}: LinkProps & {
  icon?: React.ReactNode;
  label: string;
  activePath: string;
}) => {
  const { setOpenMobile } = useSidebar();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const active =
    pathname === activePath || pathname.startsWith(`${activePath}/`);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        render={
          <Link
            {...link}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              setOpenMobile(false);
            }}
          />
        }
      >
        {icon}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const CommandButton = ({
  icon,
  label,
  keys,
  run,
}: {
  icon: React.ReactNode;
  label: string;
  keys: string[];
  run: () => void;
}) => {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          setOpenMobile(false);
          run();
        }}
      >
        {icon}
        <span>{label}</span>
        <KbdGroup className="ml-auto max-md:hidden" aria-hidden="true">
          {keys.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </KbdGroup>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const ProjectsGroup = ({ onCreate }: { onCreate: (() => void) | null }) => {
  const projects = useQuery(orpc.projects.list.queryOptions());

  return (
    <Collapsible defaultOpen render={<SidebarGroup />}>
      <SidebarGroupLabel
        render={<CollapsibleTrigger />}
        className="w-full cursor-pointer"
      >
        Proyectos
        <ChevronRightIcon className="ml-1 transition-transform in-data-panel-open:rotate-90" />
      </SidebarGroupLabel>
      {onCreate === null ? null : (
        <SidebarGroupAction aria-label="Nuevo proyecto" onClick={onCreate}>
          <PlusIcon />
        </SidebarGroupAction>
      )}
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu aria-label="Proyectos">
            {projects.data === undefined
              ? SKELETON_ROWS.map((row) => (
                  <SidebarMenuItem key={row}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))
              : projects.data.map((project) => (
                  <NavLink
                    key={project.id}
                    to="/projects/$prefix"
                    params={{ prefix: project.prefix }}
                    activePath={`/projects/${project.prefix}`}
                    icon={<ProjectMark name={project.name} />}
                    label={project.name}
                  />
                ))}
            {projects.data?.length === 0 ? (
              <li className="text-sidebar-foreground/60 px-2 py-1.5 text-xs">
                No hay proyectos activos.
              </li>
            ) : null}
            <NavLink
              to="/projects/archived"
              activePath="/projects/archived"
              icon={<ArchiveIcon />}
              label="Archivados"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AppSidebar = () => {
  const me = useMe();
  const isAdmin = me.role === "admin";
  const { setOpenMobile } = useSidebar();
  const commands = useCommands();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <CreateProjectDialog open={creating} onOpenChange={setCreating} />
      <Sidebar variant="inset">
        <nav
          aria-label="Espacio de trabajo"
          className="flex min-h-0 flex-1 flex-col"
        >
          <SidebarHeader>
            <Link
              to="/"
              className="flex h-8 items-center gap-2 rounded-md px-2 font-semibold tracking-tight max-md:h-11"
            >
              <HeliosMark />
              Helios
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <CommandButton
                    icon={<SquarePenIcon />}
                    label="Nueva tarea"
                    keys={keysOf(shortcuts.createIssue)}
                    run={commands.createIssue}
                  />
                  <CommandButton
                    icon={<SearchIcon />}
                    label="Buscar"
                    keys={keysOf(shortcuts.palette)}
                    run={commands.openPalette}
                  />
                  <NavLink
                    to="/my-issues"
                    activePath="/my-issues"
                    icon={<CircleUserRoundIcon />}
                    label="Mis tareas"
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <ProjectsGroup
              onCreate={
                isAdmin
                  ? () => {
                      // The dialog lives outside the drawer, so the drawer can close under it.
                      setOpenMobile(false);
                      setCreating(true);
                    }
                  : null
              }
            />
            {isAdmin ? (
              <SidebarGroup>
                <SidebarGroupLabel>Espacio de trabajo</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavLink
                      to="/members"
                      activePath="/members"
                      icon={<UsersIcon />}
                      label="Miembros"
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <UserMenu />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </nav>
      </Sidebar>
    </>
  );
};
