import type { Fragments, RouteData } from "common";
import type { LogApiConnectionState } from "../state/auto-progress";
import type { OverlayPreferences } from "./overlayPreferences";
import type { UrlTree } from "../state/tree/url-tree";

export const OVERLAY_SNAPSHOT_VERSION = 4;

export type OverlayStatus =
  "inactive" | "active" | "paused" | "disconnected" | "complete";

export interface OverlayInstruction {
  text: string;
  source:
    | {
        type: "fragment";
        parts: Fragments.AnyFragment[];
      }
    | {
        type: "gem";
        requiredGem: RouteData.RequiredGem;
        rewardType: RouteData.GemStep["rewardType"];
        count: number;
      }
    | null;
}

export interface OverlaySnapshot {
  version: typeof OVERLAY_SNAPSHOT_VERSION;
  status: OverlayStatus;
  sectionTitle: string | null;
  areaId: string | null;
  areaName: string | null;
  primaryInstruction: OverlayInstruction;
  secondaryInstructions: OverlayInstruction[];
  previousCheckpoint: {
    areaName: string;
    instructions: OverlayInstruction[];
  } | null;
  progress: {
    current: number;
    total: number;
  };
  trees: UrlTree.Data[];
  preferences: OverlayPreferences;
}

interface AreaLabel {
  name: string;
  map_name?: string | null;
}

interface QuestLabel {
  name: string;
  reward_offers?: Partial<
    Record<
      string,
      {
        quest_npc?: string;
      }
    >
  >;
}

interface GemLabel {
  name: string;
}

export interface OverlaySnapshotInput {
  route: RouteData.Route;
  activeEdgeIndex: number;
  autoProgressEnabled: boolean;
  paused: boolean;
  connectionState: LogApiConnectionState;
  areas: Record<string, AreaLabel>;
  quests: Record<string, QuestLabel>;
  gems: Record<string, GemLabel>;
  trees: UrlTree.Data[];
  preferences: OverlayPreferences;
}

function areaName(
  areaId: string,
  areas: OverlaySnapshotInput["areas"],
): string {
  const area = areas[areaId];
  return area?.map_name || area?.name || areaId;
}

function fragmentText(
  fragment: Fragments.AnyFragment,
  input: OverlaySnapshotInput,
): string {
  if (typeof fragment === "string") {
    return fragment;
  }

  switch (fragment.type) {
    case "kill":
    case "arena":
    case "generic":
    case "quest_text":
      return fragment.value;
    case "area":
    case "enter":
      return areaName(fragment.areaId, input.areas);
    case "logout":
      return `Logout → ${areaName(fragment.areaId, input.areas)}`;
    case "waypoint":
      return "Waypoint";
    case "waypoint_use":
      return `Waypoint → ${areaName(fragment.dstAreaId, input.areas)}`;
    case "waypoint_get":
      return "Get waypoint";
    case "portal_use":
      return `Portal → ${areaName(fragment.dstAreaId, input.areas)}`;
    case "portal_set":
      return "Set portal";
    case "quest": {
      const quest = input.quests[fragment.questId];
      if (quest === undefined) {
        return fragment.questId;
      }
      const npcs = Array.from(
        new Set(
          fragment.rewardOffers
            .map((rewardOffer) => quest.reward_offers?.[rewardOffer]?.quest_npc)
            .filter((npc): npc is string => npc !== undefined),
        ),
      );
      return [quest.name, ...npcs].join(" - ");
    }
    case "reward_quest":
      return `Take ${fragment.item}`;
    case "reward_vendor":
      return `Buy ${fragment.item}`;
    case "trial":
      return "Trial of Ascendancy";
    case "ascend":
      return `Ascend (${fragment.version})`;
    case "crafting":
      return `Crafting: ${fragment.crafting_recipes.join(", ")}`;
    case "dir": {
      const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
      return directions[fragment.dirIndex] ?? "";
    }
    case "copy":
      return "";
  }
}

