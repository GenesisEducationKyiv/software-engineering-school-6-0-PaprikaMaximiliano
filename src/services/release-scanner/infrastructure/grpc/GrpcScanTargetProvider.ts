import type { ListScanTargetsResponse } from "@/gen/scanner/v1/scanner_access";
import type { ScanTarget } from "@/modules/subscription/contracts/scannerContracts";
import type { ScanTargetProvider } from "@/modules/release-scanner/ports/ScanTargetProvider";
import type { GrpcSubscriptionApiClient } from "./GrpcSubscriptionApiClient";

export class GrpcScanTargetProvider implements ScanTargetProvider {
  constructor(private readonly client: GrpcSubscriptionApiClient) {}

  async listScanTargets(): Promise<ScanTarget[]> {
    const response: ListScanTargetsResponse = await this.client.listScanTargets();

    return response.targets.map((target) => ({
      id: target.id,
      fullName: target.fullName,
      lastSeenTag: target.lastSeenTag ?? null,
      subscribers: target.subscribers.map((subscriber) => ({
        email: subscriber.email,
        unsubscribeUrl: subscriber.unsubscribeUrl,
      })),
    }));
  }
}
