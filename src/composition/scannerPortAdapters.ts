import type { ScannerAccessService } from "../modules/subscription/application/ScannerAccessService";
import type { RepositoryStateUpdater } from "../modules/release-scanner/ports/RepositoryStateUpdater";
import type { ScanTargetProvider } from "../modules/release-scanner/ports/ScanTargetProvider";

export function asScanTargetProvider(service: ScannerAccessService): ScanTargetProvider {
  return {
    listScanTargets: () => service.listScanTargets(),
  };
}

export function asRepositoryStateUpdater(service: ScannerAccessService): RepositoryStateUpdater {
  return {
    updateLastSeenTag: (repositoryId, previousLastSeenTag, newLastSeenTag) =>
      service.updateLastSeenTag({
        repositoryId,
        previousLastSeenTag,
        newLastSeenTag,
      }),
  };
}
