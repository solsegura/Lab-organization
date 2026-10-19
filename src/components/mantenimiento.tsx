
import { useEffect, useState } from "react"
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Plus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Mantenimiento = {
  id: number
  fecha: string
  descripcion: string
  pdf: string | null
  pdfUrl?: string | null
}

const BUCKET_PDF = "mantenimiento-pdf"

export function Mantenimiento() {
  const [mantenimientos, setMantenimientos] = useState<
    Mantenimiento[]
  >([])

  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [fecha, setFecha] = useState(obtenerFechaActual())
  const [descripcion, setDescripcion] = useState("")
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void cargarMantenimientos()
  }, [])

  async function cargarMantenimientos() {
    setCargando(true)
    setError(null)

    const { data, error: errorConsulta } = await supabase
      .from("Mantenimiento_Maquina")
      .select('id, "Fecha", "Descripcion", "PDF"')
      .order("Fecha", { ascending: false })
      .order("id", { ascending: false })

    if (errorConsulta) {
      setError(
        `No se pudieron cargar los mantenimientos: ${errorConsulta.message}`
      )
      setCargando(false)
      return
    }

    const registros: Mantenimiento[] = await Promise.all(
      (data ?? []).map(async (registro) => {
        let pdfUrl: string | null = null

        if (registro.PDF) {
          // Si el valor guardado ya es una URL, la usamos directamente.
          if (
            registro.PDF.startsWith("https://") ||
            registro.PDF.startsWith("http://")
          ) {
            pdfUrl = registro.PDF
          } else {
            // Si es una ruta de Storage, generamos un enlace temporal.
            const { data: urlData } = await supabase.storage
              .from(BUCKET_PDF)
              .createSignedUrl(registro.PDF, 3600)

            pdfUrl = urlData?.signedUrl ?? null
          }
        }

        return {
          id: Number(registro.id),
          fecha: registro.Fecha,
          descripcion: registro.Descripcion ?? "",
          pdf: registro.PDF,
          pdfUrl,
        }
      })
    )

    setMantenimientos(registros)
    setCargando(false)
  }

  function abrirDialogo() {
    setFecha(obtenerFechaActual())
    setDescripcion("")
    setArchivoPDF(null)
    setError(null)
    setDialogAbierto(true)
  }

  function cerrarDialogo() {
    if (guardando) return
    setDialogAbierto(false)
  }

  async function guardarMantenimiento() {
    if (!fecha || !descripcion.trim()) return

    setGuardando(true)
    setError(null)

    let rutaPDF: string | null = null

    try {
      // Subimos el PDF si se seleccionó uno.
      if (archivoPDF) {
        const nombreSeguro = archivoPDF.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_")

        rutaPDF = `${Date.now()}-${nombreSeguro}`

        const { error: errorSubida } = await supabase.storage
          .from(BUCKET_PDF)
          .upload(rutaPDF, archivoPDF, {
            contentType: "application/pdf",
            upsert: false,
          })

        if (errorSubida) {
          throw new Error(
            `No se pudo subir el PDF: ${errorSubida.message}`
          )
        }
      }

      // Guardamos únicamente las columnas que existen en la tabla.
      const { error: errorInsercion } = await supabase
        .from("Mantenimiento_Maquina")
        .insert({
          Fecha: fecha,
          Descripcion: descripcion.trim(),
          PDF: rutaPDF,
        })

      if (errorInsercion) {
        // Si falló el registro, intentamos eliminar el archivo subido.
        if (rutaPDF) {
          await supabase.storage
            .from(BUCKET_PDF)
            .remove([rutaPDF])
        }

        throw new Error(
          `No se pudo guardar el mantenimiento: ${errorInsercion.message}`
        )
      }

      setDialogAbierto(false)
      setFecha(obtenerFechaActual())
      setDescripcion("")
      setArchivoPDF(null)

      await cargarMantenimientos()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      )
    } finally {
      setGuardando(false)
    }
  }

  const formularioValido =
    Boolean(fecha) && Boolean(descripcion.trim())

  return (
    <>
      <div className="space-y-8">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Wrench className="h-7 w-7" />

              <h2 className="text-3xl font-semibold tracking-tight">
                Mantenimiento
              </h2>
            </div>

            <p className="mt-2 text-muted-foreground">
              Registro y seguimiento de los mantenimientos
              realizados en el laboratorio.
            </p>
          </div>

          <Button onClick={abrirDialogo}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar mantenimiento
          </Button>
        </div>

        {/* Error general */}
        {error && (
          <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>
                Mantenimientos registrados
              </CardDescription>

              <CardTitle className="text-3xl">
                {mantenimientos.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>
                Último mantenimiento
              </CardDescription>

              <CardTitle className="text-xl">
                {mantenimientos.length > 0
                  ? formatearFecha(mantenimientos[0].fecha)
                  : "Sin registros"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Historial */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">
              Mantenimientos anteriores
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Historial de tareas realizadas y documentación adjunta.
            </p>
          </div>

          {cargando ? (
            <p className="text-sm text-muted-foreground">
              Cargando mantenimientos...
            </p>
          ) : mantenimientos.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
                <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground" />

                <p className="font-medium">
                  Todavía no hay mantenimientos registrados
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Registrá el primero usando el botón de arriba.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mantenimientos.map((mantenimiento) => (
                <MantenimientoCard
                  key={mantenimiento.id}
                  mantenimiento={mantenimiento}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registrar mantenimiento */}
      <Dialog
        open={dialogAbierto}
        onOpenChange={(abierto) => {
          if (!abierto) {
            cerrarDialogo()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar mantenimiento
            </DialogTitle>

            <DialogDescription>
              Ingresá la fecha, una descripción libre y, si corresponde,
              adjuntá el PDF con el detalle del trabajo realizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="fecha-mantenimiento">
                Fecha
              </Label>

              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="fecha-mantenimiento"
                  type="date"
                  value={fecha}
                  onChange={(event) =>
                    setFecha(event.target.value)
                  }
                  className="pl-9"
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion-mantenimiento">
                Descripción
              </Label>

              <Textarea
                id="descripcion-mantenimiento"
                placeholder="Describí brevemente el mantenimiento realizado..."
                value={descripcion}
                onChange={(event) =>
                  setDescripcion(event.target.value)
                }
                rows={4}
                disabled={guardando}
              />
            </div>

            {/* PDF */}
            <div className="space-y-2">
              <Label htmlFor="pdf-mantenimiento">
                PDF del mantenimiento (opcional)
              </Label>

              <Input
                id="pdf-mantenimiento"
                type="file"
                accept="application/pdf,.pdf"
                disabled={guardando}
                onChange={(event) => {
                  const archivo = event.target.files?.[0] ?? null

                  if (
                    archivo &&
                    archivo.type !== "application/pdf" &&
                    !archivo.name.toLowerCase().endsWith(".pdf")
                  ) {
                    setError("Seleccioná un archivo PDF.")
                    setArchivoPDF(null)
                    event.target.value = ""
                    return
                  }

                  setError(null)
                  setArchivoPDF(archivo)
                }}
              />

              {archivoPDF && (
                <p className="text-sm text-muted-foreground">
                  Archivo seleccionado: {archivoPDF.name}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Podés incluir en el PDF las observaciones y los detalles
                del mantenimiento.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cerrarDialogo}
              disabled={guardando}
            >
              Cancelar
            </Button>

            <Button
              onClick={guardarMantenimiento}
              disabled={!formularioValido || guardando}
            >
              {guardando ? "Guardando..." : "Guardar mantenimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* Tarjeta de mantenimiento */

function MantenimientoCard({
  mantenimiento,
}: {
  mantenimiento: Mantenimiento
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Wrench className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-lg">
                Mantenimiento #{mantenimiento.id}
              </CardTitle>

              <CardDescription className="mt-1">
                {formatearFecha(mantenimiento.fecha)}
              </CardDescription>
            </div>
          </div>

          <span className="rounded-full bg-muted px-3 py-1 text-xs">
            Extrusora
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">
            Descripción
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {mantenimiento.descripcion}
          </p>
        </div>

        {mantenimiento.pdfUrl && (
          <a
            href={mantenimiento.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            <FileText className="h-4 w-4" />
            Ver PDF del mantenimiento
          </a>
        )}
      </CardContent>
    </Card>
  )
}

/* Utilidades */

function obtenerFechaActual() {
  const hoy = new Date()

  const año = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, "0")
  const dia = String(hoy.getDate()).padStart(2, "0")

  return `${año}-${mes}-${dia}`
}

function formatearFecha(fecha: string) {
  const [año, mes, dia] = fecha.split("-")

  return `${dia}/${mes}/${año}`
}
