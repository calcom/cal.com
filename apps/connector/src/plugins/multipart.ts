import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function multipartPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 1_000_000, // Max field value size in bytes (1MB for JSON fields)
      fields: 50, // Max number of non-file fields
      fileSize: 10_000_000, // Max file size in bytes (10MB)
      files: 2, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
    },
    attachFieldsToBody: false, // Don't automatically attach fields to body
  });

  fastify.log.info("Multipart plugin registered successfully");
}

export default fp(multipartPlugin, {
  name: "multipart",
});
