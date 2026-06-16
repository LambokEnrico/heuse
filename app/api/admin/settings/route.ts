import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";

export async function GET() {
  const auth = await requireRoleApi(["OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const whatsapp = await prisma.setting.findUnique({
      where: { key: "whatsapp" },
    });

    return NextResponse.json({ whatsapp: whatsapp?.value || "" });
  } catch (error) {
    console.error("[GET /api/admin/settings]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
