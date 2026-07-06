/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-domain-to-api",
      severity: "error",
      comment: "Domain layer must not depend on API or gRPC delivery code.",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: { path: "^src/modules/[^/]+/(api|grpc)/" },
    },
    {
      name: "no-application-to-api",
      severity: "error",
      comment: "Application layer must not depend on API or gRPC delivery code.",
      from: { path: "^src/modules/[^/]+/application/" },
      to: { path: "^src/modules/[^/]+/(api|grpc)/" },
    },
    {
      name: "no-domain-to-infrastructure",
      severity: "error",
      comment: "Domain layer must not depend on infrastructure adapters.",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: { path: "infrastructure" },
    },
    {
      name: "no-application-to-infrastructure",
      severity: "error",
      comment: "Application layer must not depend on infrastructure adapters.",
      from: { path: "^src/modules/[^/]+/application/" },
      to: { path: "^src/modules/[^/]+/infrastructure/" },
    },
    {
      name: "no-api-to-infrastructure",
      severity: "error",
      comment: "API/gRPC delivery must not import infrastructure directly.",
      from: { path: "^src/modules/[^/]+/(api|grpc)/" },
      to: { path: "^src/modules/[^/]+/infrastructure/" },
    },
    {
      name: "no-domain-to-prisma",
      severity: "error",
      comment: "Domain layer must not import Prisma client.",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: { path: "node_modules/@prisma" },
    },
    {
      name: "no-application-to-prisma",
      severity: "error",
      comment: "Application layer must not import Prisma client.",
      from: { path: "^src/modules/[^/]+/application/" },
      to: { path: "node_modules/@prisma" },
    },
    {
      name: "no-cross-module-internals",
      severity: "error",
      comment:
        "Modules may only share via contracts, ports, or external APIs — not another module's internals.",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/(?!\\1)[^/]+/(domain|application|api|infrastructure|grpc)/",
      },
    },
    {
      name: "no-modules-to-services",
      severity: "error",
      comment: "Shared modules must not depend on process-specific service adapters.",
      from: { path: "^src/modules/" },
      to: { path: "^src/services/" },
    },
    {
      name: "no-domain-to-platform-concrete",
      severity: "error",
      comment: "Domain may only use platform errors and integration port interfaces.",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: {
        path: "^src/platform/",
        pathNot: ["^src/platform/errors", "^src/platform/integrations/ports"],
      },
    },
    {
      name: "no-application-to-platform-concrete",
      severity: "error",
      comment:
        "Application may use platform errors, ports, messages, saga, scheduling, and logger interfaces.",
      from: { path: "^src/modules/[^/]+/application/" },
      to: {
        path: "^src/platform/",
        pathNot: [
          "^src/platform/errors",
          "^src/platform/.*/ports/",
          "^src/platform/messaging/messages/",
          "^src/platform/saga/",
          "^src/platform/scheduling/",
          "^src/platform/logger/ILogger",
        ],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsConfig: {
      fileName: "tsconfig.json",
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    exclude: {
      path: "(^src/gen/)|(^dist/)|(^tests/)",
    },
  },
};
