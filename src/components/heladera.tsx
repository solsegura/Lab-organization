
import { useEffect, useState } from "react"
import { Plus, Snowflake, Trash2 } from "lucide-react"

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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { supabase } from "@/lib/supabase"

type Recipiente =
  | "jarra-1"
  | "jarra-2"
  | "pote-1"
  | "otro"


type Dope = {
  id: number
  peso: number
  estado: "Molido" | "Sin moler" | "Extruido" |string
  recuperado?: boolean
  origen?: string
}

type DopeHeladera = {
  dope: Dope
  recipiente: Recipiente
  volumen: number
}

const dopesIniciales: DopeHeladera[] = [
  {
    dope: {
      id: 24,
      peso: 1000,
      estado: "Molido",
    },
    recipiente: "jarra-1",
    volumen: 1,
  },
  {
    dope: {
      id: 31,
      peso: 750,
      estado: "Sin moler",
    },
    recipiente: "jarra-2",
    volumen: 2,
  },
  {
    dope: {
      id: 35,
      peso: 500,
      estado: "Molido",
    },
    recipiente: "pote-1",
    volumen: 1,
  },
]

const dopesDisponiblesIniciales: Dope[] = [
  
  {
    id: 36,
    peso: 1000,
    estado: "Molido",
    recuperado: false,
  },
  {
    id: 37,
    peso: 850,
    estado: "Sin moler",
    recuperado: false,
  },
  {
    id: 38,
    peso: 1200,
    estado: "Molido",
    recuperado: false,
  },

  {
  id: 1019,
  peso: 35,
  estado: "Sin moler",
  recuperado: true,
  origen: "Extrusión #19",
  },

]

const DOPE_RECUPERADOS_KEY =
  "lab-organization-dope-recuperados"

