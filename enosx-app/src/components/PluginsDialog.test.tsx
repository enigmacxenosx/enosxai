import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PluginsDialog from "./PluginsDialog";

vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({
    accounts: [],
    connectWithOAuth: vi.fn().mockResolvedValue(true),
    removeAccount: vi.fn(),
  }),
}));

function renderCatalog() {
  return render(
    <ThemeProvider>
      <PluginsDialog open onClose={vi.fn()} />
    </ThemeProvider>,
  );
}

describe("PluginsDialog catalog interactions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ configured: true }),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters both visible skill cards and connectors by search text", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(screen.getByRole("textbox", { name: "Search plugins" }), "repository");

    expect(screen.getByText("Repository review")).toBeInTheDocument();
    expect(screen.queryByText("Research brief")).not.toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search plugins" }));
    await user.type(screen.getByRole("textbox", { name: "Search plugins" }), "github");
    await user.click(screen.getByRole("tab", { name: "Connectors" }));

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.queryByText("Shopify")).not.toBeInTheDocument();
  });

  it("switches between All, Connectors, and Skills without mixing categories", async () => {
    const user = userEvent.setup();
    renderCatalog();

    const allTab = screen.getByRole("tab", { name: "All" });
    const connectorsTab = screen.getByRole("tab", { name: "Connectors" });
    const skillsTab = screen.getByRole("tab", { name: "Skills" });

    expect(allTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Most used skills")).toBeInTheDocument();

    await user.click(connectorsTab);
    expect(connectorsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.queryByText("Research brief")).not.toBeInTheDocument();

    await user.click(skillsTab);
    expect(skillsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Research brief")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("limits the connector list to connected services when that filter is enabled", async () => {
    localStorage.setItem("enosx-connector-accounts", JSON.stringify([
      { connector: "vercel", username: "enosx-workspace" },
    ]));
    const user = userEvent.setup();
    renderCatalog();
    await user.click(screen.getByRole("tab", { name: "Connectors" }));
    await user.click(screen.getByRole("button", { name: "Filter plugins" }));
    await user.click(screen.getByRole("button", { name: /Connected only/ }));

    expect(screen.getByText("Vercel")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });
});
