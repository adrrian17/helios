import { Button } from "@helios/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { SignalIcon, TagIcon, UserRoundIcon, XIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  assigneeOptions,
  labelOptions,
  priorityOptions,
} from "@/components/issue-options";
import { Picker } from "@/components/picker";
import type { PickerOption } from "@/components/picker";
import { pickerPriorities } from "@/utils/domain";
import { hasFilters } from "@/utils/filters";
import type { FilterSearch } from "@/utils/filters";
import { orpc } from "@/utils/orpc";

/** Adds or removes one value; an emptied filter leaves the URL. */
const toggled = <T extends string>(values: T[] | undefined, value: T) => {
  const next = new Set(values);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next.size === 0 ? undefined : [...next];
};

const FilterPicker = ({
  name,
  icon: Icon,
  options,
  selected,
  onSelect,
}: {
  name: string;
  icon: LucideIcon;
  options: PickerOption[];
  selected: string[];
  onSelect: (value: string) => void;
}) => {
  // One chosen value reads better by name; several by count.
  const only =
    selected.length === 1
      ? options.find((option) => option.value === selected[0])
      : undefined;

  return (
    <Picker
      label={`Filter by ${name.toLowerCase()}`}
      multiple
      options={options}
      selected={selected}
      onSelect={onSelect}
      trigger={
        <Button
          variant={selected.length === 0 ? "muted" : "secondary"}
          size="sm"
          aria-label={
            selected.length === 0
              ? `${name} filter`
              : `${name} filter, ${selected.length} selected`
          }
        >
          {only?.icon ?? <Icon data-icon="inline-start" />}
          <span className="max-w-32 truncate">{only?.label ?? name}</span>
          {selected.length > 1 ? (
            <span className="text-muted-foreground tabular-nums">
              {selected.length}
            </span>
          ) : null}
        </Button>
      }
    />
  );
};

/** Assignee, Label and Priority filters over a Project's Issues, kept in the URL. */
export const FilterBar = ({
  search,
  onChange,
  children,
}: {
  search: FilterSearch;
  onChange: (next: FilterSearch) => void;
  /** Extra controls at the end of the bar, such as a result count. */
  children?: React.ReactNode;
}) => {
  const members = useQuery(orpc.workspace.members.queryOptions());
  const labels = useQuery(orpc.labels.list.queryOptions());

  return (
    <fieldset className="flex h-11 min-w-0 shrink-0 items-center gap-1 border-b pr-3 max-md:h-14 max-md:pr-2">
      <legend className="sr-only">Filters</legend>
      {/* Only the filters scroll sideways, so the controls after them always stay on screen. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 self-stretch overflow-x-auto pr-1 pl-3 max-md:pl-2">
        <FilterPicker
          name="Assignee"
          icon={UserRoundIcon}
          options={assigneeOptions(members.data ?? [])}
          selected={search.assignee ?? []}
          onSelect={(value) => {
            onChange({ ...search, assignee: toggled(search.assignee, value) });
          }}
        />
        <FilterPicker
          name="Label"
          icon={TagIcon}
          options={labelOptions(labels.data ?? [])}
          selected={search.label ?? []}
          onSelect={(value) => {
            onChange({ ...search, label: toggled(search.label, value) });
          }}
        />
        <FilterPicker
          name="Priority"
          icon={SignalIcon}
          options={priorityOptions}
          selected={search.priority ?? []}
          onSelect={(value) => {
            const priority = pickerPriorities.find((entry) => entry === value);

            if (priority !== undefined) {
              onChange({
                ...search,
                priority: toggled(search.priority, priority),
              });
            }
          }}
        />
        {hasFilters(search) ? (
          <Button
            variant="muted"
            size="sm"
            onClick={() => {
              onChange({});
            }}
          >
            <XIcon data-icon="inline-start" />
            <span className="max-md:sr-only">Clear filters</span>
          </Button>
        ) : null}
      </div>
      {children}
    </fieldset>
  );
};
