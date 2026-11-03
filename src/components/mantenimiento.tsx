import { useEffect, useState } from "react"
import { ArrowLeft, CalendarDays, ClipboardList, FileText, Image as ImageIcon, Plus, Wrench , Pencil, Trash2} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { AccentLine } from "@/components/accent-line"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Equipo = {
  id: number
  nombre: string
  manual: string | null
  foto: string | null
  manualPath: string | null
  fotoPath: string | null
}

type MantenimientoRegistro = { id: number; fecha: string; descripcion: string; pdfUrl: string | null }

const BUCKET_PDF = "mantenimiento-pdf"
const BUCKET_EQUIPOS = "equipos-archivos"
type MantenimientoProps = {
  modoAdmin: boolean
}

export function Mantenimiento({ modoAdmin }: MantenimientoProps) {  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null)
  const [mantenimientos, setMantenimientos] = useState<MantenimientoRegistro[]>([])
  const [dialogEquipo, setDialogEquipo] = useState(false)
  const [dialogMantenimiento, setDialogMantenimiento] = useState(false)
  const [nombreEquipo, setNombreEquipo] = useState("")
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [manualArchivo, setManualArchivo] = useState<File | null>(null)
  const [fecha, setFecha] = useState(obtenerFechaActual())
  const [descripcion, setDescripcion] = useState("")
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null)
  const [cargandoEquipos, setCargandoEquipos] = useState(true)
  const [cargandoMantenimientos, setCargandoMantenimientos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
const [equipoEditando, setEquipoEditando] = useState<Equipo | null>(null)
const [mantenimientoEditando, setMantenimientoEditando] =
  useState<MantenimientoRegistro | null>(null)
const [fotoActual, setFotoActual] = useState<string | null>(null)
const [manualActual, setManualActual] = useState<string | null>(null)
const [quitarFoto, setQuitarFoto] = useState(false)
const [quitarManual, setQuitarManual] = useState(false)



  useEffect(() => { void cargarEquipos() }, [])

  async function cargarEquipos() {
    setCargandoEquipos(true)
    setError(null)
    const { data, error: err } = await supabase
      .from("Equipo")
      .select('id, "Nombre", "Manual", "Foto"')
      .order("Nombre", { ascending: true })
    if (err) {
      setError(`No se pudieron cargar los equipos: ${err.message}`)
      setCargandoEquipos(false)
      return
    }
   const equiposConArchivos = await Promise.all((data ?? []).map(async (r) => ({
  id: Number(r.id),
  nombre: r.Nombre,
  manualPath: r.Manual,
  fotoPath: r.Foto,
  manual: await obtenerUrlArchivoEquipo(r.Manual),
  foto: await obtenerUrlArchivoEquipo(r.Foto),
})))
    setEquipos(equiposConArchivos)
    setCargandoEquipos(false)
  }

  async function seleccionarEquipo(equipo: Equipo) {
    setEquipoSeleccionado(equipo)
    setMantenimientos([])
    setCargandoMantenimientos(true)
    setError(null)

    const { data, error: err } = await supabase
      .from("Mantenimiento_Maquina")
      .select('id, "Fecha", "Descripcion", "PDF"')
      .eq("Equipo", equipo.id)
      .order("Fecha", { ascending: false })
      .order("id", { ascending: false })

    if (err) {
      setError(`No se pudieron cargar los mantenimientos: ${err.message}`)
      setCargandoMantenimientos(false)
      return
    }

    const registros = await Promise.all((data ?? []).map(async (r) => {
      let pdfUrl: string | null = null
      if (r.PDF) {
        if (r.PDF.startsWith("https://") || r.PDF.startsWith("http://")) {
          pdfUrl = r.PDF
        } else {
          const { data: urlData } = await supabase.storage
            .from(BUCKET_PDF).createSignedUrl(r.PDF, 3600)
          pdfUrl = urlData?.signedUrl ?? null
        }
      }
      return {
        id: Number(r.id),
        fecha: r.Fecha,
        descripcion: r.Descripcion ?? "",
        pdfUrl,
      }
    }))
    setMantenimientos(registros)
    setCargandoMantenimientos(false)
  }


async function guardarEquipo() {
  if (!nombreEquipo.trim()) return

  setGuardando(true)
  setError(null)
  const archivosSubidos: string[] = []

  try {
    let rutaFoto: string | null = equipoEditando?.fotoPath ?? null
    let rutaManual: string | null = equipoEditando?.manualPath ?? null

    if (fotoArchivo) {
      validarArchivo(fotoArchivo, "imagen")
      rutaFoto = `equipos/${Date.now()}-${nombreSeguro(fotoArchivo.name)}`

      const { error: errorFoto } = await supabase.storage
        .from(BUCKET_EQUIPOS)
        .upload(rutaFoto, fotoArchivo, {
          contentType: fotoArchivo.type,
          upsert: false,
        })

      if (errorFoto) throw new Error(`No se pudo subir la foto: ${errorFoto.message}`)
      archivosSubidos.push(rutaFoto)
    }

    if (manualArchivo) {
      validarArchivo(manualArchivo, "pdf")
      rutaManual = `manuales/${Date.now()}-${nombreSeguro(manualArchivo.name)}`

      const { error: errorManual } = await supabase.storage
        .from(BUCKET_EQUIPOS)
        .upload(rutaManual, manualArchivo, {
          contentType: "application/pdf",
          upsert: false,
        })

      if (errorManual) throw new Error(`No se pudo subir el manual: ${errorManual.message}`)
      archivosSubidos.push(rutaManual)
    }

    if (quitarFoto) rutaFoto = null
    if (quitarManual) rutaManual = null

    if (equipoEditando) {
      const { data: archivosAnteriores, error: err } = await supabase.rpc(
        "editar_equipo_admin",
        {
          p_equipo_id: equipoEditando.id,
          p_nombre: nombreEquipo.trim(),
          p_manual: rutaManual,
          p_foto: rutaFoto,
        }
      )

      if (err) throw new Error(err.message)

      const equipoActualizado: Equipo = {
        ...equipoEditando,
        nombre: nombreEquipo.trim(),
        manualPath: rutaManual,
        fotoPath: rutaFoto,
        manual: await obtenerUrlArchivoEquipo(rutaManual),
        foto: await obtenerUrlArchivoEquipo(rutaFoto),
      }

      setEquipos((prev) =>
        prev.map((e) => e.id === equipoActualizado.id ? equipoActualizado : e)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      )

      setEquipoSeleccionado((prev) =>
        prev?.id === equipoActualizado.id ? equipoActualizado : prev
      )

      const rutasAnteriores = (archivosAnteriores ?? []).filter(
        (ruta: string | null) =>
          ruta && ruta !== rutaFoto && ruta !== rutaManual &&
          !ruta.startsWith("http://") && !ruta.startsWith("https://")
      )

      if (rutasAnteriores.length) {
        const { error: errorStorage } = await supabase.storage
          .from(BUCKET_EQUIPOS)
          .remove(rutasAnteriores)

        if (errorStorage) {
          console.error("No se pudieron eliminar los archivos anteriores:", errorStorage)
        }
      }
    } else {
      const { data, error: err } = await supabase
        .from("Equipo")
        .insert({
          Nombre: nombreEquipo.trim(),
          Foto: rutaFoto,
          Manual: rutaManual,
        })
        .select('id, "Nombre", "Manual", "Foto"')
        .single()

      if (err) throw new Error(`No se pudo guardar el equipo: ${err.message}`)

      const nuevoEquipo: Equipo = {
        id: Number(data.id),
        nombre: data.Nombre,
        manualPath: data.Manual,
        fotoPath: data.Foto,
        manual: await obtenerUrlArchivoEquipo(data.Manual),
        foto: await obtenerUrlArchivoEquipo(data.Foto),
      }

      setEquipos((prev) =>
        [...prev, nuevoEquipo].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      )
    }

    setDialogEquipo(false)
    setEquipoEditando(null)
    setNombreEquipo("")
    setFotoArchivo(null)
    setManualArchivo(null)
    setQuitarFoto(false)
    setQuitarManual(false)
  } catch (e) {
    if (archivosSubidos.length) {
      await supabase.storage.from(BUCKET_EQUIPOS).remove(archivosSubidos)
    }
    setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.")
  } finally {
    setGuardando(false)
  }
}



function abrirEdicionEquipo(equipo: Equipo) {
  setEquipoEditando(equipo)
  setNombreEquipo(equipo.nombre)
  setFotoArchivo(null)
  setManualArchivo(null)
  setQuitarFoto(false)
  setQuitarManual(false)
  setError(null)
  setDialogEquipo(true)
}

async function eliminarEquipo(equipo: Equipo) {
  if (guardando) return

  const confirmar = window.confirm(
    `¿Estás seguro de que querés eliminar el equipo "${equipo.nombre}"?\n\nEsta acción no se puede deshacer.`
  )

  if (!confirmar) return

  setGuardando(true)
  setError(null)

  try {
    const { data: archivosAnteriores, error: err } = await supabase.rpc(
      "eliminar_equipo_admin",
      { p_equipo_id: equipo.id }
    )

    if (err) throw err

    setEquipos((prev) => prev.filter((e) => e.id !== equipo.id))

    const rutas = (archivosAnteriores ?? []).filter(
      (ruta: string | null) =>
        ruta &&
        !ruta.startsWith("http://") &&
        !ruta.startsWith("https://")
    )

    if (rutas.length > 0) {
      const { error: errorStorage } = await supabase.storage
        .from(BUCKET_EQUIPOS)
        .remove(rutas)

      if (errorStorage) {
        console.error("No se pudieron eliminar los archivos:", errorStorage)
      }
    }
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "No se pudo eliminar el equipo."
    )
  } finally {
    setGuardando(false)
  }
}



  function abrirDialogoMantenimiento() {
    setFecha(obtenerFechaActual())
    setDescripcion("")
    setArchivoPDF(null)
    setError(null)
    setDialogMantenimiento(true)
  }

  async function guardarMantenimiento() {
    if (!equipoSeleccionado || !fecha || !descripcion.trim()) return
    setGuardando(true)
    setError(null)
    let rutaPDF: string | null = null
    try {
      if (archivoPDF) {
        const nombreSeguro = archivoPDF.name.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
        rutaPDF = `${Date.now()}-${nombreSeguro}`
        const { error: errSubida } = await supabase.storage.from(BUCKET_PDF).upload(rutaPDF, archivoPDF, {
          contentType: "application/pdf", upsert: false,
        })
        if (errSubida) throw new Error(`No se pudo subir el PDF: ${errSubida.message}`)
      }

      const { error: errInsert } = await supabase.from("Mantenimiento_Maquina").insert({
        Fecha: fecha,
        Descripcion: descripcion.trim(),
        PDF: rutaPDF,
        Equipo: equipoSeleccionado.id,
      })
      if (errInsert) {
        if (rutaPDF) await supabase.storage.from(BUCKET_PDF).remove([rutaPDF])
        throw new Error(`No se pudo guardar el mantenimiento: ${errInsert.message}`)
      }

      setDialogMantenimiento(false)
      setFecha(obtenerFechaActual())
      setDescripcion("")
      setArchivoPDF(null)
      await seleccionarEquipo(equipoSeleccionado)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      {equipoSeleccionado ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <Button variant="ghost" className="-ml-3" onClick={() => { setEquipoSeleccionado(null); setMantenimientos([]); setError(null) }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a equipos
            </Button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Wrench className="h-7 w-7 shrink-0" />
                  <h2 className="text-3xl font-semibold tracking-tight">{equipoSeleccionado.nombre}</h2>
                </div>
                <div className="ml-10"><AccentLine /></div>
                <p className="mt-2 text-muted-foreground">Ficha del equipo y registro de sus mantenimientos.</p>
              </div>
              <Button onClick={abrirDialogoMantenimiento} className="bg-[#fc008e] text-white hover:bg-[#d9007a]">
                <Plus className="mr-2 h-4 w-4" /> Registrar mantenimiento
              </Button>
            </div>
          </div>

          {error && <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</div>}

          {(equipoSeleccionado.foto || equipoSeleccionado.manual) && (
            <Card><CardContent className="flex flex-col gap-5 p-5 sm:flex-row">
              {equipoSeleccionado.foto && <img src={equipoSeleccionado.foto} alt={`Foto de ${equipoSeleccionado.nombre}`} className="max-h-56 w-full rounded-lg border object-contain sm:w-64" />}
              {equipoSeleccionado.manual && <a href={equipoSeleccionado.manual} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline underline-offset-4">Abrir manual del equipo</a>}
            </CardContent></Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardDescription>Mantenimientos registrados</CardDescription><CardTitle className="text-3xl">{mantenimientos.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Último mantenimiento</CardDescription><CardTitle className="text-xl">{mantenimientos.length ? formatearFecha(mantenimientos[0].fecha) : "Sin registros"}</CardTitle></CardHeader></Card>
          </div>

          <div className="space-y-4">
            <div><h3 className="text-xl font-semibold">Historial de mantenimiento</h3><p className="mt-1 text-sm text-muted-foreground">Solo se muestran los mantenimientos de este equipo.</p></div>
            {cargandoMantenimientos ? <p className="text-sm text-muted-foreground">Cargando mantenimientos...</p> :
              mantenimientos.length === 0 ? (
                <Card><CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
                  <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Todavía no hay mantenimientos registrados</p>
                  <p className="mt-1 text-sm text-muted-foreground">Registrá el primero usando el botón de arriba.</p>
                </CardContent></Card>
              ) : <div className="space-y-4">{mantenimientos.map((m) => <MantenimientoCard key={m.id} mantenimiento={m} />)}</div>}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3"><Wrench className="h-7 w-7 shrink-0" /><h2 className="text-3xl font-semibold tracking-tight">Mantenimiento</h2></div>
              <div className="ml-10"><AccentLine /></div>
              <p className="mt-2 text-muted-foreground">Seleccioná un equipo para consultar su historial o registrar un mantenimiento.</p>
            </div>
            <Button onClick={() => { setNombreEquipo(""); setFotoArchivo(null); setManualArchivo(null); setError(null); setDialogEquipo(true) }} className="bg-[#fc008e] text-white hover:bg-[#d9007a]">
              <Plus className="mr-2 h-4 w-4" /> Agregar equipo
            </Button>
          </div>
          {error && <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</div>}
          {cargandoEquipos ? <p className="text-sm text-muted-foreground">Cargando equipos...</p> :
            equipos.length === 0 ? (
              <Card><CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                <Wrench className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Todavía no hay equipos registrados</p>
                <p className="mt-1 text-sm text-muted-foreground">Agregá el primer equipo para empezar.</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
               
{equipos.map((equipo) => (
  <Card key={equipo.id} className="h-full">
    <button
      type="button"
      onClick={() => void seleccionarEquipo(equipo)}
      className="w-full rounded-t-xl text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {equipo.foto ? (
        <div className="flex h-44 items-center justify-center overflow-hidden rounded-t-xl border-b bg-muted/30 p-3">
          <img
            src={equipo.foto}
            alt={`Foto de ${equipo.nombre}`}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-t-xl border-b bg-muted/30">
          <ImageIcon className="h-12 w-12 text-muted-foreground/60" />
        </div>
      )}

      <CardHeader>
        <CardTitle>{equipo.nombre}</CardTitle>
        <CardDescription>
          {equipo.manual ? "Manual disponible" : "Sin manual adjunto"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <span className="text-sm font-medium text-primary">
          Ver equipo y mantenimientos →
        </span>
      </CardContent>
    </button>

    {modoAdmin && (
      <CardContent className="flex gap-2 pt-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => abrirEdicionEquipo(equipo)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={guardando}
          onClick={() => void eliminarEquipo(equipo)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </CardContent>
    )}
  </Card>
))}

              </div>
            )}
        </div>
      )}

      <Dialog open={dialogEquipo} onOpenChange={(open) => { if (!guardando) setDialogEquipo(open) }}>
        <DialogContent>
<DialogHeader>
  <DialogTitle>{equipoEditando ? "Editar equipo" : "Agregar equipo"}</DialogTitle>
  <DialogDescription>
    {equipoEditando
      ? "Modificá los datos y archivos del equipo."
      : "Ingresá el nombre y seleccioná los archivos que quieras adjuntar."}
  </DialogDescription>
</DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="nombre-equipo">Nombre del equipo</Label><Input id="nombre-equipo" placeholder="Ej. Extrusora" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} disabled={guardando} /></div>
<div className="space-y-2">
  <Label htmlFor="foto-equipo">Foto del equipo</Label>

  {equipoEditando?.foto && !quitarFoto && !fotoArchivo && (
    <div className="space-y-2">
      <img
        src={equipoEditando.foto}
        alt="Foto actual"
        className="h-32 rounded-lg border object-contain"
      />
      <Button type="button" variant="outline" size="sm"
        onClick={() => setQuitarFoto(true)}>
        Quitar foto actual
      </Button>
    </div>
  )}

  <Input id="foto-equipo" type="file" accept="image/*" disabled={guardando}
    onChange={(e) => {
      setFotoArchivo(e.target.files?.[0] ?? null)
      setQuitarFoto(false)
      setError(null)
    }} />
</div>

<div className="space-y-2">
  <Label htmlFor="manual-equipo">Manual del equipo en PDF</Label>

  {equipoEditando?.manual && !quitarManual && !manualArchivo && (
    <div className="space-y-2">
      <a href={equipoEditando.manual} target="_blank" rel="noopener noreferrer"
        className="text-sm text-primary underline">
        Abrir manual actual
      </a>
      <Button type="button" variant="outline" size="sm"
        onClick={() => setQuitarManual(true)}>
        Quitar manual actual
      </Button>
    </div>
  )}

  <Input id="manual-equipo" type="file" accept="application/pdf,.pdf"
    disabled={guardando}
    onChange={(e) => {
      setManualArchivo(e.target.files?.[0] ?? null)
      setQuitarManual(false)
      setError(null)
    }} />
</div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
<Button
  variant="outline"
  onClick={() => {
    setDialogEquipo(false)
    setEquipoEditando(null)
    setNombreEquipo("")
    setFotoArchivo(null)
    setManualArchivo(null)
    setQuitarFoto(false)
    setQuitarManual(false)
  }}
  disabled={guardando}
>
  Cancelar
</Button>
<Button
  onClick={() => void guardarEquipo()}
  disabled={!nombreEquipo.trim() || guardando}
  className="bg-[#fc008e] text-white hover:bg-[#d9007a]"
>
  {guardando
    ? "Guardando..."
    : equipoEditando
      ? "Guardar cambios"
      : "Guardar equipo"}
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMantenimiento} onOpenChange={(open) => { if (!open && !guardando) setDialogMantenimiento(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar mantenimiento</DialogTitle><DialogDescription>Equipo: <strong>{equipoSeleccionado?.nombre}</strong>. El registro quedará asociado a este equipo.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2"><Label htmlFor="fecha-mantenimiento">Fecha</Label><div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="fecha-mantenimiento" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="pl-9" disabled={guardando} /></div></div>
            <div className="space-y-2"><Label htmlFor="descripcion-mantenimiento">Descripción</Label><Textarea id="descripcion-mantenimiento" placeholder="Describí brevemente el mantenimiento realizado..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} disabled={guardando} /></div>
            <div className="space-y-2"><Label htmlFor="pdf-mantenimiento">PDF del mantenimiento (opcional)</Label><Input id="pdf-mantenimiento" type="file" accept="application/pdf,.pdf" disabled={guardando} onChange={(e) => {
              const archivo = e.target.files?.[0] ?? null
              if (archivo && archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
                setError("Seleccioná un archivo PDF."); setArchivoPDF(null); e.target.value = ""; return
              }
              setError(null); setArchivoPDF(archivo)
            }} />
              {archivoPDF && <p className="text-sm text-muted-foreground">Archivo seleccionado: {archivoPDF.name}</p>}
              <p className="text-xs text-muted-foreground">Podés adjuntar el PDF con los detalles del mantenimiento.</p>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (!guardando) setDialogMantenimiento(false) }} disabled={guardando}>Cancelar</Button>
            <Button onClick={() => void guardarMantenimiento()} disabled={!fecha || !descripcion.trim() || guardando} className="bg-[#fc008e] text-white hover:bg-[#d9007a]">{guardando ? "Guardando..." : "Guardar mantenimiento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MantenimientoCard({ mantenimiento }: { mantenimiento: MantenimientoRegistro }) {
  return (
    <Card>
      <CardHeader><div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><Wrench className="h-5 w-5" /></div>
        <div><CardTitle className="text-lg">Mantenimiento #{mantenimiento.id}</CardTitle><CardDescription className="mt-1">{formatearFecha(mantenimiento.fecha)}</CardDescription></div>
      </div></CardHeader>
      <CardContent className="space-y-4">
        <div><p className="text-sm font-medium">Descripción</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{mantenimiento.descripcion || "Sin descripción"}</p></div>
        {mantenimiento.pdfUrl && <a href={mantenimiento.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"><FileText className="h-4 w-4" />Ver PDF del mantenimiento</a>}
      </CardContent>
    </Card>
  )
}

async function obtenerUrlArchivoEquipo(ruta: string | null): Promise<string | null> {
  if (!ruta) return null
  // Compatibilidad con registros anteriores que guardaban una URL completa.
  if (ruta.startsWith("https://") || ruta.startsWith("http://")) return ruta
  const { data, error } = await supabase.storage.from(BUCKET_EQUIPOS).createSignedUrl(ruta, 3600)
  if (error) {
    console.error("No se pudo generar la URL del archivo del equipo:", error.message)
    return null
  }
  return data.signedUrl
}

function nombreSeguro(nombre: string) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_")
}

function validarArchivo(archivo: File, tipo: "imagen" | "pdf") {
  if (tipo === "imagen" && !archivo.type.startsWith("image/")) throw new Error("La foto debe ser un archivo de imagen.")
  if (tipo === "pdf" && archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("El manual debe ser un archivo PDF.")
  }
}

function obtenerFechaActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
}

function formatearFecha(fecha: string) {
  const [año, mes, dia] = fecha.split("-")
  return `${dia}/${mes}/${año}`
}
