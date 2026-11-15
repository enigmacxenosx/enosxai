import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EnosxSignInModal from "./EnosxSignInModal";

const auth = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPhoneCode: vi.fn(),
  confirmPhoneCode: vi.fn(),
  continueAsGuest: vi.fn(),
  clearError: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    ...auth,
    error: "",
    isLoading: false,
  }),
}));

vi.mock("@/lib/firebase", () => ({ firebaseAuth: null }));
vi.mock("firebase/auth", () => ({ RecaptchaVerifier: class { clear() {} } }));

describe("EnosxSignInModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the ENOSX logo and email sign-in form", () => {
    render(<EnosxSignInModal onClose={onClose} />);

    expect(screen.getByRole("img", { name: "ENOSX AI" })).toHaveAttribute("src", "/enosx-logo.svg");
    expect(screen.getByRole("heading", { name: "Welcome to ENOSX" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email address" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("shows validation feedback for an invalid email", async () => {
    const user = userEvent.setup();
    render(<EnosxSignInModal onClose={onClose} />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("status")).toHaveTextContent("Enter a valid email address.");
  });

  it("advances a valid email to password entry and signs in", async () => {
    const user = userEvent.setup();
    render(<EnosxSignInModal onClose={onClose} />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "person@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Enter your password" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.signInWithEmail).toHaveBeenCalledWith("person@example.com", "correct horse battery staple");
  });

  it("starts Google sign-in and closes when continuing as guest", async () => {
    const user = userEvent.setup();
    render(<EnosxSignInModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(auth.signInWithGoogle).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(auth.continueAsGuest).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes from the close control", () => {
    render(<EnosxSignInModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close sign-in" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
