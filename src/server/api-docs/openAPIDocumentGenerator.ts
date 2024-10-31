import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { healthCheckRegistry } from "../api/healthCheck/healthCheckRouter";
import { rootRegistry } from "../api/rootRouter";
import { openAPIRegistry } from "./openAPIRouter";
import { socketsRegistry } from "../api/sockets/socketsRouter";
import { authRegistry } from "../api/auth/authRouter";
import { mqttRegistry } from "../api/mqtt/mqttRouter";

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([healthCheckRegistry, rootRegistry, openAPIRegistry, socketsRegistry, authRegistry, mqttRegistry]);
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Swagger API",
    },
    externalDocs: {
      description: "View the raw OpenAPI Specification in JSON format",
      url: "/swagger.json",
    },
  });
}
