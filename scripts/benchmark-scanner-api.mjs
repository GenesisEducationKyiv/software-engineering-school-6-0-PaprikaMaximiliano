#!/usr/bin/env node
/**
 * Benchmark REST vs gRPC for ListScanTargets (release-scanner → subscription API).
 *
 * Prerequisites:
 *   - Stack running: docker compose up -d --build
 *   - INTERNAL_API_KEY set in environment (same as docker-compose)
 *
 * Usage:
 *   npm run benchmark:scanner-api
 *   (reads INTERNAL_API_KEY from .env or environment)
 *
 * Optional env:
 *   REST_URL=http://localhost:3000/internal/scanner/scan-targets
 *   GRPC_HOST=localhost:50051
 *   CONNECTIONS=50
 *   DURATION=10
 */

import "dotenv/config";
import autocannon from "autocannon";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const protoFile = path.join(rootDir, "proto/scanner/v1/scanner_access.proto");

const apiKey = process.env.INTERNAL_API_KEY;
if (!apiKey) {
  console.error("INTERNAL_API_KEY is required");
  process.exit(1);
}

const restUrl =
  process.env.REST_URL ?? "http://localhost:3000/internal/scanner/scan-targets";
const grpcHost = process.env.GRPC_HOST ?? "localhost:50051";
const connections = Number(process.env.CONNECTIONS ?? 50);
const duration = Number(process.env.DURATION ?? 10);

function formatNumber(value) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function benchmarkRest() {
  const result = await autocannon({
    url: restUrl,
    connections,
    duration,
    headers: {
      "x-api-key": apiKey,
    },
  });

  return {
    transport: "REST",
    requestsPerSecond: result.requests.average,
    latencyP99Ms: result.latency.p99,
    totalRequests: result.requests.total,
  };
}

function parseGhzJsonOutput(output) {
  if (!output?.trim()) {
    return null;
  }

  try {
    return JSON.parse(output);
  } catch {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(output.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function extractGhzP99Ms(payload) {
  const p99Entry = payload.latencyDistribution?.find((entry) => entry.percentage === 99);
  if (p99Entry?.latency != null) {
    return p99Entry.latency / 1_000_000;
  }

  if (payload.latency?.p99 != null) {
    return payload.latency.p99 / 1_000_000;
  }

  return 0;
}

function benchmarkGrpc() {
  const ghzCheck = spawnSync("ghz", ["--version"], { encoding: "utf8" });
  if (ghzCheck.error || ghzCheck.status !== 0) {
    console.warn("ghz not installed — skipping gRPC benchmark.");
    console.warn("Install: https://github.com/bojand/ghz#install");
    return null;
  }

  const result = spawnSync(
    "ghz",
    [
      "--insecure",
      "--proto",
      protoFile,
      "--call",
      "scanner.v1.ScannerAccessService/ListScanTargets",
      "-d",
      "{}",
      "-m",
      JSON.stringify({ "x-api-key": apiKey }),
      "-c",
      String(connections),
      "-z",
      `${duration}s`,
      "--format",
      "json",
      grpcHost,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );

  const output = result.stdout?.trim() || result.stderr?.trim();
  const payload = parseGhzJsonOutput(output);

  if (!payload) {
    console.error("ghz failed:", result.stderr || result.stdout || "no output");
    return null;
  }

  if (result.status !== 0 && (payload.count ?? 0) === 0) {
    console.error("ghz failed:", result.stderr || result.stdout);
    return null;
  }

  return {
    transport: "gRPC",
    requestsPerSecond: payload.rps ?? payload.RPS ?? 0,
    latencyP99Ms: extractGhzP99Ms(payload),
    totalRequests: payload.count ?? payload.total ?? 0,
  };
}

async function main() {
  console.log(`Benchmarking ListScanTargets (${connections} connections, ${duration}s)\n`);

  const rest = await benchmarkRest();
  const grpc = benchmarkGrpc();

  const rows = [rest, grpc].filter(Boolean);
  console.table(rows);

  if (grpc) {
    const restFaster = rest.requestsPerSecond > grpc.requestsPerSecond;
    console.log("\nComparison:");
    console.log(
      `- REST: ${formatNumber(rest.requestsPerSecond)} req/s, p99 ${formatNumber(rest.latencyP99Ms)} ms`,
    );
    console.log(
      `- gRPC: ${formatNumber(grpc.requestsPerSecond)} req/s, p99 ${formatNumber(grpc.latencyP99Ms)} ms`,
    );
    console.log(
      restFaster
        ? "- On this local run REST was faster. Small JSON payloads and Node HTTP overhead can favor REST in short benchmarks; gRPC often wins at scale with HTTP/2 multiplexing and binary protobuf encoding."
        : "- On this local run gRPC was faster. Binary protobuf + HTTP/2 typically reduce serialization and connection overhead versus JSON REST for sustained unary RPC traffic.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
