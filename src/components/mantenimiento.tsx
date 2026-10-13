
import { useState } from "react"
import {
  CalendarDays,
  ClipboardList,
  Plus,
  Wrench,
} from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TipoMantenimiento =
  | "Limpieza"
  | "Cambio de pieza"
  | "Reparación"
  | "Inspección"
  | "Otro"

type Mantenimiento = {
  id: number
  fecha: string
  tipo: TipoMantenimiento
  descripcion: string
  observaciones: string
}

const mantenimientosIniciales: Mantenimiento[] = [
  {
    id: 1,
    fecha: "2026-10-06",
    tipo: "Limpieza",
    descripcion: "Limpieza general de la extrusora",
    observaciones:
      "Se realizó limpieza de las partes en contacto con el dope.",
  },
  {
    id: 2,
    fecha: "2026-09-28",
    tipo: "Cambio de pieza",
    descripcion: "Cambio de filtro",
    observaciones:
      "Se reemplazó el filtro utilizado durante la extrusión.",
  },
]

export function Mantenimiento() {
  const [mantenimientos, setMantenimientos] =
    useState<Mantenimiento[]>(
      mantenimientosIniciales
    )

  const [dialogAbierto, setDialogAbierto] =
    useState(false)

  const [fecha, setFecha] = useState(
    obtenerFechaActual()
  )

  const [tipo, setTipo] =
    useState<TipoMantenimiento | "">("")

  const [descripcion, setDescripcion] =
    useState("")

  const [observaciones, setObservaciones] =
    useState("")

  function abrirDialogo() {
    setFecha(obtenerFechaActual())
    setTipo("")
    setDescripcion("")
    setObservaciones("")
    setDialogAbierto(true)
  }

  function cerrarDialogo() {
    setDialogAbierto(false)
  }

  function guardarMantenimiento() {
    if (
      !fecha ||
      !tipo ||
      !descripcion.trim()
    ) {
      return
    }

    const nuevoMantenimiento: Mantenimiento = {
      id: Date.now(),
      fecha,
      tipo,
      descripcion: descripcion.trim(),
      observaciones: observaciones.trim(),
    }

    setMantenimientos((actuales) => [
      nuevoMantenimiento,
      ...actuales,
    ])

    cerrarDialogo()
  }

  const formularioValido =
    Boolean(fecha) &&
    Boolean(tipo) &&
    Boolean(descripcion.trim())

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
                  ? formatearFecha(
                      mantenimientos[0].fecha
                    )
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
              Registro histórico de las tareas realizadas.
            </p>
          </div>

          {mantenimientos.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
                <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground" />

                <p className="font-medium">
                  Todavía no hay mantenimientos registrados
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Registrá el primero usando el botón de
                  arriba.
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

      {/* =====================================================
          DIALOG — REGISTRAR MANTENIMIENTO
          ===================================================== */}

      <Dialog
        open={dialogAbierto}
        onOpenChange={setDialogAbierto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar mantenimiento
            </DialogTitle>

            <DialogDescription>
              Completá los datos del mantenimiento realizado.
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
                />
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo-mantenimiento">
                Tipo de mantenimiento
              </Label>

              <Select
                value={tipo}
                onValueChange={(value) =>
                  setTipo(
                    value as TipoMantenimiento
                  )
                }
              >
                <SelectTrigger id="tipo-mantenimiento">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Limpieza">
                    Limpieza
                  </SelectItem>

                  <SelectItem value="Cambio de pieza">
                    Cambio de pieza
                  </SelectItem>

                  <SelectItem value="Reparación">
                    Reparación
                  </SelectItem>

                  <SelectItem value="Inspección">
                    Inspección
                  </SelectItem>

                  <SelectItem value="Otro">
                    Otro
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion-mantenimiento">
                Descripción
              </Label>

              <Textarea
                id="descripcion-mantenimiento"
                placeholder="¿Qué mantenimiento se realizó?"
                value={descripcion}
                onChange={(event) =>
                  setDescripcion(event.target.value)
                }
                rows={3}
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones-mantenimiento">
                Observaciones
              </Label>

              <Textarea
                id="observaciones-mantenimiento"
                placeholder="Información adicional..."
                value={observaciones}
                onChange={(event) =>
                  setObservaciones(event.target.value)
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cerrarDialogo}
            >
              Cancelar
            </Button>

            <Button
              onClick={guardarMantenimiento}
              disabled={!formularioValido}
            >
              Guardar mantenimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* =========================================================
   TARJETA DE MANTENIMIENTO
   ========================================================= */

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
                {mantenimiento.tipo}
              </CardTitle>

              <CardDescription className="mt-1">
                {formatearFecha(
                  mantenimiento.fecha
                )}
              </CardDescription>
            </div>
          </div>

          <span className="rounded-full bg-muted px-3 py-1 text-xs">
            Extrusora
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">
            Descripción
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {mantenimiento.descripcion}
          </p>
        </div>

        {mantenimiento.observaciones && (
          <div>
            <p className="text-sm font-medium">
              Observaciones
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {mantenimiento.observaciones}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function obtenerFechaActual() {
  const hoy = new Date()

  const año = hoy.getFullYear()
  const mes = String(
    hoy.getMonth() + 1
  ).padStart(2, "0")
  const dia = String(
    hoy.getDate()
  ).padStart(2, "0")

  return `${año}-${mes}-${dia}`
}

function formatearFecha(fecha: string) {
  const [año, mes, dia] = fecha.split("-")

  return `${dia}/${mes}/${año}`
}
