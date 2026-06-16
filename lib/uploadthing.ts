import { genUploader } from "uploadthing/client";
import type { AppRouter } from "@/app/api/uploadthing/core";

export const uploadthingClient = genUploader<AppRouter>();