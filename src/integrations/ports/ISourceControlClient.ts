export interface ISourceControlClient {
  getLatestReleaseTag(repoFullName: string): Promise<string | null>;
}
