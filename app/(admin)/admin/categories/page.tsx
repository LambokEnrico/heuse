"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

interface CategoryWithCount extends Category {
  _count: { products: number };
}

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        // Paginated response: { data, total, page, pageSize, totalPages }
        setCategories(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load categories", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = editingCategory
        ? await updateCategory({ id: editingCategory.id, ...formData })
        : await createCategory(formData);

      if (!result.success) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Success",
        description: `Category ${editingCategory ? "updated" : "created"} successfully`,
      });
      setModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", slug: "" });
      fetchCategories();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);
    try {
      const result = await deleteCategory({ id: deletingCategory.id });
      if (!result.success) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Category deleted successfully" });
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, slug: category.slug });
    setModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setDeletingCategory(category);
    setDeleteModalOpen(true);
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (cat: CategoryWithCount) => (
        <span className="font-medium text-heuse-text">{cat.name}</span>
      ),
    },
    { key: "slug", header: "Slug" },
    {
      key: "products",
      header: "Products",
      render: (cat: CategoryWithCount) => cat._count?.products || 0,
    },
    {
      key: "actions",
      header: "Actions",
      render: (cat: CategoryWithCount) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditModal(cat)}>
            <Edit className="h-4 w-4 text-heuse-gold" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openDeleteModal(cat)}>
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
            Categories
          </h1>
          <p className="text-heuse-muted mt-1">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: "", slug: "" });
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm">
        <DataTable
          data={categories}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No categories yet"
        />
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Jackets"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="jackets"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete"{deletingCategory?.name}"? This action cannot be undone.
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
