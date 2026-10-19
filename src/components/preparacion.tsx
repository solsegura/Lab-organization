
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Beaker,
  ChevronRight,
  ClipboardList,
  Plus,
  FileText,
  Upload,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type EstadoDope = "Molido" | "Sin moler" | "Extruido"

type Dope = {
  id: number
  fecha: string | null
  peso: number | null
  estado: EstadoDope
  ubicacion: string
  recuperado: boolean
  recuperadoDe: number | null
  extrusionOrigen: {
    fecha: string | null
    geometria: string | null
  } | null

  pdf: string | null
}

type PreparacionProps = {
  onNewDope: () => void
}

export function Preparacion({
  onNewDope,
}: PreparacionProps) {
  const [dopes, setDopes] = useState<Dope[]>([])
  const [dopeSeleccionado, setDopeSeleccionado] =
    useState<Dope | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)

  useEffect(() => {
    async function cargarDopes() {
      setCargando(true)
      setErrorCarga(null)

      const [
  { data: datosDopes, error: errorDopes },
  { data: datosHeladera, error: errorHeladera },
  { data: datosExtrusiones, error: errorExtrusiones },
  { data: datosPreparaciones, error: errorPreparaciones },
] = await Promise.all([
  supabase
    .from("DOPE")
    .select(
      'id, "FechaPreparacion", "Peso", "Estado", "Recuperado", "RecuperadoDe"'
    )
    .order("id", { ascending: false }),

  supabase
    .from("DOPE_Heladera")
    .select('"DOPE"'),

  supabase
    .from("ExtrusionFibras")
    .select('id, "Fecha", "Geometria"'),

    supabase
  .from("PreparacionDOPE")
  .select('"DOPE", "PDF"'),
])

if (errorDopes || errorHeladera || errorExtrusiones||errorPreparaciones) {
  console.error("Error al cargar los detalles de los DOPE:", {
    errorDopes,
    errorHeladera,
    errorExtrusiones,
  })

  setErrorCarga(
    "No se pudieron cargar los DOPE, sus ubicaciones o sus extrusiones."
  )
  setCargando(false)
  return
}

const idsEnHeladera = new Set(
  (datosHeladera ?? []).map((registro) => Number(registro.DOPE))
)

const extrusionesPorId = new Map(
  (datosExtrusiones ?? []).map((extrusion) => [
    Number(extrusion.id),
    {
      fecha: extrusion.Fecha,
      geometria: extrusion.Geometria,
    },
  ])
)
const pdfPorDopeId = new Map<number, string | null>()

for (const preparacion of datosPreparaciones ?? []) {
  if (preparacion.DOPE != null) {
    pdfPorDopeId.set(
      Number(preparacion.DOPE),
      preparacion.PDF
    )
  }
}
const registros: Dope[] = (datosDopes ?? []).map((registro) => {
  const estadoNormalizado = String(registro.Estado ?? "")
    .trim()
    .toLowerCase()

  const estado: EstadoDope =
    estadoNormalizado === "extruido"
      ? "Extruido"
      : estadoNormalizado === "molido"
        ? "Molido"
        : "Sin moler"

  const recuperadoDe =
    registro.RecuperadoDe == null
      ? null
      : Number(registro.RecuperadoDe)

  return {
    id: Number(registro.id),
    fecha: registro.FechaPreparacion,
    peso: registro.Peso == null ? null : Number(registro.Peso),
    estado,
    ubicacion:
      estado === "Extruido"
        ? "-"
        : idsEnHeladera.has(Number(registro.id))
          ? "Dentro de heladera"
          : "Fuera de heladera",
    recuperado: registro.Recuperado === true || recuperadoDe !== null,
    recuperadoDe,
    extrusionOrigen:
      recuperadoDe === null
        ? null
        : extrusionesPorId.get(recuperadoDe) ?? null,
  pdf: pdfPorDopeId.get(Number(registro.id)) ?? null,
      }
})

setDopes(registros)
setCargando(false)
    }

    void cargarDopes()
  }, [])

  async function cambiarEstado(
    dopeId: number,
    nuevoEstado: EstadoDope
  ) {
    const estadoAnterior = dopes.find((dope) => dope.id === dopeId)?.estado
    if (!estadoAnterior || actualizandoId !== null) return

    setActualizandoId(dopeId)
    setErrorCarga(null)

    const { error } = await supabase
      .from("DOPE")
      .update({ Estado: nuevoEstado.toLowerCase() })
      .eq("id", dopeId)

    if (error) {
      console.error("Error al actualizar el estado del DOPE:", error)
      setErrorCarga(
        "No se pudo guardar el cambio de estado. El valor anterior se mantiene."
      )
      setActualizandoId(null)
      return
    }

    setDopes((actuales) =>
      actuales.map((dope) =>
        dope.id === dopeId ? { ...dope, estado: nuevoEstado } : dope
      )
    )

    setDopeSeleccionado((actual) =>
      actual?.id === dopeId ? { ...actual, estado: nuevoEstado } : actual
    )

    setActualizandoId(null)
  }

  function abrirDetalles(dope: Dope) {
    setDopeSeleccionado(dope)
  }
