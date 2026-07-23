import { Fragment as renderFragment } from "../components/FragmentStep/Fragment";
import { GemReward } from "../components/ItemReward";
import { SplitRow } from "../components/SplitRow";
import type { OverlayInstruction } from "./overlaySnapshot";
import { Fragment, type ReactNode } from "react";

interface OverlayInstructionViewProps {
  instruction: OverlayInstruction;
}

export function OverlayInstructionView({
  instruction,
}: OverlayInstructionViewProps) {
  const { source } = instruction;
  if (source === null) {
    return <>{instruction.text}</>;
  }

  if (source.type === "gem") {
    return (
      <GemReward
        requiredGem={source.requiredGem}
        count={source.count}
        rewardType={source.rewardType}
        readOnly
      />
    );
  }

  const headNodes: ReactNode[] = [];
  const tailNodes: ReactNode[] = [];
  for (let index = 0; index < source.parts.length; index++) {
    const [head, tail] = renderFragment(source.parts[index], {
      readOnly: true,
    });
    if (head !== null) {
      headNodes.push(<Fragment key={`head-${index}`}>{head}</Fragment>);
    }
    if (tail !== null) {
      tailNodes.push(<Fragment key={`tail-${index}`}>{tail}</Fragment>);
    }
  }

  if (headNodes.length > 0 && tailNodes.length > 0) {
    return <SplitRow left={headNodes} right={tailNodes} />;
  }

  return <>{headNodes.length > 0 ? headNodes : tailNodes}</>;
}
