declare module "virtual:tree-data" {
  const treeData: Record<string, string | (() => Promise<string>)>;
  export default treeData;
}
