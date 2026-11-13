import { priorityLabels } from "@helios/api/domain";

import {
  LabelDot,
  MemberAvatar,
  PriorityIcon,
  StateIcon,
  UnassignedAvatar,
} from "@/components/issue-meta";
import type { PickerOption } from "@/components/picker";
import { pickerPriorities } from "@/utils/domain";
import type { Label, Member, WorkflowState } from "@/utils/domain";
import { UNASSIGNED } from "@/utils/filters";

export const stateOptions = (states: WorkflowState[]): PickerOption[] =>
  states.map((state) => ({
    value: state.id,
    label: state.name,
    icon: <StateIcon category={state.category} />,
  }));

export const priorityOptions: PickerOption[] = pickerPriorities.map(
  (priority) => ({
    value: priority,
    label: priorityLabels[priority],
    icon: <PriorityIcon priority={priority} labelled={false} />,
  })
);

export const assigneeOptions = (members: Member[]): PickerOption[] => [
  { value: UNASSIGNED, label: "Unassigned", icon: <UnassignedAvatar /> },
  ...members.map((member) => ({
    value: member.id,
    label: member.active
      ? member.displayName
      : `${member.displayName} (deactivated)`,
    icon: <MemberAvatar member={member} />,
  })),
];

export const labelOptions = (labels: Label[]): PickerOption[] =>
  labels.map((label) => ({
    value: label.id,
    label: label.name,
    icon: <LabelDot color={label.color} />,
  }));
