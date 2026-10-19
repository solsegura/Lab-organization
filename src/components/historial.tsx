
import { useEffect, useMemo, useState } from "react"
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

type TipoEvento =
  | "Preparación"
  | "Heladera"
  | "Extrusión"
  | "Fibras"
  | "Mantenimiento"

type Evento = {
  id: string
  fecha: string
  hora?: string
  tipo: TipoEvento
  titulo: string
  descripcion: string
}

const filtros: Array<"Todos" | TipoEvento> = [
  "Todos",
  "Preparación",
  "Heladera",
  "Extrusión",
  "Fibras",
  "Mantenimiento",
]

export function Historial() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [filtro, setFiltro] = useState<"Todos" | TipoEvento>("Todos")
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void cargarHistorial()
  }, [])

  async function cargarHistorial() {
    setCargando(true)
    setError(null)

    const [
      preparacionesResult,
      dopesResult,
      extrusionesResult,
      fibrasResult,
      mantenimientosResult,
    ] = await Promise.all([
      supabase
        .from("PreparacionDOPE")
        .select('id, "DOPE"'),

      supabase
        .from("DOPE")
        .select('id, "FechaPreparacion", "Peso", "Estado"'),

      supabase
        .from("ExtrusionFibras")
        .select('id, "DOPE", "Fibras", "Fecha", "CantDOPE"'),

      supabase
        .from("Fibras")
        .select('id, "Peso", "Fecha", "Geometria"'),

      supabase
        .from("Mantenimiento_Maquina")
        .select('id, "Fecha", "Descripcion", "PDF"'),
    ])

    const errores = [
      preparacionesResult.error,
      dopesResult.error,
      extrusionesResult.error,
      fibrasResult.error,
      mantenimientosResult.error,
    ].filter(Boolean)

    if (errores.length > 0) {
      setError(
        `No se pudo cargar parte del historial: ${errores
          .map((e) => e!.message)
          .join(" · ")}`
      )
    }

    const preparaciones = preparacionesResult.data ?? []
    const dopes = dopesResult.data ?? []
    const extrusiones = extrusionesResult.data ?? []
    const fibras = fibrasResult.data ?? []
    const mantenimientos = mantenimientosResult.data ?? []

    const eventosNuevos: Evento[] = []

    // -----------------------------------------------------
    // PREPARACIÓN
    // Solo mostramos DOPE vinculados a una preparación.
    // -----------------------------------------------------

    const idsDopesPreparados = new Set(
      preparaciones
        .map((registro) => registro.DOPE)
        .filter((id): id is number => id !== null)
        .map(Number)
    )

    for (const dope of dopes) {
      if (!idsDopesPreparados.has(Number(dope.id))) continue
      if (!dope.FechaPreparacion) continue

      eventosNuevos.push({
        id: `preparacion-${dope.id}`,
        fecha: dope.FechaPreparacion,
        tipo: "Preparación",
        titulo: `DOPE #${dope.id} registrado`,
        descripcion: [
          dope.Peso != null ? `Peso: ${dope.Peso} g` : null,
          dope.Estado ? `Estado: ${dope.Estado}` : null,
          "Nuevo DOPE preparado",
        ]
          .filter(Boolean)
          .join(" · "),
      })
    }

    // -----------------------------------------------------
    // EXTRUSIÓN
    // -----------------------------------------------------

    for (const extrusion of extrusiones) {
      if (!extrusion.Fecha) continue

      const fibraRelacionada = fibras.find(
        (fibra) =>
          extrusion.Fibras != null &&
          Number(fibra.id) === Number(extrusion.Fibras)
      )

      const detalles: string[] = []

      if (extrusion.DOPE != null) {
        detalles.push(`DOPE #${extrusion.DOPE}`)
      }

      if (fibraRelacionada?.Geometria) {
        detalles.push(`Geometría ${fibraRelacionada.Geometria}`)
      }

      if (extrusion.CantDOPE != null) {
        detalles.push(`Consumo de DOPE: ${extrusion.CantDOPE} g`)
      }

      eventosNuevos.push({
        id: `extrusion-${extrusion.id}`,
        fecha: extrusion.Fecha,
        tipo: "Extrusión",
        titulo: `Extrusión #${extrusion.id}`,
        descripcion: detalles.join(" · ") || "Extrusión registrada",
      })
    }

    // -----------------------------------------------------
    // FIBRAS
    // -----------------------------------------------------

    for (const fibra of fibras) {
      if (!fibra.Fecha) continue

      const extrusionRelacionada = extrusiones.find(
        (extrusion) =>
          extrusion.Fibras != null &&
          Number(extrusion.Fibras) === Number(fibra.id)
      )

      const detalles: string[] = []

      if (extrusionRelacionada) {
        detalles.push(`Resultado de Extrusión #${extrusionRelacionada.id}`)
      }

      if (fibra.Geometria) {
        detalles.push(`Geometría ${fibra.Geometria}`)
      }

      if (fibra.Peso != null) {
        detalles.push(`Peso: ${fibra.Peso} g`)
      }

      eventosNuevos.push({
        id: `fibra-${fibra.id}`,
        fecha: fibra.Fecha,
        tipo: "Fibras",
        titulo: `Fibra #${fibra.id} registrada`,
        descripcion: detalles.join(" · ") || "Fibra registrada",
      })
    }

    // -----------------------------------------------------
    // MANTENIMIENTO
    // -----------------------------------------------------

    for (const mantenimiento of mantenimientos) {
      if (!mantenimiento.Fecha) continue

      eventosNuevos.push({
        id: `mantenimiento-${mantenimiento.id}`,
        fecha: mantenimiento.Fecha,
        tipo: "Mantenimiento",
        titulo:
          mantenimiento.Descripcion?.trim() ||
          `Mantenimiento #${mantenimiento.id}`,
        descripcion: mantenimiento.PDF
          ? "Mantenimiento registrado · PDF adjunto"
          : "Mantenimiento registrado",
      })
    }

    // Más recientes primero. Si comparten fecha, mantenemos
    // un orden estable por categoría e identificador.
    eventosNuevos.sort((a, b) => {
      const comparacionFecha = b.fecha.localeCompare(a.fecha)

      if (comparacionFecha !== 0) return comparacionFecha

      return a.id.localeCompare(b.id)
    })

    setEventos(eventosNuevos)
    setCargando(false)
  }

  const eventosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return eventos.filter((evento) => {
      const coincideTipo =
        filtro === "Todos" || evento.tipo === filtro

      if (!coincideTipo) return false
      if (!texto) return true

      return (
        evento.titulo.toLowerCase().includes(texto) ||
        evento.descripcion.toLowerCase().includes(texto) ||
        evento.tipo.toLowerCase().includes(texto)
      )
    })
  }, [eventos, filtro, busqueda])

  const eventosAgrupados = agruparPorFecha(eventosFiltrados)

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
              onChange={(event) => setBusqueda(event.target.value)}
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
            variant={filtro === opcion ? "secondary" : "outline"}
            onClick={() => setFiltro(opcion)}
          >
            {opcion}
          </Button>
        ))}
      </div>

      {/* Estado de carga y errores */}
      {error && (
        <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
          <p>{error}</p>

          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void cargarHistorial()}
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Cantidad de resultados */}
      <div>
        <h3 className="text-xl font-semibold">Actividad</h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {cargando
            ? "Cargando eventos..."
            : `${eventosFiltrados.length} ${
                eventosFiltrados.length === 1 ? "evento" : "eventos"
              }`}
        </p>
      </div>

      {/* Timeline */}
      {cargando ? (
        <p className="text-sm text-muted-foreground">
          Cargando historial desde Supabase...
        </p>
      ) : eventosFiltrados.length === 0 ? (
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
          {eventosAgrupados.map(({ fecha, eventos: eventosDelDia }) => (
            <section key={fecha}>
              <div className="mb-4 flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />

                <h4 className="font-medium">
                  {formatearFecha(fecha)}
                </h4>

                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                {eventosDelDia.map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   EVENTO
   ========================================================= */

function EventoCard({ evento }: { evento: Evento }) {
  const Icon = getIconoEvento(evento.tipo)

  return (
    <Card>
      <CardContent className="flex gap-4 p-5">
        {evento.hora && (
          <div className="w-12 shrink-0 pt-1">
            <p className="text-sm font-medium">{evento.hora}</p>
          </div>
        )}

        <div className="flex shrink-0 flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {evento.tipo}
            </span>
          </div>

          <h4 className="mt-2 font-medium">{evento.titulo}</h4>

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
  const grupos = new Map<string, Evento[]>()

  for (const evento of eventos) {
    const existentes = grupos.get(evento.fecha) ?? []
    grupos.set(evento.fecha, [...existentes, evento])
  }

  return Array.from(grupos.entries())
    .sort(([fechaA], [fechaB]) => fechaB.localeCompare(fechaA))
    .map(([fecha, eventosDelDia]) => ({
      fecha,
      eventos: eventosDelDia.sort((a, b) =>
        (b.hora ?? "").localeCompare(a.hora ?? "")
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

  return fechaLocal.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
