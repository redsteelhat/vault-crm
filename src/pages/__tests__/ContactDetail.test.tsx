import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ContactDetail } from "@/pages/ContactDetail";

const apiMock = vi.hoisted(() => ({
  contactGet: vi.fn(),
  companyList: vi.fn(),
  noteList: vi.fn(),
  reminderList: vi.fn(),
  contactCustomValuesGet: vi.fn(),
  contactUpdate: vi.fn(),
  contactCustomValuesSet: vi.fn(),
  attachmentList: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));

describe("ContactDetail A1 validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.contactGet.mockResolvedValue({
      id: "c1",
      first_name: "Ali",
      last_name: "Veli",
      title: null,
      company: null,
      company_id: null,
      city: null,
      country: null,
      email: "ali@example.com",
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
    });
    apiMock.companyList.mockResolvedValue([]);
    apiMock.noteList.mockResolvedValue([]);
    apiMock.reminderList.mockResolvedValue([]);
    apiMock.contactCustomValuesGet.mockResolvedValue([]);
    apiMock.contactUpdate.mockResolvedValue({});
    apiMock.contactCustomValuesSet.mockResolvedValue({});
    apiMock.attachmentList.mockResolvedValue([]);
  });

  it("shows validation errors for invalid email and phone", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/contacts/c1"]}>
        <Routes>
          <Route path="/contacts/:id" element={<ContactDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Ali Veli");
    await user.click(screen.getByRole("button", { name: /Düzenle/i }));

    const emailInput = screen.getByPlaceholderText("email@example.com");
    await user.clear(emailInput);
    await user.type(emailInput, "bad");

    const phoneInput = screen.getByPlaceholderText("+90 5xx xxx xx xx");
    await user.clear(phoneInput);
    await user.type(phoneInput, "abc");

    const cancelButton = screen.getByRole("button", { name: /İptal/i });
    const actionBar = cancelButton.parentElement;
    if (!actionBar) {
      throw new Error("Action bar not found for ContactDetail");
    }
    await user.click(within(actionBar).getByRole("button", { name: /Kaydet/i }));

    expect(screen.getByText("Geçerli bir email girin.")).toBeInTheDocument();
    expect(screen.getByText("Geçerli bir telefon girin.")).toBeInTheDocument();
  });
});
