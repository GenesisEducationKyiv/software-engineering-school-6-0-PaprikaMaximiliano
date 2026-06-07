import type { ScanTarget } from "../../../modules/subscription/contracts/scannerContracts";
import type { ScanTargetProvider } from "../../../modules/release-scanner/ports/ScanTargetProvider";
import type { SubscriptionApiClient } from "./SubscriptionApiClient";

export class HttpScanTargetProvider implements ScanTargetProvider {
  constructor(private readonly client: SubscriptionApiClient) {}

  async listScanTargets(): Promise<ScanTarget[]> {
    const response = await this.client.get("/internal/scanner/scan-targets");

    if (!response.ok) {
      throw new Error(`Failed to fetch scan targets: ${response.status}`);
    }

    return response.json() as Promise<ScanTarget[]>;
  }
}
