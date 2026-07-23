export const LOG_API_PROTOCOL_VERSION = "0.0.2";

export interface AreaEnteredEvent {
  type: "area-entered";
  areaId: string;
  areaLevel: number;
}

const AREA_GENERATION_PATTERN = /Generating level (\d+) area "([^"]+)"/;

export function parseLogApiMessage(message: unknown): AreaEnteredEvent | null {
  if (typeof message !== "string") {
    return null;
  }

  const match = AREA_GENERATION_PATTERN.exec(message);
  if (match === null) {
    return null;
  }

  const areaLevel = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(areaLevel) || areaLevel < 1) {
    return null;
  }

  return {
    type: "area-entered",
    areaId: match[2],
    areaLevel,
  };
}
