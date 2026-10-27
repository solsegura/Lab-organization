import { useCallback, useEffect, useState } from "react"
import {
  Beaker,
  Plus,
  RefreshCw,
  Trash2,
  FlaskConical,
  ChevronLeft,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { AccentLine } from "@/components/accent-line"
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
import { Textarea } from "@/components/ui/textarea"

type Batch = {
  id: number
  Nombre: string
  Fecha: string
  Observaciones: string | null
}

type Extrusion = {
  id: number
  Fecha: string
  Fibras: number | null
  Geometria: string | null
  Peso: number | null
}

type Aporte = {
  Extrusion: string
  MasaAportada: string
}

type AporteGuardado = {
  id: number
  Extrusion: number
  MasaAportada: number
}

type Muestra = {
  id: number
  Batch: number
  Nombre: string
  Masa: number | null
  Fecha: string
  Observaciones: string | null
}

type TratamientoLaser = {
  id: number
  Muestra: number
  Fecha: string
  Autor: string
  TipoLaser: string | null
  LongitudOnda: number | null
  DuracionPulso: number | null
  Fluencia: number | null
  Periodicidad: number | null
  Angulo: number | null
  Tecnica: string | null
  Observaciones: string | null
  Archivos: ArchivoAdjunto[] | null
}

type DatoGuardado = {
  valor: string
  unidad: string
}

type Ensayo = {
  id: number
  Muestra: number
  Fecha: string
  Tipo: string
  Parametros: Record<string, DatoGuardado>
  Resultados: Record<string, DatoGuardado>
  Observaciones: string | null
    Archivos: ArchivoAdjunto[] | null
}

type DatoFlexible = {
  nombre: string
  valor: string
  unidad: string
}

type FormularioAbierto = "batch" | "muestra" | "laser" | "ensayo" | null

type ArchivoAdjunto = {
  nombre: string
  ruta: string
  tipo: string
}

function EditorDatos({
  titulo,
  datos,
  onChange,
}: {
  titulo: string
  datos: DatoFlexible[]
  onChange: (datos: DatoFlexible[]) => void
}) {
  function actualizar(index: number, campo: keyof DatoFlexible, valor: string) {
    onChange(
      datos.map((dato, i) => (i === index ? { ...dato, [campo]: valor } : dato)),
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">{titulo}</h4>
      {datos.map((dato, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Nombre"
            value={dato.nombre}
            onChange={(e) => actualizar(index, "nombre", e.target.value)}
          />
          <Input
            placeholder="Valor"
            value={dato.valor}
            onChange={(e) => actualizar(index, "valor", e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Unidad"
              value={dato.unidad}
              onChange={(e) => actualizar(index, "unidad", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={datos.length === 1}
              onClick={() => onChange(datos.filter((_, i) => i !== index))}
              title="Quitar dato"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...datos, { nombre: "", valor: "", unidad: "" }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar dato
      </Button>
    </div>
  )
}

const hoy = () => {
  const fecha = new Date()
  const ajustada = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return ajustada.toISOString().slice(0, 10)
}

const formatoMasa = (masa: number) =>
  masa.toLocaleString("es-AR", { maximumFractionDigits: 3 })

export function Caracterizacion() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [extrusiones, setExtrusiones] = useState<Extrusion[]>([])
  const [aportes, setAportes] = useState<AporteGuardado[]>([])
  const [muestras, setMuestras] = useState<Muestra[]>([])
  const [tratamientos, setTratamientos] = useState<TratamientoLaser[]>([])
  const [ensayos, setEnsayos] = useState<Ensayo[]>([])

  const [batchSeleccionado, setBatchSeleccionado] = useState<number | null>(null)
  const [muestraSeleccionada, setMuestraSeleccionada] = useState<number | null>(null)
  const [formularioAbierto, setFormularioAbierto] = useState<FormularioAbierto>(null)

  const [nombre, setNombre] = useState("")
const [fecha, setFecha] = useState(hoy())
const [observaciones, setObservaciones] = useState("")

const [origenBatch, setOrigenBatch] = useState<"extrusion" | "comercial">("extrusion")
const [masaInicial, setMasaInicial] = useState("")

const [nuevosAportes, setNuevosAportes] = useState<Aporte[]>([
    { Extrusion: "", MasaAportada: "" },
  ])

  const [nombreMuestra, setNombreMuestra] = useState("")
  const [masaMuestra, setMasaMuestra] = useState("")
  const [fechaMuestra, setFechaMuestra] = useState(hoy())
  const [observacionesMuestra, setObservacionesMuestra] = useState("")

  const [fechaLaser, setFechaLaser] = useState(hoy())
  const [autorLaser, setAutorLaser] = useState("")
  const [tipoLaser, setTipoLaser] = useState("")
  const [longitudOnda, setLongitudOnda] = useState("")
  const [unidadDuracionPulso, setUnidadDuracionPulso] = useState<"fs" | "ps" | "">("")
  const [duracionPulso, setDuracionPulso] = useState("")
  const [fluencia, setFluencia] = useState("")
  const [periodicidad, setPeriodicidad] = useState("")
  const [angulo, setAngulo] = useState("")
  const [tecnica, setTecnica] = useState("")
  const [observacionesLaser, setObservacionesLaser] = useState("")

  const [fechaEnsayo, setFechaEnsayo] = useState(hoy())
  const [tipoEnsayo, setTipoEnsayo] = useState("")
  const [parametrosEnsayo, setParametrosEnsayo] = useState<DatoFlexible[]>([
    { nombre: "", valor: "", unidad: "" },
  ])
  const [resultadosEnsayo, setResultadosEnsayo] = useState<DatoFlexible[]>([
    { nombre: "", valor: "", unidad: "" },
  ])
  const [observacionesEnsayo, setObservacionesEnsayo] = useState("")

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

const [archivosLaser, setArchivosLaser] = useState<File[]>([])
const [archivosEnsayo, setArchivosEnsayo] = useState<File[]>([])

async function subirArchivos(
  archivos: File[],
  carpeta: string,
): Promise<ArchivoAdjunto[]> {
  const subidos: ArchivoAdjunto[] = []

  for (const archivo of archivos) {
    const nombreSeguro = archivo.name.replace(/[^\w.-]+/g, "_")
    const ruta = `${carpeta}/${Date.now()}-${crypto.randomUUID()}-${nombreSeguro}`

    const { error } = await supabase.storage
      .from("caracterizacion-archivos")
      .upload(ruta, archivo, {
        contentType: archivo.type,
        upsert: false,
      })

    if (error) throw error

    subidos.push({
      nombre: archivo.name,
      ruta,
      tipo: archivo.type,
    })
  }

  return subidos
}

async function abrirArchivo(ruta: string) {
  const { data, error } = await supabase.storage
    .from("caracterizacion-archivos")
    .createSignedUrl(ruta, 60)

  if (error) {
    setError(`No se pudo abrir el archivo: ${error.message}`)
    return
  }

  const enlace = document.createElement("a")
  enlace.href = data.signedUrl
  enlace.target = "_blank"
  enlace.rel = "noopener noreferrer"
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
}


  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError("")
    try {
      const [
        { data: batchesData, error: batchesError },
        { data: extrusionesData, error: extrusionesError },
      ] = await Promise.all([
        supabase
          .from("BatchFibras")
          .select("id, Nombre, Fecha, Observaciones")
          .order("Fecha", { ascending: false }),
     supabase
  .from("ExtrusionFibras")
  .select("id, Fecha, Fibras, Geometria")
  .eq("FormacionFibras", true)
  .order("Fecha", { ascending: false }),
      ])
      if (batchesError) throw batchesError
      if (extrusionesError) throw extrusionesError
     const extrusionesBase = extrusionesData ?? []

const idsFibras = [
  ...new Set(
    extrusionesBase
      .map((extrusion) => extrusion.Fibras)
      .filter((id): id is number => id !== null),
  ),
]

let mapaPesos = new Map<number, number | null>()

if (idsFibras.length > 0) {
  const { data: fibrasData, error: fibrasError } = await supabase
    .from("Fibras")
    .select("id, Peso")
    .in("id", idsFibras)

  if (fibrasError) throw fibrasError

  mapaPesos = new Map(
    (fibrasData ?? []).map((fibra) => [fibra.id, fibra.Peso]),
  )
}

setBatches((batchesData ?? []) as Batch[])

setExtrusiones(
  extrusionesBase.map((extrusion) => ({
    ...extrusion,
    Peso:
      extrusion.Fibras !== null
        ? mapaPesos.get(extrusion.Fibras) ?? null
        : null,
  })) as Extrusion[],
)
 } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.")
    } finally {
      setCargando(false)
    }
  }, [])

  const cargarDetalleBatch = useCallback(async (batchId: number) => {
    setError("")
    const [
      { data: aportesData, error: aportesError },
      { data: muestrasData, error: muestrasError },
    ] = await Promise.all([
      supabase
        .from("BatchFibras_Extrusion")
        .select("id, Extrusion, MasaAportada")
        .eq("Batch", batchId)
        .order("id"),
      supabase
        .from("MuestraFibras")
        .select("id, Batch, Nombre, Masa, Fecha, Observaciones")
        .eq("Batch", batchId)
        .order("Fecha", { ascending: false })
        .order("id", { ascending: false }),
    ])
    if (aportesError) {
      setError(aportesError.message)
      return
    }
    if (muestrasError) {
      setError(muestrasError.message)
      return
    }
    setAportes((aportesData ?? []) as AporteGuardado[])
    setMuestras((muestrasData ?? []) as Muestra[])
  }, [])

  const cargarDetalleMuestra = useCallback(async (muestraId: number) => {
    setError("")
    const [
      { data: laserData, error: laserError },
      { data: ensayosData, error: ensayosError },
    ] = await Promise.all([
      supabase
        .from("TratamientoLaser")
        .select("*")
        .eq("Muestra", muestraId)
        .order("Fecha", { ascending: false }),
      supabase
        .from("EnsayoCaracterizacion")
        .select("*")
        .eq("Muestra", muestraId)
        .order("Fecha", { ascending: false }),
    ])
    if (laserError) {
      setError(laserError.message)
      return
    }
    if (ensayosError) {
      setError(ensayosError.message)
      return
    }
    setTratamientos((laserData ?? []) as TratamientoLaser[])
    setEnsayos((ensayosData ?? []) as Ensayo[])
  }, [])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    if (batchSeleccionado !== null) {
      void cargarDetalleBatch(batchSeleccionado)
    } else {
      setAportes([])
      setMuestras([])
      setMuestraSeleccionada(null)
      setTratamientos([])
      setEnsayos([])
    }
  }, [batchSeleccionado, cargarDetalleBatch])

  useEffect(() => {
    if (muestraSeleccionada !== null) {
      void cargarDetalleMuestra(muestraSeleccionada)
    } else {
      setTratamientos([])
      setEnsayos([])
    }
  }, [muestraSeleccionada, cargarDetalleMuestra])

  const masaTotal = aportes.reduce((total, aporte) => total + Number(aporte.MasaAportada), 0)
  const masaNueva = nuevosAportes.reduce(
    (total, aporte) => total + (Number(aporte.MasaAportada) || 0),
    0,
  )
  const batchActual = batches.find((batch) => batch.id === batchSeleccionado)
  const muestraActual = muestras.find((muestra) => muestra.id === muestraSeleccionada)

  function nombreExtrusion(id: number) {
  const extrusion = extrusiones.find((item) => item.id === id)

  if (!extrusion) return `Fibras de extrusión #${id}`

  const geometria = extrusion.Geometria ?? "Geometría no indicada"
  const peso =
    extrusion.Peso !== null
      ? `${formatoMasa(Number(extrusion.Peso))} g`
      : "Peso no disponible"

  return `Fibras #${extrusion.Fibras ?? id} · ${geometria} · ${peso}`
}

  function actualizarAporte(index: number, campo: keyof Aporte, valor: string) {
    setNuevosAportes((actuales) =>
      actuales.map((aporte, i) => (i === index ? { ...aporte, [campo]: valor } : aporte)),
    )
  }

  function cerrarFormulario() {
    setFormularioAbierto(null)
    setError("")
  }

  async function crearBatch() {
    setError("")
    setMensaje("")
    if (!nombre.trim()) {
      setError("Ingresá un nombre para el batch.")
      return
    }
    const aportesValidos = nuevosAportes.filter(
  (aporte) => aporte.Extrusion !== "" && Number(aporte.MasaAportada) > 0,
)

if (origenBatch === "comercial") {
  if (
    !masaInicial.trim() ||
    !Number.isFinite(Number(masaInicial)) ||
    Number(masaInicial) <= 0
  ) {
    setError("Ingresá una masa inicial mayor que cero para el lyocel comercial.")
    return
  }
} else {
  if (aportesValidos.length === 0) {
    setError("Agregá al menos una extrusión y su masa aportada.")
    return
  }

  const extrusionesElegidas = aportesValidos.map(
    (aporte) => aporte.Extrusion,
  )

  if (new Set(extrusionesElegidas).size !== extrusionesElegidas.length) {
    setError("No podés agregar dos veces la misma extrusión al batch.")
    return
  }
}

    setGuardando(true)
    try {
      const { data: batchCreado, error: batchError } = await supabase
        .from("BatchFibras")
        .insert({
  Nombre: nombre.trim(),
  Fecha: fecha,
  Observaciones: observaciones.trim() || null,
  MasaInicial:
    origenBatch === "comercial" ? Number(masaInicial) : null,
})
        .select("id")
        .single()
      if (batchError) throw batchError

      if (origenBatch === "extrusion") {
  const filasAportes = aportesValidos.map((aporte) => ({
    Batch: batchCreado.id,
    Extrusion: Number(aporte.Extrusion),
    MasaAportada: Number(aporte.MasaAportada),
  }))

  const { error: aportesError } = await supabase
    .from("BatchFibras_Extrusion")
    .insert(filasAportes)

  if (aportesError) {
    throw new Error(
      `Se creó el batch #${batchCreado.id}, pero no se pudieron guardar sus aportes: ${aportesError.message}`,
    )
  }
}

      setNombre("")
setFecha(hoy())
setObservaciones("")
setOrigenBatch("extrusion")
setMasaInicial("")
setNuevosAportes([{ Extrusion: "", MasaAportada: "" }])

      setFormularioAbierto(null)
      setBatchSeleccionado(batchCreado.id)
      setMuestraSeleccionada(null)
      setMensaje("Batch creado correctamente.")
      await cargarDatos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el batch.")
      await cargarDatos()
    } finally {
      setGuardando(false)
    }
  }

  async function crearMuestra() {
    if (batchSeleccionado === null) return
    setError("")
    setMensaje("")
    if (!nombreMuestra.trim()) {
      setError("Ingresá un nombre para la muestra.")
      return
    }
    if (masaMuestra.trim() && (!Number.isFinite(Number(masaMuestra)) || Number(masaMuestra) <= 0)) {
      setError("La masa debe ser un número mayor que cero, o quedar vacía.")
      return
    }

    setGuardando(true)
    try {
      const { data, error: insertError } = await supabase
        .from("MuestraFibras")
        .insert({
          Batch: batchSeleccionado,
          Nombre: nombreMuestra.trim(),
          Masa: masaMuestra.trim() ? Number(masaMuestra) : null,
          Fecha: fechaMuestra,
          Observaciones: observacionesMuestra.trim() || null,
        })
        .select("id")
        .single()
      if (insertError) throw insertError

      setNombreMuestra("")
      setMasaMuestra("")
      setFechaMuestra(hoy())
      setObservacionesMuestra("")
      setFormularioAbierto(null)
      setMuestraSeleccionada(data.id)
      setMensaje("Muestra creada correctamente.")
      await cargarDetalleBatch(batchSeleccionado)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la muestra.")
    } finally {
      setGuardando(false)
    }
  }

  async function guardarLaser() {
    if (muestraSeleccionada === null) return
    setError("")
    setMensaje("")
    if (!autorLaser.trim()) {
      setError("Ingresá quién realizó el tratamiento láser.")
      return
    }
    const numericos = [longitudOnda, duracionPulso, fluencia, periodicidad, angulo]
    if (numericos.some((valor) => !valor.trim() || !Number.isFinite(Number(valor)))) {
      setError("Completá longitud de onda, duración del pulso, fluencia, periodicidad y ángulo con valores numéricos.")
      return
    }
if (!duracionPulso.trim() || !unidadDuracionPulso) {
  setError("Ingresá la duración del pulso y seleccioná fs o ps.")
  return
}

if (!Number.isFinite(Number(duracionPulso)) || Number(duracionPulso) <= 0) {
  setError("La duración del pulso debe ser un número mayor que cero.")
  return
}
    setGuardando(true)
    try {
     const { data: nuevoLaser, error: insertError } = await supabase
  .from("TratamientoLaser")
  .insert({
    Batch: null,
    Muestra: muestraSeleccionada,
    Fecha: fechaLaser,
    Autor: autorLaser.trim(),
    TipoLaser: tipoLaser.trim() || null,
    LongitudOnda: Number(longitudOnda),
    DuracionPulso: `${duracionPulso.trim()} ${unidadDuracionPulso}`,
    Fluencia: Number(fluencia),
    Periodicidad: Number(periodicidad),
    Angulo: Number(angulo),
    Tecnica: tecnica.trim() || null,
    Observaciones: observacionesLaser.trim() || null,
  })
  .select("id")
  .single()

if (insertError) throw insertError

const archivosSubidos = await subirArchivos(
  archivosLaser,
  `laser/${nuevoLaser.id}`,
)

const { error: archivosError } = await supabase
  .from("TratamientoLaser")
  .update({ Archivos: archivosSubidos })
  .eq("id", nuevoLaser.id)

if (archivosError) throw archivosError

      setAutorLaser("")
      setTipoLaser("")
      setLongitudOnda("")
      setDuracionPulso("")
      setUnidadDuracionPulso("")
      setFluencia("")
      setPeriodicidad("")
      setAngulo("")
      setTecnica("")
      setObservacionesLaser("")
      setFechaLaser(hoy())
      setFormularioAbierto(null)
      setMensaje("Tratamiento láser registrado correctamente.")
setArchivosLaser([])
      await cargarDetalleMuestra(muestraSeleccionada)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el tratamiento.")
    } finally {
      setGuardando(false)
    }
  }

  function datosAObjeto(datos: DatoFlexible[]) {
    const objeto: Record<string, DatoGuardado> = {}
    for (const dato of datos) {
      const nombreDato = dato.nombre.trim()
      if (!nombreDato) continue
      if (Object.hasOwn(objeto, nombreDato)) {
        throw new Error(`El dato "${nombreDato}" está repetido.`)
      }
      objeto[nombreDato] = { valor: dato.valor.trim(), unidad: dato.unidad.trim() }
    }
    return objeto
  }

  async function guardarEnsayo() {
    if (muestraSeleccionada === null) return
    setError("")
    setMensaje("")
    if (!tipoEnsayo.trim()) {
      setError("Ingresá el tipo de ensayo.")
      return
    }

    setGuardando(true)
    try {
   const { data: nuevoEnsayo, error: insertError } = await supabase
  .from("EnsayoCaracterizacion")
  .insert({
    Batch: null,
    Muestra: muestraSeleccionada,
    Fecha: fechaEnsayo,
    Tipo: tipoEnsayo.trim(),
 Parametros: datosAObjeto(parametrosEnsayo),
Resultados: datosAObjeto(resultadosEnsayo),
    Observaciones: observacionesEnsayo.trim() || null,
  })
  .select("id")
  .single()

if (insertError) throw insertError

const archivosSubidos = await subirArchivos(
  archivosEnsayo,
  `ensayo/${nuevoEnsayo.id}`,
)

const { error: archivosError } = await supabase
  .from("EnsayoCaracterizacion")
  .update({ Archivos: archivosSubidos })
  .eq("id", nuevoEnsayo.id)

if (archivosError) throw archivosError

      setTipoEnsayo("")
      setFechaEnsayo(hoy())
      setParametrosEnsayo([{ nombre: "", valor: "", unidad: "" }])
      setResultadosEnsayo([{ nombre: "", valor: "", unidad: "" }])
      setObservacionesEnsayo("")
      setArchivosEnsayo([])
      setFormularioAbierto(null)
      setMensaje("Ensayo registrado correctamente.")
      await cargarDetalleMuestra(muestraSeleccionada)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el ensayo.")
    } finally {
      setGuardando(false)
    }
  }

  function abrirFormulario(tipo: FormularioAbierto) {
    setError("")
    setMensaje("")
    setFormularioAbierto(tipo)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Beaker className="h-7 w-7 shrink-0" />
            <h1 className="text-3xl font-semibold tracking-tight">Caracterización</h1>
          </div>
          <div className="ml-10">
            <AccentLine />
          </div>
          <p className="text-sm text-muted-foreground">
            Batches de fibras, muestras, tratamientos y ensayos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void cargarDatos()
              if (batchSeleccionado !== null) void cargarDetalleBatch(batchSeleccionado)
              if (muestraSeleccionada !== null) void cargarDetalleMuestra(muestraSeleccionada)
            }}
            title="Actualizar datos"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => abrirFormulario("batch")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo batch
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="rounded-xl border border-emerald-500/40 p-3 text-sm">
          {mensaje}
        </div>
      )}

      {formularioAbierto === "batch" && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo batch</CardTitle>
            <CardDescription>
              Un batch puede combinar fibras de varias extrusiones. Completá los datos y guardá para crearlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              
              <div className="space-y-2">
  <Label htmlFor="batch-origen">Origen de las fibras</Label>
  <select
    id="batch-origen"
    value={origenBatch}
    onChange={(e) =>
      setOrigenBatch(e.target.value as "extrusion" | "comercial")
    }
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    <option value="extrusion">Fibras de extrusión</option>
    <option value="comercial">Lyocel comercial</option>
  </select>
</div>

              <div className="space-y-2">
                <Label htmlFor="batch-nombre">Nombre del batch</Label>
                <Input id="batch-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Batch fibras 01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-fecha">Fecha</Label>
                <Input id="batch-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-observaciones">Observaciones</Label>
              <Textarea id="batch-observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas sobre la preparación del batch..." />
            </div>


{origenBatch === "extrusion" ? (
  <>
    {
              <div className="space-y-3">
              <div>
                <h3 className="font-medium">Composición del batch</h3>
                <p className="text-sm text-muted-foreground">Indicá cuántos gramos de cada fibra se usaron.</p>
              </div>
              {nuevosAportes.map((aporte, index) => (
                <div key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_130px_auto]">
                  <div className="space-y-1">
                    <Label>Fibra</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={aporte.Extrusion}
                      onChange={(e) => actualizarAporte(index, "Extrusion", e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {extrusiones.map((extrusion) => (
                        <option key={extrusion.id} value={extrusion.id}>{nombreExtrusion(extrusion.id)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Masa (g)</Label>
                    <Input type="number" min="0.001" step="0.001" value={aporte.MasaAportada} onChange={(e) => actualizarAporte(index, "MasaAportada", e.target.value)} placeholder="0" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon" disabled={nuevosAportes.length === 1} onClick={() => setNuevosAportes((actuales) => actuales.filter((_, i) => i !== index))} title="Quitar aporte">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={() => setNuevosAportes((actuales) => [...actuales, { Extrusion: "", MasaAportada: "" }])}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar otra fibra
              </Button>
              <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                <span className="text-sm font-medium">Masa total del batch</span>
                <span className="text-lg font-semibold tabular-nums">{formatoMasa(masaNueva)} g</span>
              </div>
            </div>

    /* Acá queda todo tu bloque actual de aportes de extrusiones */}
  </>
) : (
  <div className="space-y-2">
    <Label htmlFor="batch-masa-inicial">Masa inicial (g)</Label>
    <Input
      id="batch-masa-inicial"
      type="number"
      min="0.001"
      step="0.001"
      value={masaInicial}
      onChange={(e) => setMasaInicial(e.target.value)}
      placeholder="Ej. 500"
    />
    <p className="text-sm text-muted-foreground">
      Ingresá la masa inicial del lyocel comercial en gramos.
    </p>
  </div>
)}

  


            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={cerrarFormulario} disabled={guardando}>Cancelar</Button>
              <Button onClick={() => void crearBatch()} disabled={guardando || cargando}>
                {guardando ? "Guardando..." : "Crear batch"}
              </Button>
            </div>



          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Batches registrados</h2>
            <p className="text-sm text-muted-foreground">Seleccioná un batch para ver sus muestras y composición.</p>
          </div>
          {cargando ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Cargando batches...</div>
          ) : batches.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Todavía no hay batches registrados. Usá “Nuevo batch” para crear el primero.</div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => {
                    setBatchSeleccionado(batch.id)
                    setMuestraSeleccionada(null)
                    setFormularioAbierto(null)
                    setError("")
                    setMensaje("")
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition hover:bg-muted/50 ${batchSeleccionado === batch.id ? "border-[#fc008e] bg-muted/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{batch.Nombre}</p>
                      <p className="text-sm text-muted-foreground">{batch.Fecha} · Batch #{batch.id}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Ver detalle →</span>
                  </div>
                  {batch.Observaciones && <p className="mt-2 text-sm text-muted-foreground">{batch.Observaciones}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {batchActual ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{batchActual.Nombre}</CardTitle>
                  <CardDescription>Batch #{batchActual.id} · {batchActual.Fecha}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="font-medium">Composición del batch</h3>
                  {aportes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Este batch todavía no tiene aportes registrados.</p>
                  ) : (
                    aportes.map((aporte) => (
                      <div key={aporte.id} className="flex items-center justify-between gap-3 border-b pb-2 text-sm">
                        <span>{nombreExtrusion(aporte.Extrusion)}</span>
                        <span className="font-medium tabular-nums">{formatoMasa(Number(aporte.MasaAportada))} g</span>
                      </div>
                    ))
                  )}
                  <div className="flex items-center justify-between pt-2 font-semibold">
                    <span>Masa total aportada</span>
                    <span className="tabular-nums">{formatoMasa(masaTotal)} g</span>
                  </div>
                  {batchActual.Observaciones && <p className="pt-2 text-sm text-muted-foreground">{batchActual.Observaciones}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle>Muestras</CardTitle>
                    <CardDescription>Separá una porción del batch para registrar sus tratamientos y ensayos.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => abrirFormulario("muestra")}>
                    <Plus className="mr-1 h-4 w-4" /> Agregar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {muestras.length === 0 ? (
                    <p className="rounded-lg border p-4 text-sm text-muted-foreground">Todavía no hay muestras en este batch. Presioná “Agregar” para crear una.</p>
                  ) : (
                    muestras.map((muestra) => (
                      <button
                        type="button"
                        key={muestra.id}
                        onClick={() => {
                          setMuestraSeleccionada(muestra.id)
                          setFormularioAbierto(null)
                          setError("")
                          setMensaje("")
                        }}
                        className={`w-full rounded-xl border p-3 text-left transition hover:bg-muted/50 ${muestraSeleccionada === muestra.id ? "border-[#fc008e] bg-muted/40" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{muestra.Nombre}</p>
                            <p className="text-sm text-muted-foreground">{muestra.Fecha} · Muestra #{muestra.id}</p>
                          </div>
                          <span className="text-sm font-medium">{muestra.Masa == null ? "Masa no indicada" : `${formatoMasa(Number(muestra.Masa))} g`}</span>
                        </div>
                        {muestra.Observaciones && <p className="mt-2 text-sm text-muted-foreground">{muestra.Observaciones}</p>}
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              {formularioAbierto === "muestra" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Nueva muestra</CardTitle>
                    <CardDescription>Esta muestra pertenecerá al batch “{batchActual.Nombre}”.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="muestra-nombre">Nombre de la muestra</Label>
                        <Input id="muestra-nombre" value={nombreMuestra} onChange={(e) => setNombreMuestra(e.target.value)} placeholder="Ej. DLIP, control sin tratar" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="muestra-masa">Masa (g, opcional)</Label>
                        <Input id="muestra-masa" type="number" min="0.001" step="0.001" value={masaMuestra} onChange={(e) => setMasaMuestra(e.target.value)} placeholder="Ej. 30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="muestra-fecha">Fecha</Label>
                        <Input id="muestra-fecha" type="date" value={fechaMuestra} onChange={(e) => setFechaMuestra(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="muestra-observaciones">Observaciones</Label>
                      <Textarea id="muestra-observaciones" value={observacionesMuestra} onChange={(e) => setObservacionesMuestra(e.target.value)} placeholder="Ej. Porción destinada a tratamiento DLIP..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={cerrarFormulario} disabled={guardando}>Cancelar</Button>
                      <Button onClick={() => void crearMuestra()} disabled={guardando}>{guardando ? "Guardando..." : "Guardar muestra"}</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
              <FlaskConical className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Seleccioná un batch</p>
              <p className="mt-1 text-sm text-muted-foreground">Su composición, muestras, tratamientos y ensayos aparecerán acá.</p>
            </div>
          )}
        </div>
      </div>

      {muestraActual && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <Button type="button" variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setMuestraSeleccionada(null)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Volver al batch
              </Button>
              <h2 className="text-2xl font-semibold">{muestraActual.Nombre}</h2>
              <p className="text-sm text-muted-foreground">
                Muestra #{muestraActual.id} · {muestraActual.Masa == null ? "Masa no indicada" : `${formatoMasa(Number(muestraActual.Masa))} g`} · Batch: {batchActual?.Nombre}
              </p>
              {muestraActual.Observaciones && <p className="mt-1 text-sm text-muted-foreground">{muestraActual.Observaciones}</p>}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Tratamientos láser</CardTitle>
                  <CardDescription>Tratamientos aplicados específicamente a esta muestra.</CardDescription>
                </div>
                <Button size="sm" onClick={() => abrirFormulario("laser")}>
                  <Plus className="mr-1 h-4 w-4" /> Agregar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formularioAbierto === "laser" && (
                  <div className="space-y-4 rounded-xl border p-4">
                    <h3 className="font-medium">Nuevo tratamiento láser</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Fecha</Label>
                        <Input type="date" value={fechaLaser} onChange={(e) => setFechaLaser(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Autor</Label>
                        <Input value={autorLaser} onChange={(e) => setAutorLaser(e.target.value)} placeholder="Quién realizó el tratamiento" />
                      </div>
                      <div className="space-y-1">
                        <Label>Tipo de láser (opcional)</Label>
                        <Input value={tipoLaser} onChange={(e) => setTipoLaser(e.target.value)} placeholder="Ej. femtosegundo" />
                      </div>
                      <div className="space-y-1">
                        <Label>Longitud de onda (nm)</Label>
                        <Input type="number" value={longitudOnda} onChange={(e) => setLongitudOnda(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Duración del pulso (ps o ns)</Label>
                        <Input type="number" value={duracionPulso} onChange={(e) => setDuracionPulso(e.target.value)} />
                      </div>
                      <div className="space-y-2">
  <Label>Unidad de duración *</Label>

  <div className="flex gap-6">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="unidadDuracionPulso"
        value="fs"
        checked={unidadDuracionPulso === "fs"}
        onChange={() => setUnidadDuracionPulso("fs")}
        required
      />
      <span>fs (femtosegundos)</span>
    </label>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="unidadDuracionPulso"
        value="ps"
        checked={unidadDuracionPulso === "ps"}
        onChange={() => setUnidadDuracionPulso("ps")}
        required
      />
      <span>ps (picosegundos)</span>
    </label>
  </div>
</div>
                      <div className="space-y-1">
                        <Label>Fluencia (J/cm²)</Label>
                        <Input type="number" value={fluencia} onChange={(e) => setFluencia(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Periodicidad (µm)</Label>
                        <Input type="number" value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Ángulo (°)</Label>
                        <Input type="number" value={angulo} onChange={(e) => setAngulo(e.target.value)} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Técnica</Label>
                        <Input value={tecnica} onChange={(e) => setTecnica(e.target.value)} placeholder="Ej. DLIP" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Observaciones</Label>
                        <Textarea value={observacionesLaser} onChange={(e) => setObservacionesLaser(e.target.value)} />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
  <Label>PDF o imágenes adjuntas</Label>
  <Input
    type="file"
    accept="application/pdf,image/*"
    multiple
    onChange={(e) =>
      setArchivosLaser(Array.from(e.target.files ?? []))
    }
  />
  <p className="text-xs text-muted-foreground">
    Podés seleccionar varios archivos.
  </p>
</div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={cerrarFormulario} disabled={guardando}>Cancelar</Button>
                      <Button onClick={() => void guardarLaser()} disabled={guardando}>{guardando ? "Guardando..." : "Guardar tratamiento"}</Button>
                    </div>
                  </div>
                )}

                {tratamientos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Esta muestra todavía no tiene tratamientos láser registrados.</p>
                ) : (
                  tratamientos.map((t) => (
                    <div key={t.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{t.TipoLaser || "Tratamiento láser"} · {t.Fecha}</p>
                      <p className="text-muted-foreground">Autor: {t.Autor}</p>
                      <p>Longitud de onda: {t.LongitudOnda ?? "—"} nm · Pulso: {t.DuracionPulso ?? "—"}</p>
                      <p>Fluencia: {t.Fluencia ?? "—"} J/cm² · Periodicidad: {t.Periodicidad ?? "—"} µm · Ángulo: {t.Angulo ?? "—"}°</p>
                      {t.Tecnica && <p>Técnica: {t.Tecnica}</p>}
                      {t.Observaciones && <p className="mt-1 text-muted-foreground">{t.Observaciones}</p>}
                    {(t.Archivos ?? []).length > 0 && (
  <div className="mt-2 space-y-1">
    <p className="font-medium">Archivos adjuntos</p>
    {(t.Archivos ?? []).map((archivo) => (
      <button
        key={archivo.ruta}
        type="button"
        className="block text-left text-primary underline"
        onClick={() => void abrirArchivo(archivo.ruta)}
      >
        {archivo.nombre}
      </button>
    ))}
  </div>
)}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Ensayos de caracterización</CardTitle>
                  <CardDescription>Varios ensayos pueden corresponder a la misma muestra.</CardDescription>
                </div>
                <Button size="sm" onClick={() => abrirFormulario("ensayo")}>
                  <Plus className="mr-1 h-4 w-4" /> Agregar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formularioAbierto === "ensayo" && (
                  <div className="space-y-4 rounded-xl border p-4">
                    <h3 className="font-medium">Nuevo ensayo</h3>
                    <div className="space-y-2">
                      <Label>Tipo de ensayo</Label>
                      <Input value={tipoEnsayo} onChange={(e) => setTipoEnsayo(e.target.value)} placeholder="Ej. Microscopía, tracción, diámetro..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha del ensayo</Label>
                      <Input type="date" value={fechaEnsayo} onChange={(e) => setFechaEnsayo(e.target.value)} />
                    </div>
                    <EditorDatos titulo="Parámetros del ensayo" datos={parametrosEnsayo} onChange={setParametrosEnsayo} />
                    <EditorDatos titulo="Resultados" datos={resultadosEnsayo} onChange={setResultadosEnsayo} />
                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea value={observacionesEnsayo} onChange={(e) => setObservacionesEnsayo(e.target.value)} />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
  <Label>PDF o imágenes adjuntas</Label>
  <Input
    type="file"
    accept="application/pdf,image/*"
    multiple
    onChange={(e) =>
      setArchivosEnsayo(Array.from(e.target.files ?? []))
    }
  />
  <p className="text-xs text-muted-foreground">
    Podés seleccionar varios archivos.
  </p>
</div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={cerrarFormulario} disabled={guardando}>Cancelar</Button>
                      <Button onClick={() => void guardarEnsayo()} disabled={guardando}>{guardando ? "Guardando..." : "Guardar ensayo"}</Button>
                    </div>
                  </div>
                )}

                {ensayos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Esta muestra todavía no tiene ensayos registrados.</p>
                ) : (
                  ensayos.map((ensayo) => (
                    <div key={ensayo.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{ensayo.Tipo}</p>
                      <p className="text-muted-foreground">{ensayo.Fecha} · Ensayo #{ensayo.id}</p>
                      {Object.keys(ensayo.Parametros ?? {}).length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Parámetros</p>
                          {Object.entries(ensayo.Parametros).map(([nombreDato, dato]) => (
                            <p key={nombreDato}>{nombreDato}: {dato.valor} {dato.unidad}</p>
                          ))}
                        </div>
                      )}
                      {Object.keys(ensayo.Resultados ?? {}).length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Resultados</p>
                          {Object.entries(ensayo.Resultados).map(([nombreDato, dato]) => (
                            <p key={nombreDato}>{nombreDato}: {dato.valor} {dato.unidad}</p>
                          ))}
                        </div>
                      )}
                      {ensayo.Observaciones && <p className="mt-2 text-muted-foreground">{ensayo.Observaciones}</p>}
                    {((ensayo.Archivos ?? []).length > 0) && (
  <div className="mt-2 space-y-1">
    <p className="font-medium">Archivos adjuntos</p>
    {(ensayo.Archivos ?? []).map((archivo) => (
      <button
        key={archivo.ruta}
        type="button"
        className="block text-left text-primary underline"
        onClick={() => void abrirArchivo(archivo.ruta)}
      >
        {archivo.nombre}
      </button>
    ))}
  </div>
)}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  )
}

export default Caracterizacion
