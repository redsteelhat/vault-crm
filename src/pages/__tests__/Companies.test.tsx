import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Companies } from "@/pages/Companies";

const apiMock = vi.hoisted(() => ({
  companyList: vi.fn(),
  companyCreate: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));

describe("Companies A2 create form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.companyList.mockResolvedValue([]);
    apiMock.companyCreate.mockResolvedValue({});
  });

  it("renders A2 fields in create form", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Companies />
      </MemoryRouter>
    );

    await screen.findByText("Şirketler");
    await user.click(screen.getByRole("button", { name: /Şirket ekle/i }));

    expect(screen.getByPlaceholderText("Şirket adı *")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Domain (örn. company.com)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Sektör")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Şirket notları…")).toBeInTheDocument();
  });

  it("submits create with trimmed values", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Companies />
      </MemoryRouter>
    );

    await screen.findByText("Şirketler");
    await user.click(screen.getByRole("button", { name: /Şirket ekle/i }));

    await user.type(screen.getByPlaceholderText("Şirket adı *"), " Acme ");
    await user.type(screen.getByPlaceholderText("Domain (örn. company.com)"), " example.com ");
    await user.type(screen.getByPlaceholderText("Sektör"), " SaaS ");
    await user.type(screen.getByPlaceholderText("Şirket notları…"), " Not ");

    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(apiMock.companyCreate).toHaveBeenCalledWith({
      name: "Acme",
      domain: "example.com",
      industry: "SaaS",
      notes: "Not",
    });
  });
});
