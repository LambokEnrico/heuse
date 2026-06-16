import { createRouteHandler } from "uploadthing/server";
import { uploadthingRouter } from "./core";

const handler = createRouteHandler({
  router: uploadthingRouter,
});

export { handler as GET, handler as POST };