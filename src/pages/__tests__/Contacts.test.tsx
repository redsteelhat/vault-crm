import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Contacts } from "@/pages/Contacts";

const apiMock = vi.hoisted(() => ({
  contactList: vi.fn(),
  customFieldList: vi.fn(),
  companyList: vi.fn(),
  contactCreate: vi.fn(),
  contactIdsByCustomValue: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));

describe("Contacts A1 create form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.contactList.mockResolvedValue([]);
    apiMock.customFieldList.mockResolvedValue([]);
    apiMock.companyList.mockResolvedValue([]);
    apiMock.contactCreate.mockResolvedValue({});
    apiMock.contactIdsByCustomValue.mockResolvedValue([]);
  });

  it("renders A1 fields in create form", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Contacts />
      </MemoryRouter>
    );

    await screen.findByText("Kişiler");
    await user.click(screen.getByRole("button", { name: /Kişi ekle/i }));

    expect(screen.getByPlaceholderText("Ad")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Soyad")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Unvan / Rol")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Şirket (serbest metin)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Şehir")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ülke")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email (birincil)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email (ek)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Telefon (birincil)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Telefon (ek)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("LinkedIn URL")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Twitter / X")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Web sitesi")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notlar (Markdown)")).toBeInTheDocument();

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("validates email and phone on create", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Contacts />
      </MemoryRouter>
    );

    await screen.findByText("Kişiler");
    await user.click(screen.getByRole("button", { name: /Kişi ekle/i }));

    await user.type(screen.getByPlaceholderText("Ad"), "Ali");
    await user.type(screen.getByPlaceholderText("Soyad"), "Veli");
    await user.type(screen.getByPlaceholderText("Email (birincil)"), "bad");
    await user.type(screen.getByPlaceholderText("Telefon (birincil)"), "abc");

    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(screen.getByText("Geçerli bir email girin.")).toBeInTheDocument();
    expect(screen.getByText("Geçerli bir telefon girin.")).toBeInTheDocument();
  });

  it("selecting company fills company name", async () => {
    const user = userEvent.setup();
    apiMock.companyList.mockResolvedValue([
      {
        id: "c1",
        name: "Acme",
        domain: null,
        industry: null,
        notes: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    render(
      <MemoryRouter>
        <Contacts />
      </MemoryRouter>
    );

    await screen.findByText("Kişiler");
    await user.click(screen.getByRole("button", { name: /Kişi ekle/i }));

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "c1");

    const companyInput = screen.getByPlaceholderText("Şirket (serbest metin)") as HTMLInputElement;
    expect(companyInput.value).toBe("Acme");
  });
});