export function Heladera() {
  const [dopesEnHeladera, setDopesEnHeladera] =
  useState<DopeHeladera[]>([])

  const [dopesDisponibles, setDopesDisponibles] =
    useState<Dope[]>(dopesDisponiblesIniciales)

   // Dialog para agregar
  const [agregarAbierto, setAgregarAbierto] =
    useState(false)

  const [dopeSeleccionado, setDopeSeleccionado] =
    useState<number | null>(null)

  const [recipienteSeleccionado, setRecipienteSeleccionado] =
    useState<Recipiente | null>(null)

  const [volumenOtro, setVolumenOtro] = useState("")

  // Dialog para sacar
  const [sacarAbierto, setSacarAbierto] =
    useState(false)

  const [dopeASacar, setDopeASacar] =
    useState<DopeHeladera | null>(null)

async function cargarDopesDisponibles() {
  
const { data, error } = await supabase
  .from("DOPE")
  .select("*")

if (error) {
  console.error("Error cargando DOPE disponibles:", error)
  return
}

const { data: almacenados, error: errorAlmacenados } =
  await supabase
    .from("DOPE_Heladera")
    .select("DOPE")

if (errorAlmacenados) {
  console.error("Error consultando DOPE almacenados:", errorAlmacenados)
  return
}

const idsAlmacenados = new Set(
  (almacenados ?? []).map((item) => Number(item.DOPE))
)

const dopes: Dope[] = (data ?? [])
  .filter((item) => !idsAlmacenados.has(Number(item.id)))
  .map((item) => ({
    id: Number(item.id),
    peso: Number(item.Peso ?? 0),
    estado: item.Estado,
    recuperado: item.Recuperado ?? false,
    origen:
      item.RecuperadoDe != null
        ? `Extrusión #${item.RecuperadoDe}`
        : undefined,
  }))

setDopesDisponibles(dopes)
}


async function cargarDopesEnHeladera() {
  const { data, error } = await supabase
    .from("DOPE_Heladera")
    .select(`
      DOPE,
      Volumen,
      TipoRecipiente,
      dope_datos:DOPE (
        id,
        Peso,
        Estado,
        Recuperado,
        RecuperadoDe
      )
    `)

  if (error) {
    console.error("Error cargando DOPE de la heladera:", error)
    alert("No se pudieron cargar los DOPE almacenados.")
    return
  }

  const dopes: DopeHeladera[] = (data ?? [])
    .flatMap((item) => {
      const relacionado = Array.isArray(item.dope_datos)
        ? item.dope_datos[0]
        : item.dope_datos

      if (!relacionado) {
        return []
      }

      return [{
        dope: {
          id: Number(relacionado.id),
          peso: Number(relacionado.Peso ?? 0),
          estado: relacionado.Estado,
          recuperado: relacionado.Recuperado ?? false,
          origen:
            relacionado.RecuperadoDe != null
              ? `Extrusión #${relacionado.RecuperadoDe}`
              : undefined,
        },
        recipiente: item.TipoRecipiente as Recipiente,
        volumen: Number(item.Volumen),
      }]
    })

  setDopesEnHeladera(dopes)
}

useEffect(() => {
  cargarDopesDisponibles()
  cargarDopesEnHeladera()
}, [])

  function abrirAgregar() {
    setDopeSeleccionado(null)
    setRecipienteSeleccionado(null)
    setVolumenOtro("")
    setAgregarAbierto(true)
  }

  
async function agregarDope() {
  if (
    dopeSeleccionado === null ||
    recipienteSeleccionado === null
  ) {
    return
  }

  const dope = dopesDisponibles.find(
    (item) => item.id === dopeSeleccionado
  )

  if (!dope) {
    return
  }

  const volumen =
    recipienteSeleccionado === "otro"
      ? Number(volumenOtro)
      : recipienteSeleccionado === "jarra-2"
        ? 2
        : 1

  if (!volumen || volumen <= 0) {
    alert("Ingresá un volumen válido.")
    return
  }

  // Buscar la heladera registrada en Supabase
  const { data: heladera, error: errorHeladera } =
    await supabase
      .from("Heladera")
      .select("id")
      .limit(1)
      .maybeSingle()

  if (errorHeladera) {
    console.error("Error buscando la heladera:", errorHeladera)
    alert("No se pudo consultar la heladera en Supabase.")
    return
  }

  if (!heladera) {
    alert(
      "No hay ninguna heladera registrada en la tabla Heladera."
    )
    return
  }

  // Guardar el DOPE en la heladera
  const { error } = await supabase
    .from("DOPE_Heladera")
    .insert({
      DOPE: dope.id,
      Volumen: volumen,
      Heladera: heladera.id,
      TipoRecipiente: recipienteSeleccionado,
    })

  if (error) {
    console.error("Error guardando DOPE en heladera:", error)
    alert(`No se pudo guardar el DOPE: ${error.message}`)
    return
  }

  // Actualizar la pantalla solo si Supabase guardó el registro
  setDopesEnHeladera((actuales) => [
    ...actuales,
    {
      dope,
      recipiente: recipienteSeleccionado,
      volumen,
    },
  ])

  setDopesDisponibles((actuales) =>
    actuales.filter((item) => item.id !== dope.id)
  )

  cerrarAgregar()
}

  function cerrarAgregar() {
    setAgregarAbierto(false)
    setDopeSeleccionado(null)
    setRecipienteSeleccionado(null)
    setVolumenOtro("")
  }

  function abrirSacar(dopeHeladera: DopeHeladera) {
    setDopeASacar(dopeHeladera)
    setSacarAbierto(true)
  }

  
async function sacarDope() {
  if (!dopeASacar) {
    return
  }

  // Eliminar el registro de la heladera en Supabase
  const { error } = await supabase
    .from("DOPE_Heladera")
    .delete()
    .eq("DOPE", dopeASacar.dope.id)

  if (error) {
    console.error("Error sacando DOPE de la heladera:", error)
    alert(`No se pudo sacar el DOPE: ${error.message}`)
    return
  }

  // Actualizar la pantalla solo si se eliminó correctamente
  setDopesEnHeladera((actuales) =>
    actuales.filter(
      (item) => item.dope.id !== dopeASacar.dope.id
    )
  )

  setDopesDisponibles((actuales) => {
    const yaExiste = actuales.some(
      (item) => item.id === dopeASacar.dope.id
    )

    if (yaExiste) {
      return actuales
    }

    return [...actuales, dopeASacar.dope].sort(
      (a, b) => a.id - b.id
    )
  })

  setSacarAbierto(false)
  setDopeASacar(null)
}


useEffect(() => {
  const recuperados = JSON.parse(
    localStorage.getItem(DOPE_RECUPERADOS_KEY) ?? "[]"
  ) as Dope[]

  if (recuperados.length > 0) {
    setDopesDisponibles((actuales) => {
      const idsActuales = new Set(
        actuales.map((dope) => dope.id)
      )

      const nuevos = recuperados.filter(
        (dope) => !idsActuales.has(dope.id)
      )

      return [...actuales, ...nuevos]
    })
  }
}, [])
console.log("DOPE disponibles:", dopesDisponibles)
  return (
    <>
      <div className="space-y-8">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Snowflake className="h-7 w-7" />

              <h2 className="text-3xl font-semibold tracking-tight">
                Heladera
              </h2>
            </div>

            <p className="mt-2 text-muted-foreground">
              DOPE almacenados actualmente en la heladera.
            </p>
          </div>

          <Button onClick={abrirAgregar}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar DOPE
          </Button>
        </div>

        {/* Contador */}
        <Card>
          <CardHeader>
            <CardDescription>
              DOPE almacenados
            </CardDescription>

            <CardTitle className="text-3xl">
              {dopesEnHeladera.length}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* DOPE almacenados */}
        {dopesEnHeladera.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
              <Snowflake className="mb-4 h-10 w-10 text-muted-foreground" />

              <p className="font-medium">
                La heladera está vacía
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Agregá un DOPE para comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {dopesEnHeladera.map((dopeHeladera) => (
              <DopeCard
                key={dopeHeladera.dope.id}
                dopeHeladera={dopeHeladera}
                onSacar={() =>
                  abrirSacar(dopeHeladera)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          DIALOG — AGREGAR DOPE
          ===================================================== */}
      <Dialog
        open={agregarAbierto}
        onOpenChange={(open) => {
          if (!open) {
            cerrarAgregar()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Agregar DOPE
            </DialogTitle>

            <DialogDescription>
              Seleccioná primero el DOPE y después el
              recipiente donde querés almacenarlo.
            </DialogDescription>
          </DialogHeader>

          {/* Selección del DOPE */}
          <div className="space-y-3">
            <Label>DOPE</Label>

            {dopesDisponibles.length === 0 ? (
              <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                No hay DOPE disponibles para almacenar.
              </div>
            ) : (
              <RadioGroup
                value={
                  dopeSeleccionado !== null
                    ? String(dopeSeleccionado)
                    : ""
                }
                onValueChange={(value) =>
                  setDopeSeleccionado(Number(value))
                }
                className="space-y-3"
              >
                {dopesDisponibles.map((dope) => (
                  <Label
                    key={dope.id}
                    htmlFor={`dope-${dope.id}`}
                    className="flex cursor-pointer items-center gap-4 rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <RadioGroupItem
                      value={String(dope.id)}
                      id={`dope-${dope.id}`}
                    />

                    
<div className="flex-1">
  <p className="font-medium">
    DOPE #{dope.id}
  </p>

  <p className="text-sm text-muted-foreground">
    {formatPeso(dope.peso)} · {dope.estado}
  </p>

  {dope.recuperado && dope.origen && (
    <p className="mt-1 text-xs text-muted-foreground">
      Recuperado de {dope.origen}
    </p>
  )}
</div>

                  </Label>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Selección del recipiente */}
          {dopeSeleccionado !== null && (
            <div className="mt-2 space-y-3">
              <Label>Recipiente</Label>

              <RadioGroup
                value={recipienteSeleccionado ?? ""}
                onValueChange={(value) =>
                  setRecipienteSeleccionado(
                    value as Recipiente
                  )
                }
                className="grid grid-cols-2 gap-3"
              >
                <RecipienteOption
                  value="jarra-1"
                  label="Jarra 1 L"
                  selected={
                    recipienteSeleccionado === "jarra-1"
                  }
                />

                <RecipienteOption
                  value="jarra-2"
                  label="Jarra 2 L"
                  selected={
                    recipienteSeleccionado === "jarra-2"
                  }
                />

                <RecipienteOption
                  value="pote-1"
                  label="Pote"
                  selected={
                    recipienteSeleccionado === "pote-1"
                  }
                />

                <RecipienteOption
                  value="otro"
                  label="Otro"
                  selected={
                    recipienteSeleccionado === "otro"
                  }
                />
              </RadioGroup>

              {/* Volumen personalizado */}
              {recipienteSeleccionado === "otro" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="volumen-otro">
                    Volumen
                  </Label>

                  <div className="flex items-center gap-2">
                    <Input
                      id="volumen-otro"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ingresar volumen"
                      value={volumenOtro}
                      onChange={(event) =>
                        setVolumenOtro(event.target.value)
                      }
                    />

                    <span className="text-sm text-muted-foreground">
                      L
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cerrarAgregar}
            >
              Cancelar
            </Button>

            <Button
              onClick={agregarDope}
              disabled={
                dopeSeleccionado === null ||
                recipienteSeleccionado === null ||
                (recipienteSeleccionado === "otro" &&
                  (!volumenOtro ||
                    Number(volumenOtro) <= 0))
              }
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          DIALOG — SACAR DOPE
          ===================================================== */}
      <Dialog
        open={sacarAbierto}
        onOpenChange={(open) => {
          if (!open) {
            setSacarAbierto(false)
            setDopeASacar(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Sacar DOPE de la heladera
            </DialogTitle>

            <DialogDescription>
              ¿Querés sacar el DOPE #
              {dopeASacar?.dope.id} de la heladera?
            </DialogDescription>
          </DialogHeader>

          {dopeASacar && (
            <div className="rounded-lg border p-4">
              <p className="font-medium">
                DOPE #{dopeASacar.dope.id}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {formatPeso(dopeASacar.dope.peso)} ·{" "}
                {dopeASacar.dope.estado}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {getNombreRecipiente(
                  dopeASacar.recipiente
                )}{" "}
                · {dopeASacar.volumen} L
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSacarAbierto(false)
                setDopeASacar(null)
              }}
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={sacarDope}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sacar de heladera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* =========================================================
   TARJETA DE DOPE EN HELADERA
   ========================================================= */

function DopeCard({
  dopeHeladera,
  onSacar,
}: {
  dopeHeladera: DopeHeladera
  onSacar: () => void
}) {
  const { dope, recipiente, volumen } = dopeHeladera

  return (
    <Card className="overflow-hidden">
      {/* Dibujo del recipiente */}
      <div className="flex h-56 items-center justify-center bg-muted/20">
        <RecipientePlaceholder
          recipiente={recipiente}
        />
      </div>

      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            DOPE #{dope.id}
          </CardTitle>

          <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
            {dope.estado}
          </span>
        </div>

        <CardDescription>
          {getNombreRecipiente(recipiente)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">
              Peso
            </p>

            <p className="font-medium">
              {formatPeso(dope.peso)}
            </p>
          </div>
{dope.recuperado && dope.origen && (
  <p className="mt-1 text-xs text-muted-foreground">
    Recuperado de {dope.origen}
  </p>
)}
          <div>
            <p className="text-muted-foreground">
              Volumen
            </p>

            <p className="font-medium">
              {volumen} L
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onSacar}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Sacar de heladera
        </Button>
      </CardContent>
    </Card>
  )
}

/* =========================================================
   OPCIÓN DE RECIPIENTE
   ========================================================= */

function RecipienteOption({
  value,
  label,
  selected,
}: {
  value: Recipiente
  label: string
  selected: boolean
}) {
  return (
    <Label
      htmlFor={`recipiente-${value}`}
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-28 items-center justify-center">
          <RecipientePlaceholder
            recipiente={value}
          />
        </div>

        <div className="flex items-center gap-2">
          <RadioGroupItem
            value={value}
            id={`recipiente-${value}`}
          />

          <span className="font-medium">
            {label}
          </span>
        </div>
      </div>
    </Label>
  )
}

/* =========================================================
   PLACEHOLDERS DE LOS RECIPIENTES

   Estos dibujos son temporales.
   Cuando tengas los dibujos finales podemos reemplazar
   solamente esta función sin tocar la lógica.
   ========================================================= */

function RecipientePlaceholder({
  recipiente,
}: {
  recipiente: Recipiente
}) {
  if (recipiente === "pote-1") {
    return (
      <div className="relative flex h-32 w-36 flex-col items-center justify-center">
        <div className="h-8 w-36 rounded-full border-4 border-muted-foreground/40 bg-muted" />

        <div className="h-24 w-32 rounded-b-2xl border-4 border-t-0 border-muted-foreground/40 bg-muted" />
      </div>
    )
  }

  if (recipiente === "jarra-2") {
    return (
      <div className="relative flex h-40 w-24 flex-col items-center justify-center">
        <div className="h-8 w-20 rounded-full border-4 border-muted-foreground/40 bg-muted" />

        <div className="h-32 w-20 rounded-b-[30%] border-4 border-t-0 border-muted-foreground/40 bg-muted" />
      </div>
    )
  }

  if (recipiente === "otro") {
    return (
      <div className="flex h-40 w-24 flex-col items-center justify-center">
        <div className="h-8 w-24 rounded-md border-4 border-muted-foreground/40 bg-muted" />

        <div className="h-32 w-20 rounded-b-lg border-4 border-t-0 border-muted-foreground/40 bg-muted" />
      </div>
    )
  }

  // Jarra 1 L
  return (
    <div className="flex h-36 w-24 flex-col items-center justify-center">
      <div className="h-8 w-20 rounded-full border-4 border-muted-foreground/40 bg-muted" />

      <div className="h-28 w-20 rounded-b-[30%] border-4 border-t-0 border-muted-foreground/40 bg-muted" />
    </div>
  )
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function getNombreRecipiente(
  recipiente: Recipiente
) {
  switch (recipiente) {
    case "jarra-1":
      return "Jarra 1 L"

    case "jarra-2":
      return "Jarra 2 L"

    case "pote-1":
      return "Pote"

    case "otro":
      return "Otro recipiente"
  }
}

function formatPeso(peso: number) {
  if (peso >= 1000) {
    return `${(peso / 1000).toFixed(2)} kg`
  }

  return `${peso} g`
}

