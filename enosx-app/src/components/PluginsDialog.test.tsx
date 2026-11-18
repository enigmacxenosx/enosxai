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

describe("PluginsDialog connector catalog interactions", () => {
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

  it("filters connector listings by search text", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(screen.getByRole("textbox", { name: "Search plugins" }), "github");

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.queryByText("Shopify")).not.toBeInTheDocument();
    expect(screen.queryByText("Vercel")).not.toBeInTheDocument();
  });

  it("switches between All and Connectors without showing unrelated content", async () => {
    const user = userEvent.setup();
    renderCatalog();

    const allTab = screen.getByRole("tab", { name: "All" });
    const connectorsTab = screen.getByRole("tab", { name: "Connectors" });

    expect(allTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Your plugins")).not.toBeInTheDocument();
    expect(screen.getByText("Most used")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Skills" })).not.toBeInTheDocument();
    expect(screen.queryByText(/custom skill|prompt template|copy into a request/i)).not.toBeInTheDocument();

    await user.click(connectorsTab);
    expect(connectorsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Connectors" })).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.queryByText("Most used")).not.toBeInTheDocument();
  });

  it("limits the connector listing to connected services when the filter is enabled", async () => {
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
    expect(screen.queryByText("Shopify")).not.toBeInTheDocument();
  });

  it("uses official brand colors for supported connector logos", () => {
    renderCatalog();
    const githubLogo = document.querySelector('[title="GitHub"]');
    const shopifyLogo = document.querySelector('[title="Shopify"]');

    expect(githubLogo).toHaveStyle({ color: "#181717" });
    expect(shopifyLogo).toHaveStyle({ color: "#7AB55C" });
  });
});
