import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@helios/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@helios/ui/components/popover";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

export interface PickerOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

const matches = (_value: string, search: string, keywords?: string[]) =>
  keywords?.some((keyword) =>
    keyword.toLowerCase().includes(search.trim().toLowerCase())
  ) === true
    ? 1
    : 0;

/**
 * A searchable list in a popover, Linear style. Single pickers close on
 * choice; `multiple` ones stay open to toggle several. Pass `open` and
 * `onOpenChange` to open it from elsewhere, such as a keyboard shortcut.
 */
export const Picker = ({
  label,
  options,
  selected,
  onSelect,
  multiple = false,
  trigger,
  open,
  onOpenChange,
  align = "start",
  onCreate,
}: {
  /** Names the search field and the list, such as "Change Priority". */
  label: string;
  options: PickerOption[];
  selected: string[];
  onSelect: (value: string) => void;
  multiple?: boolean;
  trigger: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  /** Offers to create an option named after the search when none matches it exactly. */
  onCreate?: { noun: string; create: (name: string) => void };
}) => {
  const [ownOpen, setOwnOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isOpen = open ?? ownOpen;
  const name = search.trim();
  const chosen = new Set(selected);

  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    setSearch("");
    onOpenChange?.(next);
  };

  const canCreate =
    onCreate !== undefined &&
    name !== "" &&
    !options.some(
      (option) => option.label.toLowerCase() === name.toLowerCase()
    );

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align={align} className="w-64">
        {/* Single pickers open on the current value, so Enter alone keeps it. */}
        <Command
          filter={matches}
          label={label}
          loop
          defaultValue={multiple ? undefined : selected[0]}
        >
          <CommandInput
            placeholder={`${label}…`}
            aria-label={label}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked = chosen.has(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    data-checked={checked}
                    onSelect={() => {
                      onSelect(option.value);

                      if (!multiple) {
                        setOpen(false);
                      }
                    }}
                  >
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                    {checked ? (
                      <span className="sr-only">, selected</span>
                    ) : null}
                  </CommandItem>
                );
              })}
              {canCreate ? (
                <CommandItem
                  value={`create:${name}`}
                  keywords={[name]}
                  onSelect={() => {
                    onCreate.create(name);
                    setSearch("");
                  }}
                >
                  <PlusIcon />
                  <span className="truncate">
                    Create {onCreate.noun} “{name}”
                  </span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
