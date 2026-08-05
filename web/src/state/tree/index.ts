import { type ViewBox, buildTemplate } from "./svg";
import type { SkillTree } from "common";
import PLazy from "p-lazy";
import bundledTreeData from "virtual:tree-data";

type TreeRenderData = [SkillTree.Data, SkillTree.NodeLookup, string, ViewBox];

function prepareTreeData(value: string): TreeRenderData {
  const skillTree: SkillTree.Data = JSON.parse(value);
  const nodeLookup: SkillTree.NodeLookup = Object.assign(
    {},
    ...skillTree.graphs.map((x) => x.nodes),
  );

  const { svg, viewBox } = buildTemplate(skillTree, nodeLookup);

  return [skillTree, nodeLookup, svg, viewBox];
}

export const TREE_DATA_LOOKUP = Object.entries(bundledTreeData).reduce(
  (record, [key, value]) => {
    const version = /.*\/(.*?).json$/.exec(key)![1];
    record[version] = new PLazy((resolve, reject) => {
      const source =
        typeof value === "string" ? Promise.resolve(value) : value();
      source.then(
        (treeData: string) => resolve(prepareTreeData(treeData)),
        reject,
      );
    });
    return record;
  },
  {} as Record<string, PromiseLike<TreeRenderData>>,
);
