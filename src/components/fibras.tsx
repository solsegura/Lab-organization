
import { useEffect, useState } from "react"
import { Scale, FlaskConical,Waves } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

type Fibra = {
  id: number
  fecha: string
  geometria: string
  peso: number | null
}

export function Fibras() {
  const [fibras, setFibras] = useState<Fibra[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [fibraSeleccionada, setFibraSeleccionada] =
    useState<Fibra | null>(null)
  const [peso, setPeso] = useState("")

  useEffect(() => {
    cargarFibras()
  }, [])

  async function cargarFibras() {
    setCargando(true)

    const { data, error } = await supabase
      .from("Fibras")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      console.error("Error cargando fibras:", error)
      alert(`No se pudieron cargar las fibras: ${error.message}`)
      setCargando(false)
      return
    }

    const fibrasCargadas: Fibra[] = (data ?? []).map((item) => {
      const fecha =
        item.Fecha ??
        item.fecha ??
        item.FechaExtrusion ??
        item.fecha_extrusion ??
        ""

      const geometria =
        item.Geometria ??
        item.geometria ??
        item.Geometry ??
        ""

      return {
        id: Number(item.id),
        fecha: fecha ? String(fecha) : "Sin fecha",
        geometria: geometria
          ? String(geometria)
          : "Sin geometría",
        peso:
          item.Peso == null
            ? null
            : Number(item.Peso),
      }
    })

    setFibras(fibrasCargadas)
    setCargando(false)
  }

  function abrirDialogo(fibra: Fibra) {
    setFibraSeleccionada(fibra)
    setPeso(
      fibra.peso !== null ? String(fibra.peso) : ""
    )
  }

  function cerrarDialogo() {
    if (guardando) return

    setFibraSeleccionada(null)
    setPeso("")
  }

  async function guardarPeso() {
    if (!fibraSeleccionada || guardando) {
      return
    }

    const pesoNumerico = Number(peso)

    if (!peso.trim() || !Number.isFinite(pesoNumerico) || pesoNumerico <= 0) {
      alert("Ingresá un peso válido mayor que cero.")
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from("Fibras")
      .update({ Peso: pesoNumerico })
      .eq("id", fibraSeleccionada.id)

    if (error) {
      console.error("Error guardando el peso:", error)
      alert(`No se pudo guardar el peso: ${error.message}`)
      setGuardando(false)
      return
    }

    setFibras((actuales) =>
      actuales.map((fibra) =>
        fibra.id === fibraSeleccionada.id
          ? { ...fibra, peso: pesoNumerico }
          : fibra
      )
    )

    setFibraSeleccionada(null)
    setPeso("")
    setGuardando(false)
  }

  const fibrasPendientes = fibras.filter(
    (fibra) => fibra.peso === null
  ).length

  return (
    <>
      <div className="space-y-8">
       {/* Encabezado */}
<div>
  <div className="flex items-center gap-3">
    <Waves className="h-7 w-7 shrink-0" />

    <h2 className="text-3xl font-semibold leading-none tracking-tight">
      Fibras
    </h2>
  </div>

  <div className="ml-10">
    <AccentLine />
  </div>

  <p className="mt-2 text-muted-foreground">
    Registro y seguimiento de las fibras obtenidas
    durante las extrusiones.
  </p>
</div>

        {/* Resumen */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>
                Fibras registradas
              </CardDescription>

              <CardTitle className="text-3xl">
                {fibras.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>
                Peso pendiente
              </CardDescription>

              <CardTitle className="text-3xl">
                {fibrasPendientes}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Lista */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            Fibras
          </h3>

          {cargando ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Cargando fibras...
              </CardContent>
            </Card>
          ) : fibras.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Todavía no hay fibras registradas.
              </CardContent>
            </Card>
          ) : (
            fibras.map((fibra) => (
              <Card key={fibra.id}>
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FlaskConical className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-medium">
                        Fibra #{fibra.id}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Extrusión: {fibra.fecha}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Geometría: {fibra.geometria}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {fibra.peso === null ? (
                      <>
                        <span className="text-sm text-muted-foreground">
                          Peso pendiente
                        </span>

                        <Button
  className="bg-[#fc008e] text-white hover:bg-[#d9007a]"
                          onClick={() => abrirDialogo(fibra)}
                        >
                          <Scale className="mr-2 h-4 w-4" />
                          Agregar peso
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => abrirDialogo(fibra)}
                      >
                        <Scale className="mr-2 h-4 w-4" />
                        {fibra.peso} g · Editar peso
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Diálogo para registrar o editar peso */}
      <Dialog
        open={fibraSeleccionada !== null}
        onOpenChange={(open) => {
          if (!open) {
            cerrarDialogo()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fibraSeleccionada?.peso === null
                ? "Agregar peso"
                : "Editar peso"}
            </DialogTitle>

            <DialogDescription>
              Ingresá el peso registrado para la fibra #
              {fibraSeleccionada?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="peso-fibra">
              Peso
            </Label>

            <div className="flex items-center gap-2">
              <Input
                id="peso-fibra"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej. 4.82"
                value={peso}
                onChange={(event) =>
                  setPeso(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !guardando) {
                    guardarPeso()
                  }
                }}
                disabled={guardando}
                autoFocus
              />

              <span className="text-sm text-muted-foreground">
                g
              </span>
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
              
              onClick={guardarPeso}
              disabled={
                guardando ||
                !peso.trim() ||
                !Number.isFinite(Number(peso)) ||
                Number(peso) <= 0
              }
            >
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}