import jupiterApi, { JupiterTokenMetadata } from './jupiter-api';

export enum JupTokenListType {
  STRICT,
  ALL,
}

export async function lookupToken(
  token: string | null,
  listType: JupTokenListType = JupTokenListType.STRICT,
): Promise<JupiterTokenMetadata | null> {
  if (!token) {
    return null;
  }
  const tokenLowercase = token.toLowerCase().trim();
  // handle aliases
  const jupiterTokenCatalog = await getJupiterTokenCatalog(listType);
  const tokenBySymbol =
    jupiterTokenCatalog.tokensBySymbol[tokenLowercase] ??
    jupiterTokenCatalog.tokensBySymbol[`$${tokenLowercase}`] ??
    [];
  const jupTokenMetaDatum =
    tokenBySymbol[0] ?? jupiterTokenCatalog.tokensByAddress[token];

  return jupTokenMetaDatum ?? null;
}

async function getJupiterTokenCatalog(
  strict: JupTokenListType = JupTokenListType.STRICT,
): Promise<JupiterTokenCatalog> {
  const jupTokens =
    strict === JupTokenListType.STRICT
      ? await jupiterApi.getStrictList()
      : await jupiterApi.getTokenList();
  return {
    tokensBySymbol: jupTokens.reduce(
      (acc, token) => {
        const symbolLowerCase = token.symbol?.toLowerCase();
        if (!symbolLowerCase) {
          return acc;
        }
        acc[symbolLowerCase] = acc[symbolLowerCase] || [];
        acc[symbolLowerCase]?.push(token);
        return acc;
      },
      {} as Record<string, JupiterTokenMetadata[]>,
    ),
    tokensByAddress: jupTokens.reduce(
      (acc, token) => ({
        ...acc,
        [token.address]: token,
      }),
      {} as Record<string, JupiterTokenMetadata>,
    ),
  };
}

interface JupiterTokenCatalog {
  tokensBySymbol: Record<string, JupiterTokenMetadata[]>;
  tokensByAddress: Record<string, JupiterTokenMetadata>;
}
