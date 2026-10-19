
import { ArrowLeft, Upload } from "lucide-react"
import { useEffect, useState } from "react"
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

type NMMO = {
  id: number
  Identificacion: string | null
  cantRestante: number
}

type Celulosa = {
  id: number
  Marca: string
  cantRestante: number
}

export type DatosNuevoDope = {
  fecha: string
  peso: string
  concentracionCelulosa: string
  concentracionMedida: string
  estado: string
  nmmoId: number
  masaNMMO: string
  celulosaId: number
  masaCelulosa: string
  pdf: File | null
}


type NuevoDopeProps = {
  onBack: () => void
  onContinue: (datos: DatosNuevoDope) => void
}


export function NuevoDope({
  onBack,
  onContinue,
}: NuevoDopeProps)  {
  const today = new Date().toISOString().split("T")[0]

const [fecha, setFecha] = useState(today)
const [peso, setPeso] = useState("")
const [concentracionCelulosa, setConcentracionCelulosa] = useState("")
const [concentracionMedida, setConcentracionMedida] = useState("")
const [estado, setEstado] = useState("sin-moler")

const [nmmos, setNmmos] = useState<NMMO[]>([])
const [celulosas, setCelulosas] = useState<Celulosa[]>([])

const [nmmoId, setNmmoId] = useState("")
const [celulosaId, setCelulosaId] = useState("")
const [masaNMMO, setMasaNMMO] = useState("")
const [masaCelulosa, setMasaCelulosa] = useState("")
const [pdf, setPdf] = useState<File | null>(null)

const [cargandoMateriales, setCargandoMateriales] = useState(true)
const [errorMateriales, setErrorMateriales] = useState("")

useEffect(() => {
  async function cargarMateriales() {
    setCargandoMateriales(true)
    setErrorMateriales("")

    const [
      { data: datosNMMO, error: errorNMMO },
      { data: datosCelulosa, error: errorCelulosa },
    ] = await Promise.all([
      supabase
  .from("NMMO")
  .select('id, "Identificacion", "CantRestante (g)"')
  .order("id"),
      supabase
        .from("Celulosa")
        .select('id, "Marca", "CantRestante"')
        .gt("CantRestante", 0)
        .order("id"),
    ])

    if (errorNMMO || errorCelulosa) {
  console.error("Error cargando NMMO:", errorNMMO)
  console.error("Error cargando celulosa:", errorCelulosa)

  setErrorMateriales(
    [
      errorNMMO && `NMMO: ${errorNMMO.message}`,
      errorCelulosa && `Celulosa: ${errorCelulosa.message}`,
    ]
      .filter(Boolean)
      .join(" | ")
  )

  setCargandoMateriales(false)
  return
}

    setNmmos(
  (datosNMMO ?? [])
    .map((item) => ({
      id: Number(item.id),
      Identificacion: item.Identificacion,
      cantRestante: Number(item["CantRestante (g)"]),
    }))
    .filter((item) => item.cantRestante > 0)
)

    setCelulosas(
      (datosCelulosa ?? []).map((item) => ({
        id: Number(item.id),
        Marca: item.Marca,
        cantRestante: Number(item.CantRestante),
      }))
    )

    setCargandoMateriales(false)
  }

  void cargarMateriales()
}, [])

const continuar = () => {
  const cantidadNMMO = Number(masaNMMO)
  const cantidadCelulosa = Number(masaCelulosa)

  const nmmoSeleccionado = nmmos.find(
    (item) => item.id === Number(nmmoId)
  )
  const celulosaSeleccionada = celulosas.find(
    (item) => item.id === Number(celulosaId)
  )

  if (!fecha || !nmmoSeleccionado || !celulosaSeleccionada) {
    alert("Completá la fecha y seleccioná el NMMO y la celulosa.")
    return
  }

  if (
    !masaNMMO ||
    !masaCelulosa ||
    !Number.isFinite(cantidadNMMO) ||
    !Number.isFinite(cantidadCelulosa) ||
    cantidadNMMO <= 0 ||
    cantidadCelulosa <= 0
  ) {
    alert("Ingresá cantidades válidas para el NMMO y la celulosa.")
    return
  }

  if (
    cantidadNMMO > nmmoSeleccionado.cantRestante ||
    cantidadCelulosa > celulosaSeleccionada.cantRestante
  ) {
    alert("La cantidad ingresada supera el stock disponible.")
    return
  }

  onContinue({
    fecha,
    peso,
    concentracionCelulosa,
    concentracionMedida,
    estado,
    nmmoId: Number(nmmoId),
    masaNMMO,
    celulosaId: Number(celulosaId),
    masaCelulosa,
    pdf,
  })
}

  return (
    <div className="max-w-3xl space-y-8">
      {/* Encabezado */}
      <div>
        <Button
          variant="ghost"
          className="mb-4 -ml-3"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <h2 className="text-3xl font-semibold tracking-tight">
          Nuevo DOPE
        </h2>

        <p className="mt-2 text-muted-foreground">
          Registrar un nuevo DOPE.
        </p>
      </div>

      {/* Datos del DOPE */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del DOPE</CardTitle>

          <CardDescription>
            Ingresá la información correspondiente al nuevo DOPE.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha">
              Fecha
            </Label>

            
<Input
  id="fecha"
  type="date"
  value={fecha}
  onChange={(event) => setFecha(event.target.value)}
/>

          </div>
          {/* Materiales utilizados */}
<div className="space-y-4 rounded-lg border p-4">
  <h3 className="font-semibold">Materiales utilizados</h3>

  {cargandoMateriales && (
    <p className="text-sm text-muted-foreground">
      Cargando materiales disponibles...
    </p>
  )}

  {errorMateriales && (
    <p className="text-sm text-destructive">
      {errorMateriales}
    </p>
  )}

  {!cargandoMateriales && !errorMateriales && (
    <>
      <div className="space-y-2">
        <Label htmlFor="nmmo">NMMO utilizado</Label>

<Select
  value={nmmoId}
  onValueChange={(value) => setNmmoId(value ?? "")}
>          <SelectTrigger id="nmmo">
<SelectValue placeholder="Seleccionar NMMO">
  {(() => {
    const seleccionado = nmmos.find(
      (item) => String(item.id) === nmmoId
    );

    return seleccionado
      ? `${seleccionado.Identificacion?.trim() || "NMMO"} — ${seleccionado.cantRestante.toLocaleString("es-AR")} g disponibles`
      : undefined;
  })()}
</SelectValue>          </SelectTrigger>

          <SelectContent>
            {nmmos.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {(item.Identificacion?.trim() || `NMMO #${item.id}`)}
                {" — "}
                {item.cantRestante.toLocaleString("es-AR")} g disponibles
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {nmmos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay NMMO con stock disponible.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="masa-nmmo">Masa de NMMO utilizada (g)</Label>

        <Input
          id="masa-nmmo"
          type="number"
          min="0.01"
          step="0.01"
          value={masaNMMO}
          onChange={(event) => setMasaNMMO(event.target.value)}
          placeholder="Ej. 120"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="celulosa">Celulosa utilizada</Label>

<Select
  value={celulosaId}
  onValueChange={(value) => setCelulosaId(value ?? "")}
>          <SelectTrigger id="celulosa">
<SelectValue placeholder="Seleccionar celulosa">
  {(() => {
    const seleccionado = celulosas.find(
      (item) => String(item.id) === celulosaId
    );

    return seleccionado
      ? `${seleccionado.Marca} — ${seleccionado.cantRestante.toLocaleString("es-AR")} g disponibles`
      : undefined;
  })()}
</SelectValue>          </SelectTrigger>

          <SelectContent>
            {celulosas.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.Marca}
                {" — "}
                {item.cantRestante.toLocaleString("es-AR")} g disponibles
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {celulosas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay celulosa con stock disponible.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="masa-celulosa">
          Masa de celulosa utilizada (g)
        </Label>

        <Input
          id="masa-celulosa"
          type="number"
          min="0.01"
          step="0.01"
          value={masaCelulosa}
          onChange={(event) => setMasaCelulosa(event.target.value)}
          placeholder="Ej. 10"
        />
      </div>
    </>
  )}
</div>
          {/* Peso */}
          <div className="space-y-2">
            <Label htmlFor="peso">
              Peso
            </Label>

            <Input
              id="peso"
              type="number"
              placeholder="Ingresar peso en gramos"
              min="0"
              step="0.01"
              value={peso}
            onChange={(event) => setPeso(event.target.value)}
            />
          </div>

          {/* Concentración de celulosa */}
          <div className="space-y-2">
            <Label htmlFor="concentracion-celulosa">
              Concentración de celulosa
            </Label>

            <Input
              id="concentracion-celulosa"
              type="number"
              placeholder="Ingresar concentración teórica"
              min="0"
              step="0.01"
              value={concentracionCelulosa}
              onChange={(event) => setConcentracionCelulosa(event.target.value)}
            />
            
          </div>

          {/* Concentración medida */}
          <div className="space-y-2">
            <Label htmlFor="concentracion-medida">
              Concentración medida
            </Label>

            <Input
              id="concentracion-medida"
              type="number"
              placeholder="Ingresar concentración medida"
              min="0"
              step="0.01"
              value={concentracionMedida}
onChange={(event) => setConcentracionMedida(event.target.value)}
            />

            <p className="text-sm text-muted-foreground">
              La concentración medida puede registrarse en un
              momento diferente al de la preparación.
            </p>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label>Estado</Label>

            <Select defaultValue="sin-moler">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="sin-moler">
                  Sin moler
                </SelectItem>

                <SelectItem value="molido">
                  Molido
                </SelectItem>

                <SelectItem value="extruido">
                  Extruido
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PDF */}
          <div className="space-y-2">
            <Label htmlFor="pdf">
              Adjuntar PDF
            </Label>

            <div className="flex items-center gap-3">
              <Input
                id="pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                setPdf(event.target.files?.[0] ?? null)}
              />

              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continuar */}
      <div className="flex justify-end">
       <Button 
         className="bg-[#fc008e] text-white hover:bg-[#d9007a]"

       onClick={continuar}>
  Continuar
</Button>
      </div>
    </div>
  )
}