function stepText(
  step: RouteData.FragmentStep,
  input: OverlaySnapshotInput,
): string {
  return step.parts
    .map((fragment) => fragmentText(fragment, input))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function fragmentStepInstruction(
  step: RouteData.FragmentStep,
  input: OverlaySnapshotInput,
): OverlayInstruction {
  return {
    text: stepText(step, input),
    source: {
      type: "fragment",
      parts: step.parts,
    },
  };
}

function appendStepDetails(
  details: OverlayInstruction[],
  step: RouteData.FragmentStep,
  input: OverlaySnapshotInput,
  includeStep: boolean,
) {
  if (includeStep) {
    const instruction = fragmentStepInstruction(step, input);
    if (instruction.text) {
      details.push(instruction);
    }
  }
  for (const subStep of step.subSteps) {
    appendStepDetails(details, subStep, input, true);
  }
}

function gemStepInstruction(
  step: RouteData.GemStep,
  input: OverlaySnapshotInput,
): OverlayInstruction {
  const verb = step.rewardType === "quest" ? "Take" : "Buy";
  const name = input.gems[step.requiredGem.id]?.name ?? step.requiredGem.id;
  const count = step.count > 1 ? ` x${step.count}` : "";
  const note = step.requiredGem.note.trim();
  return {
    text: `${verb} ${name}${count}${note ? ` — ${note}` : ""}`,
    source: {
      type: "gem",
      requiredGem: step.requiredGem,
      rewardType: step.rewardType,
      count: step.count,
    },
  };
}

function checkpointDetails(
  input: OverlaySnapshotInput,
  sectionIndex: number,
  stepIndex: number,
): OverlayInstruction[] {
  const details: OverlayInstruction[] = [];

  for (
    let currentSectionIndex = sectionIndex;
    currentSectionIndex < input.route.sections.length;
    currentSectionIndex++
  ) {
    const section = input.route.sections[currentSectionIndex];
    const firstStepIndex = currentSectionIndex === sectionIndex ? stepIndex : 0;

    for (
      let currentStepIndex = firstStepIndex;
      currentStepIndex < section.steps.length;
      currentStepIndex++
    ) {
      const step = section.steps[currentStepIndex];
      if (step.type === "gem_step") {
        details.push(gemStepInstruction(step, input));
        continue;
      }

      const targetStep =
        currentSectionIndex === sectionIndex && currentStepIndex === stepIndex;
      if (!targetStep && step.edgeIndex !== null) {
        return details;
      }

      appendStepDetails(details, step, input, !targetStep);
    }
  }

  return details;
}

function checkpointForEdge(
  input: OverlaySnapshotInput,
  edgeIndex: number,
): OverlaySnapshot["previousCheckpoint"] {
  if (edgeIndex < 0 || edgeIndex >= input.route.edges.length) {
    return null;
  }

  for (
    let sectionIndex = 0;
    sectionIndex < input.route.sections.length;
    sectionIndex++
  ) {
    const section = input.route.sections[sectionIndex];
    for (let stepIndex = 0; stepIndex < section.steps.length; stepIndex++) {
      const step = section.steps[stepIndex];
      if (step.type !== "fragment_step" || step.edgeIndex !== edgeIndex) {
        continue;
      }

      const instructions = checkpointDetails(input, sectionIndex, stepIndex);
      if (instructions.length === 0) {
        return null;
      }

      const checkpointAreaId = input.route.edges[edgeIndex];
      return {
        areaName: areaName(checkpointAreaId, input.areas),
        instructions,
      };
    }
  }

  return null;
}

function statusFor(
  input: OverlaySnapshotInput,
  complete: boolean,
): OverlayStatus {
  if (complete) {
    return "complete";
  }
  if (!input.autoProgressEnabled) {
    return "inactive";
  }
  if (input.paused) {
    return "paused";
  }
  if (input.connectionState.status !== "connected") {
    return "disconnected";
  }
  return "active";
}

export function buildOverlaySnapshot(
  input: OverlaySnapshotInput,
): OverlaySnapshot {
  const total = Math.max(0, input.route.edges.length - 1);
  const nextEdgeIndex = input.activeEdgeIndex + 1;
  const complete = nextEdgeIndex >= input.route.edges.length;
  const status = statusFor(input, complete);
  const previousCheckpoint = checkpointForEdge(input, input.activeEdgeIndex);

  if (complete) {
    return {
      version: OVERLAY_SNAPSHOT_VERSION,
      status,
      sectionTitle: null,
      areaId: null,
      areaName: null,
      primaryInstruction: {
        text: "Guide complete",
        source: null,
      },
      secondaryInstructions: [],
      previousCheckpoint,
      progress: { current: total, total },
      trees: input.trees,
      preferences: input.preferences,
    };
  }

  for (
    let sectionIndex = 0;
    sectionIndex < input.route.sections.length;
    sectionIndex++
  ) {
    const section = input.route.sections[sectionIndex];
    for (let stepIndex = 0; stepIndex < section.steps.length; stepIndex++) {
      const step = section.steps[stepIndex];
      if (step.type !== "fragment_step" || step.edgeIndex !== nextEdgeIndex) {
        continue;
      }

      const areaId = input.route.edges[nextEdgeIndex] ?? null;
      return {
        version: OVERLAY_SNAPSHOT_VERSION,
        status,
        sectionTitle: section.name,
        areaId,
        areaName: areaId === null ? null : areaName(areaId, input.areas),
        primaryInstruction: fragmentStepInstruction(step, input),
        secondaryInstructions: checkpointDetails(
          input,
          sectionIndex,
          stepIndex,
        ),
        previousCheckpoint,
        progress: {
          current: Math.min(nextEdgeIndex, total),
          total,
        },
        trees: input.trees,
        preferences: input.preferences,
      };
    }
  }

  return {
    version: OVERLAY_SNAPSHOT_VERSION,
    status,
    sectionTitle: null,
    areaId: input.route.edges[nextEdgeIndex] ?? null,
    areaName: null,
    primaryInstruction: {
      text: "Next route instruction unavailable",
      source: null,
    },
    secondaryInstructions: [],
    previousCheckpoint,
    progress: {
      current: Math.min(nextEdgeIndex, total),
      total,
    },
    trees: input.trees,
    preferences: input.preferences,
  };
}
