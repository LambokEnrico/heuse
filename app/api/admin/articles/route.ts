import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { page, pageSize, skip, take } = parsePagination(request);

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          authorName: true,
          published: true,
          featured: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.article.count(),
    ]);

    return NextResponse.json(paginatedResponse(articles, total, page, pageSize));
  } catch (error) {
    console.error("[GET /api/admin/articles]", error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
