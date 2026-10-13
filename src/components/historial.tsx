
import { useMemo, useState } from "react"
import {
  Beaker,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Package,
  Search,
  Snowflake,
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
import { Input } from "@/components/ui/input"

type TipoEvento =
  | "Preparación"
  | "Heladera"
  | "Extrusión"
  | "Fibras"
  | "Mantenimiento"

type Evento = {
  id: number
  fecha: string
  hora: string
  tipo: TipoEvento
  titulo: string
  descripcion: string
}

const eventosIniciales: Evento[] = [
  {
    id: 1,
    fecha: "2026-10-06",
    hora: "14:32",
    tipo: "Extrusión",
    titulo: "Extrusión #18",
    descripcion: "DOPE #38 · Geometría circular",
  },
  {
    id: 2,
    fecha: "2026-10-06",
    hora: "12:15",
    tipo: "Heladera",
    titulo: "DOPE #38 ingresó a la heladera",
    descripcion: "Jarra 1 L · 850 g",
  },
  {
    id: 3,
    fecha: "2026-10-06",
    hora: "10:47",
    tipo: "Preparación",
    titulo: "DOPE #38 registrado",
    descripcion: "Nuevo DOPE preparado",
  },
  {
    id: 4,
    fecha: "2026-10-06",
    hora: "09:30",
    tipo: "Fibras",
    titulo: "Fibra #24 registrada",
    descripcion: "Resultado de Extrusión #17",
  },
  {
    id: 5,
    fecha: "2026-10-05",
    hora: "16:20",
    tipo: "Heladera",
    titulo: "DOPE #31 retirado de la heladera",
    descripcion: "Jarra 2 L",
  },
  {
    id: 6,
    fecha: "2026-10-05",
    hora: "11:05",
    tipo: "Mantenimiento",
    titulo: "Limpieza de extrusora",
    descripcion:
      "Limpieza general de las partes en contacto con el DOPE",
  },
  {
    id: 7,
    fecha: "2026-10-04",
    hora: "15:40",
    tipo: "Extrusión",
    titulo: "Extrusión #17",
    descripcion: "DOPE #31 · Geometría kidney shape",
  },
]

const filtros: Array<"Todos" | TipoEvento> = [
  "Todos",
  "Preparación",
  "Heladera",
  "Extrusión",
  "Fibras",
  "Mantenimiento",
]

export function Historial() {
  const [eventos] =
    useState<Evento[]>(eventosIniciales)

  const [filtro, setFiltro] =
    useState<"Todos" | TipoEvento>("Todos")

  const [busqueda, setBusqueda] =
    useState("")

  const eventosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase()

    return eventos.filter((evento) => {
      const coincideTipo =
        filtro === "Todos" ||
        evento.tipo === filtro

      if (!coincideTipo) {
        return false
      }

      if (!texto) {
        return true
      }

      return (
        evento.titulo
          .toLowerCase()
          .includes(texto) ||
        evento.descripcion
          .toLowerCase()
          .includes(texto) ||
        evento.tipo
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [eventos, filtro, busqueda])

  const eventosAgrupados = agruparPorFecha(
    eventosFiltrados
  )

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7" />

          <h2 className="text-3xl font-semibold tracking-tight">
            Historial
          </h2>
        </div>

        <p className="mt-2 text-muted-foreground">
          Actividad general registrada en el laboratorio.
        </p>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Buscar actividad
          </CardTitle>

          <CardDescription>
            Buscá por DOPE, extrusión, fibra, mantenimiento
            o cualquier otro dato registrado.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filtros.map((opcion) => (
          <Button
            key={opcion}
            variant={
              filtro === opcion
                ? "secondary"
                : "outline"
            }
            onClick={() => setFiltro(opcion)}
          >
            {opcion}
          </Button>
        ))}
      </div>

      {/* Cantidad de resultados */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            Actividad
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {eventosFiltrados.length}{" "}
            {eventosFiltrados.length === 1
              ? "evento"
              : "eventos"}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {eventosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <Search className="mb-4 h-10 w-10 text-muted-foreground" />

            <p className="font-medium">
              No se encontraron eventos
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Probá con otra búsqueda o cambiá el filtro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {eventosAgrupados.map(
            ({ fecha, eventos }) => (
              <section key={fecha}>
                {/* Fecha */}
                <div className="mb-4 flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />

                  <h4 className="font-medium">
                    {formatearFecha(fecha)}
                  </h4>

                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Eventos del día */}
                <div className="space-y-3">
                  {eventos.map((evento) => (
                    <EventoCard
                      key={evento.id}
                      evento={evento}
                    />
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   EVENTO
   ========================================================= */

function EventoCard({
  evento,
}: {
  evento: Evento
}) {
  const Icon = getIconoEvento(evento.tipo)

  return (
    <Card>
      <CardContent className="flex gap-4 p-5">
        {/* Hora */}
        <div className="w-12 shrink-0 pt-1">
          <p className="text-sm font-medium">
            {evento.hora}
          </p>
        </div>

        {/* Línea / icono */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Información */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {evento.tipo}
            </span>
          </div>

          <h4 className="mt-2 font-medium">
            {evento.titulo}
          </h4>

          <p className="mt-1 text-sm text-muted-foreground">
            {evento.descripcion}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* =========================================================
   ICONOS
   ========================================================= */

function getIconoEvento(tipo: TipoEvento) {
  switch (tipo) {
    case "Preparación":
      return Beaker

    case "Heladera":
      return Snowflake

    case "Extrusión":
      return FlaskConical

    case "Fibras":
      return Package

    case "Mantenimiento":
      return Wrench
  }
}

/* =========================================================
   AGRUPACIÓN
   ========================================================= */

function agruparPorFecha(eventos: Evento[]) {
  const grupos = new Map<
    string,
    Evento[]
  >()

  for (const evento of eventos) {
    const existentes =
      grupos.get(evento.fecha) ?? []

    grupos.set(evento.fecha, [
      ...existentes,
      evento,
    ])
  }

  return Array.from(grupos.entries())
    .sort(([fechaA], [fechaB]) =>
      fechaB.localeCompare(fechaA)
    )
    .map(([fecha, eventos]) => ({
      fecha,
      eventos: eventos.sort((a, b) =>
        b.hora.localeCompare(a.hora)
      ),
    }))
}

/* =========================================================
   FECHAS
   ========================================================= */

function formatearFecha(fecha: string) {
  const [año, mes, dia] = fecha.split("-")

  const fechaLocal = new Date(
    Number(año),
    Number(mes) - 1,
    Number(dia)
  )

  return fechaLocal.toLocaleDateString(
    "es-AR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  )
}
