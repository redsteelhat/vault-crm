import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DomainAvatar } from "@/components/DomainAvatar";

describe("DomainAvatar", () => {
  it("renders initial from domain", () => {
    render(<DomainAvatar domain="https://example.com/path" />);
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByTitle("https://example.com/path")).toBeInTheDocument();
  });

  it("returns null when no domain", () => {
    const { container } = render(<DomainAvatar domain={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
