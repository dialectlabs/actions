export function extractFiltersFromEncodedFilters(encodedFilters: string) {
  try {
    return JSON.parse(
      Buffer.from(decodeURIComponent(encodedFilters), 'base64').toString(),
    );
  } catch (e) {
    console.warn(e);
    return null;
  }
}

export const buildFilterInfo = (
  filters: any,
  withoutTraitFilters: boolean = false,
): string => {
  let info = ``;
  if (!!filters.fromRank || !!filters.toRank) {
    if (filters.fromRank && filters.toRank)
      info += `- rank ${filters.fromRank} - ${filters.toRank}`;
    else if (filters.fromRank) info += `- bottom ${filters.fromRank} rank`;
    else info += `- top ${filters.toRank} rank`;
    info += '\n';
  }
  if (!!filters.fromPrice || !!filters.toPrice) {
    if (filters.fromPrice && filters.toPrice)
      info += `- priced between ${filters.fromPrice} - ${filters.toPrice} sol`;
    else if (filters.fromPrice) info += `- over ${filters.fromPrice} sol`;
    else info += `- under ${filters.toPrice} sol`;
    info += '\n';
  }
  if (!!filters.fromTraitCount || !!filters.toTraitCount) {
    if (filters.fromTraitCount && filters.toTraitCount)
      info += `- between ${filters.fromTraitCount} - ${filters.toTraitCount} traits`;
    else if (filters.fromTraitCount)
      filters.fromTraitCount === 1
        ? (info += `- more than ${filters.fromTraitCount} trait`)
        : (info += `- more than ${filters.fromTraitCount} traits`);
    else
      filters.toTraitCount === 1
        ? (info += `- less than ${filters.toTraitCount} trait`)
        : (info += `- less than ${filters.toTraitCount} traits`);
    info += '\n';
  }
  if (
    filters.traitsFilter &&
    Object.keys(filters.traitsFilter).length > 0 &&
    !withoutTraitFilters
  ) {
    info += '- trait filters: \n';
    Object.entries(filters.traitsFilter as Record<string, string[]>).map(
      ([trait, values]) => {
        info += `\t${trait.toLowerCase()} = ${values.map((value) => value.toLowerCase()).join('/')}\n`;
      },
    );
  }
  // Remove last "\n" if given
  if (info.length >= 1) return info.slice(0, -1);
  return info;
};
