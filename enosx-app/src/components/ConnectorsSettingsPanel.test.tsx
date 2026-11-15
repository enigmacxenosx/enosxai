import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import ConnectorsSettingsPanel from "./ConnectorsSettingsPanel";

vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({ accounts: [], connectWithOAuth: vi.fn(), removeAccount: vi.fn() }),
}));

describe("ConnectorsSettingsPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => ({ configured: String(input).includes("/github/") }),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("distinguishes configured OAuth from missing provider setup", async () => {
    render(<ConnectorsSettingsPanel accentColor="#ef4444" accentRgb="239,68,68" />);

    await waitFor(() => expect(screen.getByText("Ready to connect")).toBeInTheDocument());
    expect(screen.getAllByText("Needs server setup")).toHaveLength(3);
    expect(screen.getAllByText("OAuth credentials are not configured on the app server.")).toHaveLength(3);
    expect(screen.getByText(/not a completed sign-in or live provider API test/i)).toBeInTheDocument();
  });

  it("marks a locally saved account as connected on this device", async () => {
    localStorage.setItem("enosx-connector-accounts", JSON.stringify([
      { connector: "vercel", username: "workspace-example", token: "never-render-this" },
    ]));
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ configured: true }) })));

    render(<ConnectorsSettingsPanel accentColor="#ef4444" accentRgb="239,68,68" />);

    await waitFor(() => expect(screen.getByText("Connected on this device")).toBeInTheDocument());
    expect(screen.getByText("workspace-example")).toBeInTheDocument();
    expect(screen.queryByText("never-render-this")).not.toBeInTheDocument();
  });
});
