import { ISourceControlClient } from "../integrations/ports/ISourceControlClient";
import { ResourceNotFoundError, GitHubNotFoundError } from "../errors";

export class RepoValidator {
  constructor(private readonly sourceControlClient: ISourceControlClient) {}

  async validateAndGetLatestTag(repoFullName: string): Promise<string | null> {
    try {
      return await this.sourceControlClient.getLatestReleaseTag(repoFullName);
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        throw new ResourceNotFoundError("Repository not found");
      }
      throw error;
    }
  }
}
