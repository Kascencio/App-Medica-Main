"use client"

import { useEffect, useState }   from "react"
import { useAuth }               from "@/lib/auth-provider"
import { Button }                from "@/components/ui/button"
import { Input }                 from "@/components/ui/input"
import { Label }                 from "@/components/ui/label"
import { Textarea }              from "@/components/ui/textarea"
import { Card, CardContent }     from "@/components/ui/card"
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Calendar }              from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useToast }              from "@/components/ui/use-toast"
import { cn }                    from "@/lib/utils"
import { format }                from "date-fns"
import { es }                    from "date-fns/locale"
import { CalendarIcon, ClipboardList, Plus, Trash2 } from "lucide-react"

/* ---------- tipos ---------- */
interface Treatment {
  id: number
  patientProfileId: number
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  progress?: string | null
}

export default function TreatmentsPage() {
  const { user } = useAuth()
  const pid =
    (user as any)?.patientId ??
    (user?.role === "PATIENT" ? (user as any)?.profileId : undefined)

  const { toast } = useToast()

  const [list, setList] = useState<Treatment[]>([])
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate,   setEndDate]   = useState<Date>()
  const [form, setForm] = useState({ title: "", description: "", progress: "" })

  /* ---------- cargar ---------- */
  useEffect(() => {
    if (!pid) return
    const ctrl = new AbortController()

    fetch(`/api/treatments?patientProfileId=${pid}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setList)
      .catch(() => toast({ title:"Error", description:"No se pudieron cargar los tratamientos", variant:"destructive" }))

    return () => ctrl.abort()
  }, [pid, toast])

  /* ---------- helpers ---------- */
  const updateForm = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const reset = () => { setForm({ title:"", description:"", progress:"" }); setStartDate(undefined); setEndDate(undefined) }

  /* ---------- alta ---------- */
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid) {
      toast({ title:"Sin perfil", variant:"destructive" })
      return
    }

    const body = {
      patientProfileId: pid,
      title: form.title,
      description: form.description || undefined,
      startDate:  startDate?.toISOString(),
      endDate:    endDate?.toISOString(),
      progress:   form.progress || undefined,
    }

    const res = await fetch("/api/treatments", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(()=>({}))
      toast({ title:"Error", description: err.error || "No se pudo guardar", variant:"destructive" })
      return
    }

    const created: Treatment = await res.json()
    setList(l => [...l, created])
    reset(); setOpen(false)
    toast({ title:"Tratamiento agregado" })
  }

  /* ---------- baja ---------- */
  const remove = async (id:number) => {
    const res = await fetch(`/api/treatments/${id}`, { method:"DELETE" })
    if (!res.ok) {
      toast({ title:"Error", description:"No se pudo eliminar", variant:"destructive" })
      return
    }
    setList(l => l.filter(t => t.id !== id))
    toast({ title:"Tratamiento eliminado" })
  }

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tratamientos</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Agregar Tratamiento</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={save}>
              <DialogHeader>
                <DialogTitle>Nuevo Tratamiento</DialogTitle>
                <DialogDescription>Complete la información</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <Input  name="title"       placeholder="Título"      value={form.title}       onChange={updateForm} required/>
                <Textarea name="description" placeholder="Descripción" value={form.description} onChange={updateForm}/>
                
                {/* fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start",!startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate,"PPP",{locale:es}) : "Inicio"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={es}/>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start",!endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate,"PPP",{locale:es}) : "Fin (opcional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={es}/>
                    </PopoverContent>
                  </Popover>
                </div>

                <Textarea name="progress" placeholder="Progreso" value={form.progress} onChange={updateForm}/>
              </div>
              <DialogFooter><Button type="submit">Guardar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* lista */}
      <div className="grid gap-4">
        {list.length ? list.map(t=>(
          <Card key={t.id}>
            <CardContent className="p-6 space-y-2">
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <ClipboardList className="h-5 w-5 text-primary"/>
                  </div>
                  <h3 className="font-medium">{t.title}</h3>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={()=>remove(t.id)}>
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>

              {t.description && <p className="text-sm">{t.description}</p>}

              {t.startDate && (
                <p className="text-xs text-muted-foreground">
                  Inicio: {format(new Date(t.startDate),"PPP",{locale:es})}
                  {t.endDate && ` · Fin: ${format(new Date(t.endDate),"PPP",{locale:es})}`}
                </p>
              )}

              {t.progress && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Progreso</h4>
                  <div className="border p-2 rounded-md text-xs mt-1 whitespace-pre-wrap">{t.progress}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )) : (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No hay tratamientos</CardContent></Card>
        )}
      </div>
    </div>
  )
}
