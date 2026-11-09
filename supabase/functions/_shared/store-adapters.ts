/**
 * Contrato comum para conectores de lojas do Radar.
 *
 * Nenhum conector deve consultar uma loja até existir uma fonte autorizada
 * (API, feed ou acordo de acesso) e seus limites estarem documentados.
 */
export type StoreKey = "kabum" | "pichau" | "terabyte";

export type StoreAdapterStatus =
  | "awaiting_authorized_source"
  | "ready"
  | "temporarily_unavailable";

export type StoreProduct = {
  source: StoreKey;
  external_id: string;
  title: string;
  price: number;
  currency: "BRL";
  url: string;
  image_url: string | null;
  installments: number;
  installment_amount: number;
  free_shipping: boolean;
  shipping_verified: boolean;
};

export type RawStoreProduct = {
  id?: unknown;
  title?: unknown;
  price?: unknown;
  url?: unknown;
  image_url?: unknown;
  installments?: unknown;
  installment_amount?: unknown;
  free_shipping?: unknown;
};

export type StoreAdapter = {
  key: StoreKey;
  label: string;
  status: StoreAdapterStatus;
  allowedHosts: readonly string[];
  note: string;
};

export const storeAdapters: readonly StoreAdapter[] = [
  {
    key: "kabum",
    label: "KaBuM!",
    status: "awaiting_authorized_source",
    allowedHosts: ["kabum.com.br", "www.kabum.com.br"],
    note: "A API documentada encontrada é de integração de sellers; falta uma fonte autorizada para consulta de comprador.",
  },
  {
    key: "pichau",
    label: "Pichau",
    status: "awaiting_authorized_source",
    allowedHosts: ["pichau.com.br", "www.pichau.com.br"],
    note: "Aguardando validação de fonte autorizada para catálogo e preços.",
  },
  {
    key: "terabyte",
    label: "Terabyte",
    status: "awaiting_authorized_source",
    allowedHosts: ["terabyteshop.com.br", "www.terabyteshop.com.br"],
    note: "A API encontrada exige usuário autorizado do Manager Terabyte; falta uma fonte de consulta pública autorizada.",
  },
] as const;

/** Valida e normaliza um produto recebido de uma futura fonte autorizada. */
export function normalizeStoreOffer(
  source: StoreKey,
  raw: RawStoreProduct,
): StoreProduct | null {
  const adapter = storeAdapters.find((item) => item.key === source);
  if (!adapter) return null;

  const id = String(raw.id ?? "").trim();
  const title = String(raw.title ?? "").trim();
  const price = Number(raw.price);
  const rawUrl = String(raw.url ?? "").trim();
  if (!id || !title || !Number.isFinite(price) || price <= 0 || !rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !adapter.allowedHosts.includes(url.hostname.toLowerCase())) {
    return null;
  }

  const installmentsValue = Number(raw.installments);
  const installments = Number.isInteger(installmentsValue) && installmentsValue > 0
    ? installmentsValue
    : 1;
  const installmentAmountValue = Number(raw.installment_amount);
  const installmentAmount = Number.isFinite(installmentAmountValue) && installmentAmountValue > 0
    ? installmentAmountValue
    : price;

  return {
    source,
    external_id: id,
    title: title.slice(0, 500),
    price,
    currency: "BRL",
    url: url.toString(),
    image_url: typeof raw.image_url === "string" && raw.image_url.startsWith("https://")
      ? raw.image_url
      : null,
    installments,
    installment_amount: installmentAmount,
    free_shipping: raw.free_shipping === true,
    // A source must explicitly report free shipping before this is trusted.
    shipping_verified: raw.free_shipping === true,
  };
}
