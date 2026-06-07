import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";
import { Mailer } from "../src/platform/integrations/Mailer";

vi.mock("nodemailer");

type FullTransporter = ReturnType<typeof nodemailer.createTransport>;

describe("Mailer", () => {
  const mockSendMail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: mockSendMail,
    } as Partial<FullTransporter> as FullTransporter);
  });

  describe("Constructor Configuration", () => {
    it("creates an SMTP transport when full credentials are provided", () => {
      new Mailer("noreply@test.com", {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "testuser",
        pass: "testpass",
      });

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
          user: "testuser",
          pass: "testpass",
        },
      });
    });

    it("falls back to jsonTransport when credentials are missing", () => {
      new Mailer("noreply@test.com", {
        port: 587,
        secure: false,
      });

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        jsonTransport: true,
      });
    });
  });

  describe("Email Dispatchers", () => {
    let mailer: Mailer;

    beforeEach(() => {
      mailer = new Mailer("noreply@test.com", {
        port: 587,
        secure: false,
      });
    });

    it("sends a confirmation email with correctly formatted templates", async () => {
      await mailer.sendConfirmationEmail({
        to: "user@example.com",
        repo: "facebook/react",
        confirmUrl: "https://example.com/confirm?token=123",
        unsubscribeUrl: "https://example.com/unsub",
      });

      expect(mockSendMail).toHaveBeenCalledExactlyOnceWith({
        from: "noreply@test.com",
        to: "user@example.com",
        subject: "Confirm subscription for facebook/react",
        text: expect.stringContaining("https://example.com/confirm?token=123"),
      });
    });

    it("sends a release email with correctly formatted templates", async () => {
      await mailer.sendReleaseEmail({
        to: "user@example.com",
        repo: "facebook/react",
        tag: "v18.2.0",
        unsubscribeUrl: "https://example.com/unsub",
      });

      expect(mockSendMail).toHaveBeenCalledExactlyOnceWith({
        from: "noreply@test.com",
        to: "user@example.com",
        subject: "New release for facebook/react: v18.2.0",
        text: expect.stringContaining("Tag: v18.2.0"),
      });
    });
  });
});