const [subiendoPdf, setSubiendoPdf] = useState(false)
  
async function abrirPdf(dope: Dope) {
  if (!dope.pdf) return

  const { data, error } = await supabase.storage
    .from("preparacion-pdf")
    .createSignedUrl(dope.pdf, 60)

  if (error || !data?.signedUrl) {
    alert(`No se pudo abrir el PDF: ${error?.message ?? "Error desconocido"}`)
    return
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer")
}

async function guardarPdf(dope: Dope, archivo: File) {
  if (archivo.type !== "application/pdf" &&
      !archivo.name.toLowerCase().endsWith(".pdf")) {
    alert("Seleccioná un archivo PDF.")
    return
  }

  setSubiendoPdf(true)

  let rutaPdf: string | null = null

  try {
    const nombreSeguro = archivo.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")

    rutaPdf = `dope-${dope.id}/${Date.now()}-${nombreSeguro}`

    const { error: errorSubida } = await supabase.storage
      .from("preparacion-pdf")
      .upload(rutaPdf, archivo, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (errorSubida) throw errorSubida

    const { error: errorActualizacion } = await supabase
      .from("PreparacionDOPE")
      .update({ PDF: rutaPdf })
      .eq("DOPE", dope.id)

    if (errorActualizacion) throw errorActualizacion

    // Actualizar la pantalla sin tener que recargarla
    setDopes((actuales) =>
      actuales.map((item) =>
        item.id === dope.id ? { ...item, pdf: rutaPdf } : item
      )
    )

    setDopeSeleccionado((actual) =>
      actual?.id === dope.id
        ? { ...actual, pdf: rutaPdf }
        : actual
    )

    // Eliminar la versión anterior solo después de guardar la nueva
    if (dope.pdf && dope.pdf !== rutaPdf) {
      const { error: errorEliminar } = await supabase.storage
        .from("preparacion-pdf")
        .remove([dope.pdf])

      if (errorEliminar) {
        console.error("No se pudo eliminar el PDF anterior:", errorEliminar)
      }
    }

    alert("PDF guardado correctamente.")
  } catch (error) {
    console.error("Error al guardar el PDF:", error)

    if (rutaPdf) {
      await supabase.storage
        .from("preparacion-pdf")
        .remove([rutaPdf])
    }

    alert(
      `No se pudo guardar el PDF: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`
    )
  } finally {
    setSubiendoPdf(false)
  }
}
return (
    <>
      <div className="space-y-8">
        {/* =====================================================
            ENCABEZADO
            ===================================================== */}

        <div>
          <div className="flex items-center gap-3">
            <Beaker className="h-7 w-7" />

            <h2 className="text-3xl font-semibold tracking-tight">
              Preparación
            </h2>
          </div>

          <p className="mt-2 text-muted-foreground">
            Gestión y registro de los DOPE preparados en el
            laboratorio.
          </p>
        </div>

        {/* =====================================================
            ACCIONES
            ===================================================== */}

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/40"
            onClick={onNewDope}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Plus className="h-5 w-5" />
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <CardTitle className="mt-4">
                Nuevo DOPE
              </CardTitle>

              <CardDescription>
                Registrar un nuevo DOPE y comenzar el proceso
                de preparación.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <ClipboardList className="h-5 w-5" />
              </div>

              <CardTitle className="mt-4">
                DOPE registrados
              </CardTitle>

              <CardDescription>
                Actualmente hay{" "}
                <span className="font-medium text-foreground">
                  {dopes.length}
                </span>{" "}
                DOPE registrados.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* =====================================================
            DOPE ANTERIORES
            ===================================================== */}

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">
              DOPE anteriores
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Historial de los DOPE preparados anteriormente.
            </p>
          </div>

          {errorCarga && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {errorCarga}
            </div>
          )}

          {cargando ? (
            <Card>
              <CardContent className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                Cargando DOPE...
              </CardContent>
            </Card>
          ) : dopes.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
                <Beaker className="mb-4 h-10 w-10 text-muted-foreground" />

                <p className="font-medium">
                  Todavía no hay DOPE registrados
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Creá un nuevo DOPE para comenzar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dopes.map((dope) => (
                <DopeCard
                  key={dope.id}
                  dope={dope}
                  onEstadoChange={cambiarEstado}
                  estadoDeshabilitado={
                    actualizandoId === dope.id || actualizandoId !== null
                  }
                  onViewDetails={() =>
                    abrirDetalles(dope)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          DIÁLOGO DE DETALLES DEL DOPE
          ===================================================== */}

      <Dialog
        open={dopeSeleccionado !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDopeSeleccionado(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {dopeSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle>
                  DOPE #{dopeSeleccionado.id}
                </DialogTitle>

                <DialogDescription>
                  Información del DOPE preparado el{" "}
                  {formatearFecha(
                    dopeSeleccionado.fecha
                  )}
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Datos generales */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Datos del DOPE
                  </h3>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Detalle
                      label="Fecha de preparación"
                      value={formatearFecha(
                        dopeSeleccionado.fecha
                      )}
                    />

                    <Detalle
                      label="Peso"
                      value={formatPeso(
                        dopeSeleccionado.peso
                      )}
                    />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Estado
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {dopeSeleccionado.estado}
                      </p>
                    </div>

                    {/* PDF de preparación */}
<div className="space-y-3 border-t pt-4">
  <h3 className="text-sm font-semibold">
    PDF de preparación
  </h3>

  {dopeSeleccionado.pdf ? (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      onClick={() => void abrirPdf(dopeSeleccionado)}
    >
      <FileText className="mr-2 h-4 w-4" />
      Ver PDF adjunto
    </Button>
  ) : (
    <p className="text-sm text-muted-foreground">
      Todavía no hay un PDF adjunto.
    </p>
  )}

  <div className="space-y-2">
    <Label htmlFor="pdf-detalles">
      {dopeSeleccionado.pdf ? "Reemplazar PDF" : "Adjuntar PDF"}
    </Label>

    <Input
      id="pdf-detalles"
      type="file"
      accept="application/pdf,.pdf"
      disabled={subiendoPdf}
      onChange={(event) => {
        const archivo = event.target.files?.[0]

        if (archivo && dopeSeleccionado) {
          void guardarPdf(dopeSeleccionado, archivo)
        }

        event.target.value = ""
      }}
    />

    {subiendoPdf && (
      <p className="text-sm text-muted-foreground">
        Subiendo PDF...
      </p>
    )}
  </div>
</div>
                    <Detalle

                    
  label="Ubicación"
  value={dopeSeleccionado.ubicacion}
/>

{dopeSeleccionado.recuperado && (
  <>
    <Detalle
      label="DOPE recuperado"
      value="Sí"
    />

    <div className="col-span-2">
      <Detalle
        label="Extrusión de origen"
        value={
          dopeSeleccionado.recuperadoDe === null
            ? "Sin registrar"
            : `Extrusión #${dopeSeleccionado.recuperadoDe}`
        }
      />

      {dopeSeleccionado.extrusionOrigen && (
        <p className="mt-1 text-sm text-muted-foreground">
          {dopeSeleccionado.extrusionOrigen.fecha
            ? `Fecha: ${formatearFecha(
                dopeSeleccionado.extrusionOrigen.fecha
              )}`
            : "Fecha sin registrar"}
          {" · "}
          {dopeSeleccionado.extrusionOrigen.geometria ??
            "Geometría sin registrar"}
        </p>
      )}
    </div>
  </>
)}
                  </div>
                </div>

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/* =========================================================
   TARJETA DE DOPE
   ========================================================= */

function DopeCard({
  dope,
  onEstadoChange,
  estadoDeshabilitado,
  onViewDetails,
}: {
  dope: Dope
  onEstadoChange: (
    dopeId: number,
    estado: EstadoDope
  ) => void
  estadoDeshabilitado: boolean
  onViewDetails: () => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        {/* Icono */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Beaker className="h-5 w-5" />
        </div>

        {/* Información */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">
              DOPE #{dope.id}
            </h4>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Preparado el {formatearFecha(dope.fecha)}
          </p>
        </div>

        {/* Peso */}
        <div className="sm:text-right">
          <p className="text-sm text-muted-foreground">
            Peso
          </p>

          <p className="font-medium">
            {formatPeso(dope.peso)}
          </p>
        </div>

        {/* Estado */}
        <div className="w-full sm:w-40">
          <Label
            htmlFor={`estado-${dope.id}`}
            className="text-xs text-muted-foreground"
          >
            Estado
          </Label>

          <Select
  value={dope.estado}
  disabled={estadoDeshabilitado || dope.estado === "Extruido"}
  onValueChange={(value) =>
    onEstadoChange(dope.id, value as EstadoDope)
  }
>
  <SelectTrigger
    id={`estado-${dope.id}`}
    className="mt-1"
  >
    <SelectValue />
  </SelectTrigger>

  <SelectContent>
    <SelectItem value="Molido">Molido</SelectItem>
    <SelectItem value="Sin moler">Sin moler</SelectItem>
    <SelectItem value="Extruido" disabled>
      Extruido
    </SelectItem>
  </SelectContent>
</Select>
        </div>

        {/* Detalles */}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
        >
          Ver detalles
        </Button>
      </CardContent>
    </Card>
  )
}

/* =========================================================
   DETALLE
   ========================================================= */

function Detalle({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  )
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function formatPeso(peso: number | null) {
  if (peso === null || !Number.isFinite(peso)) return "Sin registrar"
  if (peso >= 1000) return `${(peso / 1000).toFixed(2)} kg`
  return `${peso} g`
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "Sin registrar"
  const [año, mes, dia] = fecha.split("-")
  return `${dia}/${mes}/${año}`
}
