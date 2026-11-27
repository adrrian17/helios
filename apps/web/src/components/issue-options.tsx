import {
  MemberAvatar,
  StateIcon,
  UnassignedAvatar,
} from "@/components/issue-meta";
import type { PickerOption } from "@/components/picker";
import type { Member, WorkflowState } from "@/utils/domain";
import { UNASSIGNED } from "@/utils/filters";

export const stateOptions = (states: WorkflowState[]): PickerOption[] =>
  states.map((state) => ({
    value: state.id,
    label: state.name,
    icon: <StateIcon category={state.category} />,
  }));

export const assigneeOptions = (members: Member[]): PickerOption[] => [
  { value: UNASSIGNED, label: "Sin responsable", icon: <UnassignedAvatar /> },
  ...members.map((member) => ({
    value: member.id,
    label: member.active
      ? member.displayName
      : `${member.displayName} (desactivado)`,
    icon: <MemberAvatar member={member} />,
  })),
];
