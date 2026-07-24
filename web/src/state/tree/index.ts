import { type ViewBox, buildTemplate } from "./svg";
import type { SkillTree } from "common";
import PLazy from "p-lazy";

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

// Keep the source JSON in the initial desktop bundle. Lazy JavaScript chunks
// work through Vite's dev server, but WebView2 could not resolve the generated
// tree chunks from an installed NSIS build. Parsing and SVG preparation remain
// lazy, so only the imported tree version is expanded at runtime.
const bundledTreeData = import.meta.glob<string>(
  "/../common/data/tree/*.json",
  {
    eager: true,
    query: "?raw",
    import: "default",
  },
);

export const TREE_DATA_LOOKUP = Object.entries(bundledTreeData).reduce(
  (record, [key, value]) => {
    const version = /.*\/(.*?).json$/.exec(key)![1];
    record[version] = new PLazy((resolve) => resolve(prepareTreeData(value)));
    return record;
  },
  {} as Record<string, PromiseLike<TreeRenderData>>,
);
