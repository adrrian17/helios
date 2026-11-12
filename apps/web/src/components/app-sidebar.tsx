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
  CircleUserRoundIcon,
  PlusIcon,
  SearchIcon,
  SquarePenIcon,
  TagIcon,
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

/** A sidebar link that is highlighted on its own pages and closes the phone drawer when followed. */
const NavLink = ({
  icon,
  label,
  activePath,
  ...link
}: LinkProps & {
  icon: React.ReactNode;
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

/** A sidebar row that runs a command, with its shortcut shown on devices that have a keyboard. */
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
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      {onCreate === null ? null : (
        <SidebarGroupAction aria-label="New Project" onClick={onCreate}>
          <PlusIcon />
        </SidebarGroupAction>
      )}
      <SidebarGroupContent>
        <SidebarMenu aria-label="Projects">
          {projects.data === undefined
            ? SKELETON_ROWS.map((row) => (
                <SidebarMenuItem key={row}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))
            : projects.data.map((project) => (
                <NavLink
                  key={project.id}
                  to="/projects/$prefix"
                  params={{ prefix: project.prefix }}
                  activePath={`/projects/${project.prefix}`}
                  icon={<ProjectMark project={project} />}
                  label={project.name}
                />
              ))}
          {projects.data?.length === 0 ? (
            <li className="text-sidebar-foreground/60 px-2 py-1.5 text-xs">
              No active Projects.
            </li>
          ) : null}
          <NavLink
            to="/projects/archived"
            activePath="/projects/archived"
            icon={<ArchiveIcon />}
            label="Archived"
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
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
      <Sidebar>
        <nav aria-label="Workspace" className="flex min-h-0 flex-1 flex-col">
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
                    label="New Issue"
                    keys={keysOf(shortcuts.createIssue)}
                    run={commands.createIssue}
                  />
                  <CommandButton
                    icon={<SearchIcon />}
                    label="Search"
                    keys={keysOf(shortcuts.palette)}
                    run={commands.openPalette}
                  />
                  <NavLink
                    to="/my-issues"
                    activePath="/my-issues"
                    icon={<CircleUserRoundIcon />}
                    label="My Issues"
                  />
                  <NavLink
                    to="/labels"
                    activePath="/labels"
                    icon={<TagIcon />}
                    label="Labels"
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
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavLink
                      to="/members"
                      activePath="/members"
                      icon={<UsersIcon />}
                      label="Members"
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
