export type ConnectorKind = "Built-in" | "MCP" | "API";

export interface ConnectorCatalogItem {
  id: string;
  name: string;
  kind: ConnectorKind;
}

/**
 * ENOSX-supported connectors shown in the chat picker.
 * Credentials, endpoints, and connector UIDs remain outside the frontend.
 */
export const CONNECTOR_CATALOG: ConnectorCatalogItem[] = [
  { id: "github", name: "GitHub", kind: "MCP" },
  { id: "shopify", name: "Shopify", kind: "API" },
  { id: "vercel", name: "Vercel", kind: "API" },
  { id: "email", name: "Email", kind: "Built-in" },
];
