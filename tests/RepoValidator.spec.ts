import { describe, it, expect, vi, beforeEach } from "vitest";
import { RepoValidator } from "../src/subscription/RepoValidator";
import { ISourceControlClient } from "../src/integrations/ports/ISourceControlClient";
import { ResourceNotFoundError, GitHubNotFoundError } from "../src/errors";

describe("RepoValidator", () => {
  const mockSourceControlClient = {
    getLatestReleaseTag: vi.fn(),
  } as unknown as ISourceControlClient;

  let validator: RepoValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new RepoValidator(mockSourceControlClient);
  });

  it("should return the tag when the repository is valid", async () => {
    const expectedTag = "v2.0.0";
    vi.mocked(mockSourceControlClient.getLatestReleaseTag).mockResolvedValue(expectedTag);

    const result = await validator.validateAndGetLatestTag("owner/repo");

    expect(result).toBe(expectedTag);
    expect(mockSourceControlClient.getLatestReleaseTag).toHaveBeenCalledWith("owner/repo");
  });

  it("should return null if the client returns null (no releases found)", async () => {
    vi.mocked(mockSourceControlClient.getLatestReleaseTag).mockResolvedValue(null);

    const result = await validator.validateAndGetLatestTag("owner/repo");

    expect(result).toBeNull();
  });

  it("should catch GitHubNotFoundError and throw ResourceNotFoundError", async () => {
    vi.mocked(mockSourceControlClient.getLatestReleaseTag).mockRejectedValue(
      new GitHubNotFoundError("Repo not found on GitHub"),
    );

    await expect(validator.validateAndGetLatestTag("owner/invalid")).rejects.toThrow(
      ResourceNotFoundError,
    );

    await expect(validator.validateAndGetLatestTag("owner/invalid")).rejects.toThrow(
      "Repository not found on GitHub",
    );
  });

  it("should re-throw unknown errors as-is", async () => {
    const unexpectedError = new Error("Network Timeout");
    vi.mocked(mockSourceControlClient.getLatestReleaseTag).mockRejectedValue(unexpectedError);

    await expect(validator.validateAndGetLatestTag("owner/repo")).rejects.toThrow(
      "Network Timeout",
    );
  });
});
