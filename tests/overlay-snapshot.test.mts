import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOverlaySnapshot,
  type OverlaySnapshotInput,
} from "../web/src/overlay/overlaySnapshot.ts";

const defaultPreferences = {
  scale: 1,
  opacity: 0.92,
  positionX: 24,
  positionY: 80,
  coordinateMode: "game" as const,
  autoHideWhenGameInactive: true,
};

const route: OverlaySnapshotInput["route"] = {
  edges: ["1_1_1", "1_1_town", "1_1_2"],
  sections: [
    {
      name: "Act 1",
      steps: [
        {
          type: "fragment_step",
          edgeIndex: 0,
          parts: ["Kill ", { type: "kill", value: "Hillock" }],
          subSteps: [],
        },
        {
          type: "fragment_step",
          edgeIndex: 1,
          parts: ["Enter ", { type: "enter", areaId: "1_1_town" }],
          subSteps: [
            {
              type: "fragment_step",
              edgeIndex: null,
              parts: ["Talk to Tarkleigh"],
              subSteps: [],
            },
          ],
        },
        {
          type: "fragment_step",
          edgeIndex: 2,
          parts: ["Go to ", { type: "enter", areaId: "1_1_2" }],
          subSteps: [],
        },
      ],
    },
  ],
};

function input(
  overrides: Partial<OverlaySnapshotInput> = {},
): OverlaySnapshotInput {
  return {
    route,
    activeEdgeIndex: 0,
    autoProgressEnabled: true,
    paused: false,
    connectionState: { status: "connected" },
    areas: {
      "1_1_town": { name: "Lioneye's Watch", map_name: null },
      "1_1_2": { name: "The Coast", map_name: "The Coast" },
    },
    quests: {},
    gems: {},
    preferences: defaultPreferences,
    ...overrides,
  };
}

test("builds an active next-instruction snapshot", () => {
  const snapshot = buildOverlaySnapshot(input());
  assert.equal(snapshot.version, 3);
  assert.equal(snapshot.status, "active");
  assert.equal(snapshot.sectionTitle, "Act 1");
  assert.equal(snapshot.areaId, "1_1_town");
  assert.equal(snapshot.areaName, "Lioneye's Watch");
  assert.deepEqual(snapshot.primaryInstruction, {
    text: "Enter Lioneye's Watch",
    source: {
      type: "fragment",
      parts: ["Enter ", { type: "enter", areaId: "1_1_town" }],
    },
  });
  assert.deepEqual(
    snapshot.secondaryInstructions.map((instruction) => instruction.text),
    ["Talk to Tarkleigh"],
  );
  assert.equal(snapshot.previousCheckpoint, null);
  assert.deepEqual(snapshot.progress, { current: 1, total: 2 });
  assert.deepEqual(snapshot.preferences, defaultPreferences);
});

test("marks the same deterministic instruction as paused", () => {
  const snapshot = buildOverlaySnapshot(input({ paused: true }));
  assert.equal(snapshot.status, "paused");
  assert.equal(snapshot.primaryInstruction.text, "Enter Lioneye's Watch");
});

test("marks a helper outage as disconnected", () => {
  const snapshot = buildOverlaySnapshot(
    input({
      connectionState: {
        status: "reconnecting",
        attempt: 3,
        retryInMs: 4_000,
      },
    }),
  );
  assert.equal(snapshot.status, "disconnected");
});

test("marks a disabled integration as inactive", () => {
  const snapshot = buildOverlaySnapshot(
    input({
      autoProgressEnabled: false,
      connectionState: { status: "disabled" },
    }),
  );
  assert.equal(snapshot.status, "inactive");
});

test("builds a complete snapshot after the final edge", () => {
  assert.deepEqual(
    buildOverlaySnapshot(input({ activeEdgeIndex: route.edges.length - 1 })),
    {
      version: 3,
      status: "complete",
      sectionTitle: null,
      areaId: null,
      areaName: null,
      primaryInstruction: {
        text: "Guide complete",
        source: null,
      },
      secondaryInstructions: [],
      previousCheckpoint: null,
      progress: { current: 2, total: 2 },
      preferences: defaultPreferences,
    },
  );
});

test("retains every overlay detail for a checkpoint", () => {
  const routeWithManyDetails = structuredClone(route);
  const step = routeWithManyDetails.sections[0].steps[1];
  if (step.type !== "fragment_step") {
    throw new Error("Expected a fragment step fixture");
  }
  step.subSteps = ["One", "Two", "Three", "Four"].map((text) => ({
    type: "fragment_step" as const,
    edgeIndex: null,
    parts: [text],
    subSteps: [],
  }));

  assert.deepEqual(
    buildOverlaySnapshot(
      input({ route: routeWithManyDetails }),
    ).secondaryInstructions.map((instruction) => instruction.text),
    ["One", "Two", "Three", "Four"],
  );
});

test("groups non-edge route tasks into the preceding checkpoint details", () => {
  const routeWithCheckpointTask = structuredClone(route);
  const townStep = routeWithCheckpointTask.sections[0].steps[1];
  if (townStep.type !== "fragment_step") {
    throw new Error("Expected a fragment step fixture");
  }
  townStep.subSteps = [];
  routeWithCheckpointTask.sections[0].steps.splice(2, 0, {
    type: "fragment_step",
    edgeIndex: null,
    parts: [
      "Hand in ",
      {
        type: "quest",
        questId: "a1q1",
        rewardOffers: ["a1q1"],
      },
    ],
    subSteps: [],
  });

  const snapshot = buildOverlaySnapshot(
    input({
      route: routeWithCheckpointTask,
      quests: {
        a1q1: {
          name: "Enemy at the Gate",
          reward_offers: {
            a1q1: { quest_npc: "Tarkleigh" },
          },
        },
      },
    }),
  );

  assert.deepEqual(
    snapshot.secondaryInstructions.map((instruction) => instruction.text),
    ["Hand in Enemy at the Gate - Tarkleigh"],
  );
});

test("includes imported build gem rewards in checkpoint details", () => {
  const routeWithGemReward = structuredClone(route);
  routeWithGemReward.sections[0].steps.splice(2, 0, {
    type: "gem_step",
    requiredGem: {
      id: "Metadata/Items/Gems/SkillGemMagmaOrb",
      note: "",
      count: 1,
    },
    rewardType: "quest",
    count: 1,
  });

  const snapshot = buildOverlaySnapshot(
    input({
      route: routeWithGemReward,
      gems: {
        "Metadata/Items/Gems/SkillGemMagmaOrb": {
          name: "Rolling Magma",
        },
      },
    }),
  );

  assert.deepEqual(
    snapshot.secondaryInstructions.map((instruction) => instruction.text),
    ["Talk to Tarkleigh", "Take Rolling Magma"],
  );
  assert.deepEqual(snapshot.secondaryInstructions[1]?.source, {
    type: "gem",
    requiredGem: {
      id: "Metadata/Items/Gems/SkillGemMagmaOrb",
      note: "",
      count: 1,
    },
    rewardType: "quest",
    count: 1,
  });
});

test("retains the just-entered checkpoint tasks while showing the next point", () => {
  const snapshot = buildOverlaySnapshot(input({ activeEdgeIndex: 1 }));

  assert.equal(snapshot.primaryInstruction.text, "Go to The Coast");
  assert.equal(snapshot.previousCheckpoint?.areaName, "Lioneye's Watch");
  assert.deepEqual(
    snapshot.previousCheckpoint?.instructions.map(
      (instruction) => instruction.text,
    ),
    ["Talk to Tarkleigh"],
  );
});
