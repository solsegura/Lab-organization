import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  FileText,
  FlaskConical,
  Plus,
  Search,
  Upload,
  Wrench,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const BUCKET = "documentacion-archivos"

type Categoria =
  | "Protocolos"
  | "Informes"
  | "Registros DOPE"
  | "Registros Fibras"
  | "Otros documentos"

type CategoriaGeneral = "Protocolos" | "Informes" | "Otros documentos"

type Documento = {
  id: number
  pdf: string
  Tipo: string | null
  Nombre: string | null
  DOPE: number | null
  Fibra: number | null
  Equipo: number | null
}

type Opcion = { id: number; nombre: string }

type Evento = {
  id: number
  fecha: string | null
  pdf: string | null
  dope: number | null
  fibra: number | null
  nombre: string
  raw: Record<string, unknown>
}

const CATEGORIAS: {
  nombre: Categoria
  descripcion: string
  icono: typeof FileText
}[] = [
  { nombre: "Protocolos", descripcion: "Procedimientos e instrucciones de trabajo.", icono: BookOpen },
  { nombre: "Informes", descripcion: "Informes técnicos, análisis y resultados.", icono: FileText },
  { nombre: "Registros DOPE", descripcion: "PDF asociados a eventos de preparación de DOPE.", icono: FlaskConical },
  { nombre: "Registros Fibras", descripcion: "PDF asociados a eventos de extrusión de fibras.", icono: ClipboardList },
  { nombre: "Otros documentos", descripcion: "Documentación general que no encaja en las otras categorías.", icono: Wrench },
]

function nombreSeguro(nombre: string) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

function fechaLegible(fecha: string | null | undefined) {
  if (!fecha) return "Fecha no disponible"
  const parte = fecha.slice(0, 10)
  const [a, m, d] = parte.split("-")
  return a && m && d ? `${d}/${m}/${a}` : parte
}

function esPdf(archivo: File) {
  return archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf")
}

