
import { useState } from "react"
import {
  Beaker,
  ChevronRight,
  ClipboardList,
  Plus,
} from "lucide-react"

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

type EstadoDope = "Molido" | "Sin moler"

type Dope = {
  id: number
  fecha: string
  peso: number
  estado: EstadoDope
}

const dopesIniciales: Dope[] = [
  {
    id: 38,
    fecha: "2026-10-06",
    peso: 1200,
    estado: "Molido",
  },
  {
    id: 37,
    fecha: "2026-10-04",
    peso: 850,
    estado: "Sin moler",
  },
  {
    id: 36,
    fecha: "2026-10-02",
    peso: 1000,
    estado: "Molido",
  },
  {
    id: 35,
    fecha: "2026-09-30",
    peso: 500,
    estado: "Molido",
  },
]

type PreparacionProps = {
  onNewDope: () => void
}

export function Preparacion({
  onNewDope,
}: PreparacionProps) {
  const [dopes, setDopes] =
    useState<Dope[]>(dopesIniciales)

  const [dopeSeleccionado, setDopeSeleccionado] =
    useState<Dope | null>(null)

  function cambiarEstado(
    dopeId: number,
    nuevoEstado: EstadoDope
  ) {
    setDopes((actuales) =>
      actuales.map((dope) =>
        dope.id === dopeId
          ? {
              ...dope,
              estado: nuevoEstado,
            }
          : dope
      )
    )

    // Si el diálogo de detalles está abierto,
    // también actualizamos el DOPE mostrado allí.
    setDopeSeleccionado((actual) =>
      actual?.id === dopeId
        ? {
            ...actual,
            estado: nuevoEstado,
          }
        : actual
    )
  }

  function abrirDetalles(dope: Dope) {
    setDopeSeleccionado(dope)
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

          {dopes.length === 0 ? (
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
                  </div>
                </div>

                {/* Próximamente */}
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm font-medium">
                    Más información
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Cuando conectemos Supabase, acá podremos
                    mostrar la composición del DOPE, su
                    ubicación en la heladera, las extrusiones
                    realizadas y otros datos asociados.
                  </p>
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
  onViewDetails,
}: {
  dope: Dope
  onEstadoChange: (
    dopeId: number,
    estado: EstadoDope
  ) => void
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
            onValueChange={(value) =>
              onEstadoChange(
                dope.id,
                value as EstadoDope
              )
            }
          >
            <SelectTrigger
              id={`estado-${dope.id}`}
              className="mt-1"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="Molido">
                Molido
              </SelectItem>

              <SelectItem value="Sin moler">
                Sin moler
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

function formatPeso(peso: number) {
  if (peso >= 1000) {
    return `${(peso / 1000).toFixed(2)} kg`
  }

  return `${peso} g`
}

function formatearFecha(fecha: string) {
  const [año, mes, dia] = fecha.split("-")

  return `${dia}/${mes}/${año}`
}
