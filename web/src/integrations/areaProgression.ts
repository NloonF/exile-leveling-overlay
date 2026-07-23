export function nextRouteEdgeIndex(
  edges: readonly string[],
  activeEdgeIndex: number,
  enteredAreaId: string,
): number | null {
  const candidateIndex = activeEdgeIndex + 1;
  return edges[candidateIndex] === enteredAreaId ? candidateIndex : null;
}