export function Documentacion() {
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [dopes, setDopes] = useState<Opcion[]>([])
  const [fibras, setFibras] = useState<Opcion[]>([])
  const [equipos, setEquipos] = useState<Opcion[]>([])
  const [nombre, setNombre] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [dopeId, setDopeId] = useState("")
  const [fibraId, setFibraId] = useState("")
  const [equipoId, setEquipoId] = useState("")
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [eventoSubiendo, setEventoSubiendo] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

  const cargarOpciones = useCallback(async () => {
    const [dopesRes, fibrasRes, equiposRes] = await Promise.all([
      supabase.from("DOPE").select("id").order("id", { ascending: false }),
      supabase.from("Fibras").select("id").order("id", { ascending: false }),
      supabase.from("Equipo").select('id, "Nombre"').order("Nombre"),
    ])
    if (dopesRes.error) throw dopesRes.error
    if (fibrasRes.error) throw fibrasRes.error
    if (equiposRes.error) throw equiposRes.error

    setDopes((dopesRes.data ?? []).map((r) => ({ id: Number(r.id), nombre: `DOPE #${r.id}` })))
    setFibras((fibrasRes.data ?? []).map((r) => ({ id: Number(r.id), nombre: `Fibra #${r.id}` })))
    setEquipos((equiposRes.data ?? []).map((r) => ({ id: Number(r.id), nombre: r.Nombre || `Equipo #${r.id}` })))
  }, [])

  const cargarContenido = useCallback(async (tipo: Categoria) => {
    setCargando(true)
    setError("")
    setMensaje("")
    try {
      if (tipo === "Registros DOPE" || tipo === "Registros Fibras") {
        // Los registros se muestran directamente desde sus tablas de origen:
        // el PDF se adjunta al evento y no se duplica en Documentacion.
        const tabla = tipo === "Registros DOPE" ? "PreparacionDOPE" : "ExtrusionFibras"
        const { data, error: consultaError } = await supabase.from(tabla).select("*").order("id", { ascending: false })
        if (consultaError) throw consultaError

        const filas = (data ?? []) as Record<string, unknown>[]
        const eventosNormalizados = filas
          .filter((fila) => tipo !== "Registros Fibras" || fila.FormacionFibras === true)
          .map((fila) => {
            const id = Number(fila.id)
            const fecha = (fila.Fecha ?? fila.fecha ?? fila.FechaPreparacion ?? null) as string | null
            const pdf = (fila.PDF ?? fila.pdf ?? null) as string | null
            const dope = fila.DOPE == null ? null : Number(fila.DOPE)
            const fibra = fila.Fibras == null ? null : Number(fila.Fibras)
            return {
              id,
              fecha,
              pdf,
              dope,
              fibra,
              nombre: tipo === "Registros DOPE" ? `Preparación DOPE #${dope ?? id}` : `Extrusión #${id}`,
              raw: fila,
            }
          })
        setEventos(eventosNormalizados)
        setDocumentos([])
      } else {
        const { data, error: consultaError } = await supabase
          .from("Documentacion")
          .select('id, pdf, "Tipo", "Nombre", "DOPE", "Fibra", "Equipo"')
          .eq("Tipo", tipo)
          .order("id", { ascending: false })
        if (consultaError) throw consultaError
        setDocumentos((data ?? []) as Documento[])
        setEventos([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la documentación.")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarOpciones().catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las opciones de relación."))
  }, [cargarOpciones])

  useEffect(() => {
    if (categoria) void cargarContenido(categoria)
  }, [categoria, cargarContenido])

  async function abrirPdf(ruta: string) {
    if (/^https?:\/\//i.test(ruta)) {
      window.open(ruta, "_blank", "noopener,noreferrer")
      return
    }
    const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 60)
    if (urlError || !data?.signedUrl) {
      setError(urlError?.message ?? "No se pudo generar el enlace al PDF.")
      return
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  async function subirArchivo(archivoPdf: File, carpeta: string, id?: number) {
    if (!esPdf(archivoPdf)) throw new Error("Seleccioná un archivo PDF.")
    const ruta = `${carpeta}/${id ? `${id}-` : ""}${Date.now()}-${nombreSeguro(archivoPdf.name)}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(ruta, archivoPdf, {
      contentType: "application/pdf",
      upsert: false,
    })
    if (uploadError) throw uploadError
    return ruta
  }

  async function guardarDocumento() {
    if (!categoria || categoria === "Registros DOPE" || categoria === "Registros Fibras") return
    if (!nombre.trim() || !archivo) {
      setError("Ingresá un nombre y seleccioná un PDF.")
      return
    }
    setGuardando(true)
    setError("")
    setMensaje("")
    let ruta: string | null = null
    try {
      ruta = await subirArchivo(archivo, categoria.toLowerCase().replaceAll(" ", "-"))
      const { error: insertError } = await supabase.from("Documentacion").insert({
        pdf: ruta,
        Tipo: categoria as CategoriaGeneral,
        Nombre: nombre.trim(),
        DOPE: dopeId ? Number(dopeId) : null,
        Fibra: fibraId ? Number(fibraId) : null,
        Equipo: equipoId ? Number(equipoId) : null,
      })
      if (insertError) throw insertError
      setNombre("")
      setArchivo(null)
      setDopeId("")
      setFibraId("")
      setEquipoId("")
      setMostrarFormulario(false)
      setMensaje("Documento guardado correctamente.")
      await cargarContenido(categoria)
    } catch (e) {
      // Si falla el INSERT, intentamos borrar el archivo para no dejarlo huérfano.
      if (ruta) await supabase.storage.from(BUCKET).remove([ruta])
      setError(e instanceof Error ? e.message : "No se pudo guardar el documento.")
    } finally {
      setGuardando(false)
    }
  }

  async function adjuntarPdfEvento(evento: Evento) {
    if (!categoria || !archivo) {
      setError("Seleccioná un archivo PDF.")
      return
    }
    if (!esPdf(archivo)) {
      setError("Seleccioná un archivo PDF.")
      return
    }
    setEventoSubiendo(evento.id)
    setError("")
    setMensaje("")
    let ruta: string | null = null
    try {
      const tabla = categoria === "Registros DOPE" ? "Preparacion_DOPE" : "ExtrusionFibras"
      ruta = await subirArchivo(archivo, categoria === "Registros DOPE" ? "registros-dope" : "registros-fibras", evento.id)
      const { error: updateError } = await supabase.from(tabla).update({ PDF: ruta }).eq("id", evento.id)
      if (updateError) throw updateError
      setArchivo(null)
      setMensaje(`PDF adjuntado a ${evento.nombre}.`)
      await cargarContenido(categoria)
    } catch (e) {
      if (ruta) await supabase.storage.from(BUCKET).remove([ruta])
      setError(e instanceof Error ? e.message : "No se pudo adjuntar el PDF.")
    } finally {
      setEventoSubiendo(null)
    }
  }

  const documentosFiltrados = documentos.filter((doc) =>
    `${doc.Nombre ?? ""} ${doc.Tipo ?? ""} ${doc.DOPE ?? ""} ${doc.Fibra ?? ""} ${doc.Equipo ?? ""}`
      .toLowerCase().includes(busqueda.toLowerCase()),
  )
  const eventosFiltrados = eventos.filter((evento) =>
    `${evento.nombre} ${evento.fecha ?? ""} ${evento.id}`.toLowerCase().includes(busqueda.toLowerCase()),
  )

  if (!categoria) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
        <div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7" />
            <h1 className="text-3xl font-semibold tracking-tight">Documentación</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Protocolos, informes y registros del laboratorio.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS.map(({ nombre: nombreCategoria, descripcion, icono: Icono }) => (
            <button key={nombreCategoria} type="button" onClick={() => setCategoria(nombreCategoria)} className="text-left">
              <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-muted"><Icono className="h-5 w-5" /></div>
                  <CardTitle>{nombreCategoria}</CardTitle>
                  <CardDescription>{descripcion}</CardDescription>
                </CardHeader>
                <CardContent><span className="text-sm font-medium text-primary">Abrir categoría →</span></CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const esRegistro = categoria === "Registros DOPE" || categoria === "Registros Fibras"

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" onClick={() => { setCategoria(null); setError(""); setMensaje(""); setBusqueda(""); setMostrarFormulario(false) }} aria-label="Volver a categorías">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{categoria}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esRegistro ? "Consultá los eventos y adjuntá un PDF solamente cuando todavía no tengan uno." : "Consultá los documentos guardados o agregá uno nuevo."}
          </p>
        </div>
        {!esRegistro && <Button onClick={() => { setMostrarFormulario((v) => !v); setError(""); setMensaje("") }}><Plus className="mr-2 h-4 w-4" />Agregar documento</Button>}
      </div>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
      {mensaje && <div role="status" className="rounded-xl border border-emerald-300 p-3 text-sm">{mensaje}</div>}

      {mostrarFormulario && !esRegistro && (
        <Card>
          <CardHeader><CardTitle>Agregar documento</CardTitle><CardDescription>El PDF se guardará en el bucket privado de Supabase Storage.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="doc-nombre">Nombre del documento *</Label><Input id="doc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Protocolo de preparación..." /></div>
              <div className="space-y-2"><Label htmlFor="doc-pdf">Archivo PDF *</Label><Input id="doc-pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />{archivo && <p className="text-xs text-muted-foreground">{archivo.name}</p>}</div>
            </div>
            <p className="text-sm text-muted-foreground">Las relaciones son opcionales. Podés asociar el documento a un DOPE, una fibra y/o un equipo.</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>DOPE relacionado</Label><Select value={dopeId || "ninguno"} onValueChange={(v) => setDopeId(v == null || v === "ninguno" ? "" : v)}><SelectTrigger><SelectValue placeholder="Sin relación" /></SelectTrigger><SelectContent><SelectItem value="ninguno">Sin relación</SelectItem>{dopes.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Fibra relacionada</Label><Select value={fibraId || "ninguna"} onValueChange={(v) => setFibraId(v == null || v === "ninguno" ? "" : v)}><SelectTrigger><SelectValue placeholder="Sin relación" /></SelectTrigger><SelectContent><SelectItem value="ninguna">Sin relación</SelectItem>{fibras.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Equipo relacionado</Label><Select value={equipoId || "ninguno"} onValueChange={(v) => setEquipoId(v==null || v === "ninguno" ? "" : v)}><SelectTrigger><SelectValue placeholder="Sin relación" /></SelectTrigger><SelectContent><SelectItem value="ninguno">Sin relación</SelectItem>{equipos.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMostrarFormulario(false)} disabled={guardando}>Cancelar</Button><Button onClick={() => void guardarDocumento()} disabled={guardando || !nombre.trim() || !archivo}><Upload className="mr-2 h-4 w-4" />{guardando ? "Guardando..." : "Guardar documento"}</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o número..." />
      </div>

      {cargando ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Cargando documentación...</div>
      ) : esRegistro ? (
        eventosFiltrados.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No hay eventos para mostrar.</div> :
          <div className="grid gap-4 md:grid-cols-2">
            {eventosFiltrados.map((evento) => (
              <Card key={evento.id}>
                <CardHeader><CardTitle className="text-base">{evento.nombre}</CardTitle><CardDescription>{fechaLegible(evento.fecha)} · Registro #{evento.id}</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {evento.pdf ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-emerald-700">PDF adjunto</span>
                      <Button variant="outline" onClick={() => void abrirPdf(evento.pdf!)}><FileText className="mr-2 h-4 w-4" />Abrir PDF</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Este evento todavía no tiene PDF adjunto.</p>
                      <Input type="file" accept="application/pdf,.pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} disabled={eventoSubiendo !== null} />
                      <Button className="w-full" onClick={() => void adjuntarPdfEvento(evento)} disabled={!archivo || eventoSubiendo !== null}><Upload className="mr-2 h-4 w-4" />{eventoSubiendo === evento.id ? "Subiendo..." : "Adjuntar PDF a este evento"}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
      ) : documentosFiltrados.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Todavía no hay documentos en esta categoría.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documentosFiltrados.map((doc) => (
            <Card key={doc.id}>
              <CardHeader><CardTitle className="text-base">{doc.Nombre || `Documento #${doc.id}`}</CardTitle><CardDescription>{doc.Tipo} · Documento #{doc.id}</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {doc.DOPE != null && <span className="rounded-full bg-muted px-2 py-1">DOPE #{doc.DOPE}</span>}
                  {doc.Fibra != null && <span className="rounded-full bg-muted px-2 py-1">Fibra #{doc.Fibra}</span>}
                  {doc.Equipo != null && <span className="rounded-full bg-muted px-2 py-1">Equipo #{equipos.find((e) => e.id === doc.Equipo)?.nombre ?? doc.Equipo}</span>}
                  {doc.DOPE == null && doc.Fibra == null && doc.Equipo == null && <span>Sin relaciones asociadas</span>}
                </div>
                <Button variant="outline" className="w-full" onClick={() => void abrirPdf(doc.pdf)}><FileText className="mr-2 h-4 w-4" />Abrir PDF</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Documentacion
