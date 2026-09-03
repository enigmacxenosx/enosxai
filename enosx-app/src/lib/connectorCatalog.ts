export type ConnectorKind = "Built-in" | "MCP" | "API";

export interface ConnectorCatalogItem {
  id: string;
  name: string;
  kind: ConnectorKind;
}

/** The only connectors currently supported by ENOSX AI. */
export const CONNECTOR_CATALOG: ConnectorCatalogItem[] = [
  { id: "github", name: "GitHub", kind: "Built-in" },
  { id: "shopify", name: "Shopify", kind: "MCP" },
  { id: "vercel", name: "Vercel", kind: "Built-in" },
  { id: "email", name: "Email", kind: "API" },
];

export const CONNECTOR_COUNT = CONNECTOR_CATALOG.length;
