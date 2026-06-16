import { createUploadthing } from "uploadthing/server";
import type { FileRouter } from "uploadthing/server";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const uploadthingRouter = {
  productImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      // SECURITY: Only authenticated ADMIN/OWNER can upload product images.
      // Previously this was hardcoded to "admin" — any unauthenticated
      // visitor could spam UploadThing storage and rack up costs.
      const session = await auth();
      if (!session?.user) {
        throw new Error("Unauthorized: sign in to upload images");
      }
      const role = session.user.role;
      if (role !== "ADMIN" && role !== "OWNER") {
        throw new Error("Forbidden: admin role required");
      }
      return { userId: session.user.id, userEmail: session.user.email };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedUrl: file.url,
        uploadedBy: metadata.userEmail,
      };
    }),
} satisfies FileRouter;

export type AppRouter = typeof uploadthingRouter;