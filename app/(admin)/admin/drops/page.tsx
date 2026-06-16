"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { createDrop, updateDrop, deleteDrop } from "@/app/actions";

interface Drop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  published: boolean;
  _count?: { products: number };
}

interface DropWithCount extends Drop {
  _count: { products: number };
}

export default function AdminDropsPage() {
  const { toast } = useToast();
  const [drops, setDrops] = useState<DropWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null);
  const [deletingDrop, setDeletingDrop] = useState<Drop | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    published: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDrops();
  }, []);

  const fetchDrops = async () => {
    try {
      const res = await fetch("/api/admin/drops");
      if (res.ok) {
        const data = await res.json();
        setDrops(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load drops", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = editingDrop
        ? await updateDrop({ id: editingDrop.id, ...formData })
        : await createDrop(formData);

      if (!result.success) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Success",
        description: `Drop ${editingDrop ? "updated" : "created"} successfully`,
      });
      setModalOpen(false);
      setEditingDrop(null);
      setFormData({ name: "", slug: "", description: "", published: false });
      fetchDrops();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDrop) return;
    setIsSubmitting(true);
    try {
      const result = await deleteDrop({ id: deletingDrop.id });
      if (!result.success) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Drop deleted successfully" });
      setDeleteModalOpen(false);
      setDeletingDrop(null);
      fetchDrops();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (drop: Drop) => {
    setEditingDrop(drop);
    setFormData({
      name: drop.name,
      slug: drop.slug,
      description: drop.description || "",
      published: drop.published,
    });
    setModalOpen(true);
  };

  const openDeleteModal = (drop: Drop) => {
    setDeletingDrop(drop);
    setDeleteModalOpen(true);
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (drop: DropWithCount) => (
        <span className="font-medium text-heuse-text">{drop.name}</span>
      ),
    },
    { key: "slug", header: "Slug" },
    {
      key: "published",
      header: "Status",
      render: (drop: DropWithCount) => (
        <Badge variant={drop.published ? "default" : "secondary"}>
          {drop.published ? "Published" : "Draft"}
        </Badge>
      ),
    },
    {
      key: "products",
      header: "Products",
      render: (drop: DropWithCount) => drop._count?.products || 0,
    },
    {
      key: "actions",
      header: "Actions",
      render: (drop: DropWithCount) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditModal(drop)}>
            <Edit className="h-4 w-4 text-heuse-gold" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openDeleteModal(drop)}>
            <Trash2 className="h-4 w-4 text-heuse-crimson" />
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
            Drops
          </h1>
          <p className="text-heuse-muted mt-1">
            {drops.length} drop{drops.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDrop(null);
            setFormData({ name: "", slug: "", description: "", published: false });
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Drop
        </Button>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm">
        <DataTable
          data={drops}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No drops yet"
        />
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDrop ? "Edit Drop" : "Add Drop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Summer Collection 2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="summer-collection-2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Drop description..."
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 rounded border-heuse-border bg-heuse-dark text-heuse-gold"
              />
              <span className="text-sm text-heuse-text">Published</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingDrop ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drop</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete "{deletingDrop?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
