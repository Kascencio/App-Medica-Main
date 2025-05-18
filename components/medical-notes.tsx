/* --------------------------------------------------------------------------
 * components/medical-notes.tsx
 * ------------------------------------------------------------------------ */
'use client'

import { useEffect, useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { CalendarIcon, FileText, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

/* ---------- Tipos ---------- */
interface NoteApi {
  id: number
  title?: string | null
  content: string
  date: string | null // ISO string o null
}

interface MedicalNotesProps {
  readOnly?: boolean
  patientId?: number
}

export function MedicalNotes({
  readOnly = false,
  patientId,
}: MedicalNotesProps) {
  const { user } = useAuth()
  const pid =
    patientId ??
    (user?.role === 'PATIENT' ? user.profileId : undefined)

  /* ---------- estado ---------- */
  const [notes, setNotes] = useState<NoteApi[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const [newNote, setNewNote] = useState({ title: '', content: '' })
  const { toast } = useToast()

  /* ---------- fetch inicial ---------- */
  useEffect(() => {
    if (!pid) return
    const controller = new AbortController()

    fetch(`/api/notes?patientProfileId=${pid}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener notas')
        return res.json()
      })
      .then((data: NoteApi[]) => setNotes(data))
      .catch((err) => {
        /* ignoramos abortos silenciosamente */
        if (err.name !== 'AbortError') console.error(err)
      })

    return () => controller.abort()
  }, [pid])

  /* ---------- helpers ---------- */
  const resetForm = () => {
    setNewNote({ title: '', content: '' })
    setDate(new Date())
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setNewNote((p) => ({ ...p, [name]: value }))
  }

  /* ---------- crear ---------- */
  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid) return

    const payload = {
      patientProfileId: pid,
      title: newNote.title,
      content: newNote.content,
      date: date.toISOString(),
    }

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la nota',
        variant: 'destructive',
      })
      return
    }

    const created: NoteApi = await res.json()
    setNotes((n) => [created, ...n])
    resetForm()
    setOpen(false)
    toast({ title: 'Nota agregada' })
  }

  /* ---------- eliminar ---------- */
  const deleteNote = async (id: number) => {
    if (!confirm('¿Eliminar esta nota?')) return
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la nota',
        variant: 'destructive',
      })
      return
    }
    setNotes((n) => n.filter((note) => note.id !== id))
    toast({ title: 'Nota eliminada' })
  }

  /* ---------- render ---------- */
  const ordered = [...notes].sort(
    (a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime(),
  )

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="text-lg font-semibold">Notas médicas</CardTitle>

        {!readOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Agregar nota
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <form onSubmit={addNote}>
                <DialogHeader>
                  <DialogTitle>Nueva nota médica</DialogTitle>
                  <DialogDescription>
                    Añade información relevante sobre el paciente.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Título</Label>
                    <Input
                      name="title"
                      value={newNote.title}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start font-normal',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, 'PPP', { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => d && setDate(d)}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-2">
                    <Label>Contenido</Label>
                    <Textarea
                      name="content"
                      rows={5}
                      value={newNote.content}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            No hay notas registradas.
          </p>
        ) : (
          <div className="space-y-4">
            {ordered.map((note) => {
              const dateObj = note.date ? parseISO(note.date) : null
              const formatted = dateObj && isValid(dateObj)
                ? format(dateObj, "d 'de' MMMM yyyy", { locale: es })
                : '—'

              return (
                <div
                  key={note.id}
                  className="border rounded-lg p-4 flex items-start gap-4"
                >
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-base">{note.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatted}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {note.content}
                    </p>
                  </div>

                  {!readOnly && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
