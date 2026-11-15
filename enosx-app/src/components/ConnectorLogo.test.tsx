import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import ConnectorLogo from "./ConnectorLogo";

describe("ConnectorLogo", () => {
  it.each([
    ["GitHub", "#181717"],
    ["Shopify", "#7AB55C"],
    ["Vercel", "#000000"],
    ["Email", "#EA4335"],
  ])("uses the official %s brand color", (name, brandColor) => {
    const { container } = render(<ConnectorLogo name={name} accent="#a78bfa" />);
    const logo = container.querySelector(`[title="${name}"]`);
    const svg = logo?.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(logo).toHaveStyle({ color: brandColor, background: "rgba(255,255,255,.94)" });
    expect(svg).toHaveAttribute("fill", "currentColor");
  });

  it("uses the supplied category accent and initials when no brand icon is available", () => {
    const { container } = render(<ConnectorLogo name="Custom Service" accent="#4ade80" />);
    const logo = container.querySelector('[title="Custom Service"]');

    expect(logo).toHaveTextContent("CS");
    expect(logo).toHaveStyle({ color: "#4ade80", background: "#4ade8018" });
    expect(logo?.querySelector("svg")).toBeNull();
  });
});
