import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const authCheck = await requireRole(["ADMIN", "OWNER"]);
  if (!authCheck.authorized) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
            Order {order.orderNumber}
          </h1>
          <p className="text-heuse-muted mt-1">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card className="bg-heuse-dark border-heuse-border">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-heuse-muted uppercase tracking-wider">
                Name
              </p>
              <p className="text-heuse-text">{order.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-heuse-muted uppercase tracking-wider">
                Email
              </p>
              <p className="text-heuse-text">{order.customerEmail}</p>
            </div>
            <div>
              <p className="text-xs text-heuse-muted uppercase tracking-wider">
                Phone
              </p>
              <p className="text-heuse-text">{order.customerPhone}</p>
            </div>
            <div>
              <p className="text-xs text-heuse-muted uppercase tracking-wider">
                Shipping Address
              </p>
              <p className="text-heuse-text">
                {order.addressLine1}
                <br />
                {order.city}, {order.province} {order.postalCode}
                <br />
                {order.country}
              </p>
            </div>
            {order.notes && (
              <div>
                <p className="text-xs text-heuse-muted uppercase tracking-wider">
                  Notes
                </p>
                <p className="text-heuse-text">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card className="bg-heuse-dark border-heuse-border">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusForm
              order={{
                id: order.id,
                status: order.status,
                paymentStatus: order.paymentStatus,
                fulfillmentStatus: order.fulfillmentStatus,
                internalNote: order.internalNote,
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="bg-heuse-dark border-heuse-border">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-heuse-border last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-heuse-text">{item.name}</p>
                    <p className="text-sm text-heuse-muted">Size: {item.size}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-heuse-text">
                    {formatMoney(Number(item.price))}
                  </p>
                  <p className="text-sm text-heuse-muted">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-4">
              <p className="font-heading font-semibold text-heuse-cream">
                Total
              </p>
              <p className="font-heading font-semibold text-heuse-gold">
                {formatMoney(Number(order.total))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
