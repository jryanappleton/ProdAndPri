import { TaskSuggestion } from "@/lib/types";

export function buildMockSuggestions(input: string): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const normalized = input.toLowerCase();

  if (normalized.includes("github") || normalized.includes("issue") || normalized.includes("ship")) {
    suggestions.push({
      id: crypto.randomUUID(),
      label: "Suggested area",
      value: "Patchwork",
      field: "areaId",
      state: "suggested"
    });
  }

  if (normalized.includes("occupancy") || normalized.includes("booking") || normalized.includes("hostel")) {
    suggestions.push({
      id: crypto.randomUUID(),
      label: "Suggested area",
      value: "Lazy Tiger",
      field: "areaId",
      state: "suggested"
    });
  }

  if (normalized.includes("invoice") || normalized.includes("bank") || normalized.includes("reconcile")) {
    suggestions.push({
      id: crypto.randomUUID(),
      label: "Suggested area",
      value: "Personal Admin",
      field: "areaId",
      state: "suggested"
    });
  }

  suggestions.push({
    id: crypto.randomUUID(),
    label: "Suggested title",
    value: input.charAt(0).toUpperCase() + input.slice(1).trim(),
    field: "title",
    state: "suggested"
  });

  suggestions.push({
    id: crypto.randomUUID(),
    label: "Suggested next action",
    value: `Take the first concrete step on: ${input.trim()}`,
    field: "nextStep",
    state: "suggested"
  });

  return suggestions;
}
