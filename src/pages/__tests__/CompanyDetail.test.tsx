import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CompanyDetail } from "@/pages/CompanyDetail";

const apiMock = vi.hoisted(() => ({
  companyGet: vi.fn(),
  contactListByCompany: vi.fn(),
  companyUpdate: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));

describe("CompanyDetail A2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.companyGet.mockResolvedValue({
      id: "co1",
      name: "Acme",
      domain: "acme.com",
      industry: "SaaS",
      notes: "Not",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });
    apiMock.contactListByCompany.mockResolvedValue([
      {
        id: "c1",
        first_name: "Ali",
        last_name: "Veli",
        title: "CEO",
        company: "Acme",
        company_id: "co1",
        city: null,
        country: null,
        email: null,
        email_secondary: null,
        phone: null,
        phone_secondary: null,
        linkedin_url: null,
        twitter_url: null,
        website: null,
        notes: null,
        last_touched_at: null,
        next_touch_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);
    apiMock.companyUpdate.mockResolvedValue({});
  });

  it("shows contacts list with link", async () => {
    render(
      <MemoryRouter initialEntries={["/companies/co1"]}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Acme");
    expect(screen.getByText("Ali Veli")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kişiye git" })).toHaveAttribute(
      "href",
      "/contacts/c1"
    );
  });

  it("saves edited company fields", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/companies/co1"]}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Acme");
    await user.click(screen.getByRole("button", { name: /Düzenle/i }));

    await user.clear(screen.getByPlaceholderText("Şirket adı"));
    await user.type(screen.getByPlaceholderText("Şirket adı"), " Acme Inc ");

    await user.clear(screen.getByPlaceholderText("company.com"));
    await user.type(screen.getByPlaceholderText("company.com"), " https://acme.com/path ");

    await user.clear(screen.getByPlaceholderText("Örn. Fintech, SaaS"));
    await user.type(screen.getByPlaceholderText("Örn. Fintech, SaaS"), " SaaS ");

    await user.clear(screen.getByPlaceholderText("Şirket notları…"));
    await user.type(screen.getByPlaceholderText("Şirket notları…"), " Not ");

    await user.click(screen.getByRole("button", { name: /Kaydet/i }));

    expect(apiMock.companyUpdate).toHaveBeenCalledWith("co1", {
      name: "Acme Inc",
      domain: "https://acme.com/path",
      industry: "SaaS",
      notes: "Not",
    });
  });
});
