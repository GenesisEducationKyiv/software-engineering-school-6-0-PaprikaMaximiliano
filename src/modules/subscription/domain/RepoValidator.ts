import type { ISourceControlClient } from "../../../platform/integrations/ports/ISourceControlClient";
import { GitHubNotFoundError, ResourceNotFoundError } from "../../../platform/errors";

export class RepoValidator {
  constructor(private readonly sourceControlClient: ISourceControlClient) {}

  async validateAndGetLatestTag(repoFullName: string): Promise<string | null> {
    try {
      return await this.sourceControlClient.getLatestReleaseTag(repoFullName);
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        throw new ResourceNotFoundError("Repository not found on GitHub");
      }
      throw error;
    }
  }
}
