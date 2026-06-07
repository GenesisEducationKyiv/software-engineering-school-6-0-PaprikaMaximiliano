import type { ScanTarget } from "../../subscription/contracts/scannerContracts";

export interface ScanTargetProvider {
  listScanTargets(): Promise<ScanTarget[]>;
}
