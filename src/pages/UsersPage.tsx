import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, type User } from '@/services/user.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
    retry: false,
  })

  const usersArray = Array.isArray(users) ? users : []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla silindi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı silinirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleDelete = (id: number) => {
    setUserToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete !== null) {
      deleteMutation.mutate(userToDelete)
      setUserToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kullanıcılar</h1>
          <p className="text-muted-foreground">Sistem kullanıcılarının yönetimi (PATRON Only)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedUser(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Kullanıcı Ekle
            </Button>
          </DialogTrigger>
          <UserFormDialog
            user={selectedUser}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['users'] })
            }}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Kullanıcı yönetimi endpoint'i backend'de mevcut değil. Bu özellik yakında eklenecek.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı Adı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersArray.length > 0 ? (
                usersArray.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'PATRON' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.enabled ? 'success' : 'destructive'}>
                        {user.enabled ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Kullanıcıyı Sil"
        message="Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}

function UserFormDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'PERSONEL' as 'PATRON' | 'PERSONEL',
    enabled: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        password: '',
        role: user.role || 'PERSONEL',
        enabled: user.enabled ?? true,
      })
    } else {
      setFormData({
        username: '',
        password: '',
        role: 'PERSONEL',
        enabled: true,
      })
    }
  }, [user])

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => userService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla eklendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof formData>) => {
      if (!user) throw new Error('User ID required')
      return userService.update(user.id, data)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla güncellendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      const updateData: Partial<typeof formData> = { ...formData }
      if (!formData.password) {
        delete updateData.password
      }
      updateMutation.mutate(updateData)
    } else {
      if (!formData.password) {
        toast({
          title: 'Hata',
          description: 'Şifre gerekli.',
          variant: 'destructive',
        })
        return
      }
      createMutation.mutate(formData)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
        <DialogDescription>
          {user ? 'Kullanıcı bilgilerini güncelleyin' : 'Yeni kullanıcı bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{user ? 'Yeni Şifre (boş bırakabilirsiniz)' : 'Şifre *'}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'PATRON' | 'PERSONEL') =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PATRON">PATRON</SelectItem>
                  <SelectItem value="PERSONEL">PERSONEL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {user && (
              <div className="space-y-2">
                <Label htmlFor="enabled">Durum</Label>
                <Select
                  value={formData.enabled ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, enabled: value === 'true' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {user ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

