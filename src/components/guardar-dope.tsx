import { useState } from "react"
import { ArrowLeft, Snowflake } from "lucide-react"

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
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"

import type { DatosNuevoDope } from "./nuevo-dope"

type AccionDope = "heladera" | "sin-heladera"

type Recipiente =
  | "jarra-1"
  | "jarra-2"
  | "pote-1"
  | "otro"

type GuardarDopeProps = {
  onBack: () => void
  datos: DatosNuevoDope
}

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

export function GuardarDope({
  onBack,
  datos,
}: GuardarDopeProps) {
  const [accion, setAccion] =
    useState<AccionDope>("heladera")

  const [recipiente, setRecipiente] =
    useState<Recipiente>("jarra-1")

  const [volumenOtro, setVolumenOtro] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [errorGuardado, setErrorGuardado] = useState(false)

  async function guardarDope() {
    setMensaje("")
    setErrorGuardado(false)

    if (
      accion === "heladera" &&
      recipiente === "otro" &&
      (!volumenOtro || !Number.isFinite(Number(volumenOtro)) ||
        Number(volumenOtro) <= 0)
    ) {
      setMensaje("Ingresá un volumen válido para el recipiente.")
      setErrorGuardado(true)
      return
    }

    const volumen =
      recipiente === "jarra-1" || recipiente === "pote-1"
        ? 1
        : recipiente === "jarra-2"
          ? 2
          : Number(volumenOtro)

    setGuardando(true)

    try {
      console.log("Datos enviados a guardar_nuevo_dope:", {
  nmmoId: datos.nmmoId,
  celulosaId: datos.celulosaId,
  masaNMMO: datos.masaNMMO,
  masaCelulosa: datos.masaCelulosa,
})
      const { data: dopeId, error } = await supabase.rpc(
        "guardar_nuevo_dope",
        {
          p_fecha: datos.fecha,
          p_peso: datos.peso.trim()
            ? Number(datos.peso)
            : null,
          p_concentracion_teorica:
            datos.concentracionCelulosa.trim()
              ? Number(datos.concentracionCelulosa)
              : null,
          p_concentracion_medida:
            datos.concentracionMedida.trim()
              ? Number(datos.concentracionMedida)
              : null,
          p_estado: datos.estado,
          p_nmmo_id: datos.nmmoId,
          p_masa_nmmo: Number(datos.masaNMMO),
          p_celulosa_id: datos.celulosaId,
          p_masa_celulosa: Number(datos.masaCelulosa),
          p_guardar_heladera: accion === "heladera",
          p_tipo_recipiente:
            accion === "heladera" ? recipiente : null,
          p_volumen: accion === "heladera" ? volumen : null,
          p_pdf: null,
        }
      )

      if (error) {
  throw error
}

let mensajeFinal =
  `¡DOPE registrado correctamente! Número de registro: ${dopeId}.`

if (datos.pdf) {
  const nombreSeguro = datos.pdf.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")

  const rutaPdf =
    `dope-${dopeId}/${Date.now()}-${nombreSeguro}`

  // Subir el PDF al bucket
  const { error: errorSubida } = await supabase.storage
    .from("preparacion-pdf")
    .upload(rutaPdf, datos.pdf, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (errorSubida) {
    console.error("Error al subir el PDF:", errorSubida)

    setMensaje(
      `El DOPE #${dopeId} se guardó correctamente, pero no se pudo subir el PDF: ${errorSubida.message}`
    )
    setErrorGuardado(true)
    return
  }

  // Vincular el archivo con el registro de preparación
  const { error: errorVinculo } = await supabase
    .from("PreparacionDOPE")
    .update({ PDF: rutaPdf })
    .eq("DOPE", Number(dopeId))

  if (errorVinculo) {
    console.error("Error al vincular el PDF:", errorVinculo)

    await supabase.storage
      .from("preparacion-pdf")
      .remove([rutaPdf])

    setMensaje(
      `El DOPE #${dopeId} se guardó, pero no se pudo vincular el PDF: ${errorVinculo.message}`
    )
    setErrorGuardado(true)
    return
  }

  mensajeFinal += " PDF adjuntado correctamente."
}

setMensaje(mensajeFinal)
    } catch (error) {
      console.error("Error al guardar el DOPE:", error)

      const detalle =
        error instanceof Error
          ? error.message
          : "Error desconocido"

      setMensaje(`No se pudo guardar el DOPE: ${detalle}`)
      setErrorGuardado(true)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Encabezado */}
      <div>
        <Button
          variant="ghost"
          className="-ml-3 mb-4"
          onClick={onBack}
          disabled={guardando}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <h2 className="text-3xl font-semibold tracking-tight">
          Guardar DOPE
        </h2>

        <p className="mt-2 text-muted-foreground">
          Indicá qué querés hacer con el DOPE preparado.
        </p>
      </div>

      {/* Decisión */}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué querés hacer?</CardTitle>
          <CardDescription>
            Podés guardar el DOPE en la heladera o registrarlo
            sin almacenarlo.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <RadioGroup
            value={accion}
            onValueChange={(value) =>
              setAccion(value as AccionDope)
            }
            className="grid gap-4 md:grid-cols-2"
            disabled={guardando}
          >
            <Label
              htmlFor="guardar-heladera"
              className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <RadioGroupItem
                value="heladera"
                id="guardar-heladera"
              />

              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Snowflake className="h-4 w-4" />
                  Guardar en heladera
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  El DOPE quedará asociado a un recipiente
                  de la heladera.
                </p>
              </div>
            </Label>

            <Label
              htmlFor="sin-heladera"
              className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <RadioGroupItem
                value="sin-heladera"
                id="sin-heladera"
              />

              <div>
                <div className="font-medium">
                  Registrar DOPE sin llevar a heladera
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  El DOPE se registra sin asociarlo a un
                  recipiente de la heladera.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Selección de recipiente */}
      {accion === "heladera" && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar recipiente</CardTitle>
            <CardDescription>
              Elegí dónde se va a almacenar el DOPE.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-8 md:grid-cols-[280px_1fr]">
              {/* Dibujo */}
              <div className="flex min-h-[300px] items-center justify-center rounded-lg border bg-muted/20">
                <div className="text-center">
                  <RecipientePlaceholder recipiente={recipiente} />

                  <p className="text-sm text-muted-foreground">
                    {getNombreRecipiente(recipiente)}
                  </p>
                </div>
              </div>

              {/* Opciones */}
              <div className="space-y-4">
                <RadioGroup
                  value={recipiente}
                  onValueChange={(value) =>
                    setRecipiente(value as Recipiente)
                  }
                  className="grid gap-3"
                  disabled={guardando}
                >
                  <RecipienteOption
                    value="jarra-1"
                    id="jarra-1"
                    title="Jarra 1 L"
                    description="Jarra de laboratorio de 1 litro."
                  />

                  <RecipienteOption
                    value="jarra-2"
                    id="jarra-2"
                    title="Jarra 2 L"
                    description="Jarra de laboratorio de 2 litros."
                  />

                  <RecipienteOption
                    value="pote-1"
                    id="pote-1"
                    title="Pote 1 L"
                    description="Pote cilíndrico de 1 litro."
                  />

                  <RecipienteOption
                    value="otro"
                    id="otro"
                    title="Otro"
                    description="Otro recipiente."
                  />
                </RadioGroup>

                {recipiente === "otro" && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="volumen-otro">
                      Volumen del recipiente
                    </Label>

                    <div className="flex items-center gap-2">
                      <Input
                        id="volumen-otro"
                        type="number"
                        min="0.1"
                        step="0.1"
                        placeholder="Ej. 1.5"
                        value={volumenOtro}
                        onChange={(event) =>
                          setVolumenOtro(event.target.value)
                        }
                        disabled={guardando}
                      />

                      <span className="text-sm text-muted-foreground">
                        L
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {mensaje && (
        <div
          role={errorGuardado ? "alert" : "status"}
          className={`rounded-lg border p-4 text-sm ${
            errorGuardado
              ? "border-destructive text-destructive"
              : "border-green-600 text-green-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Acción final */}
      <div className="flex justify-end">
        <Button
          className="bg-[#fc008e] text-white hover:bg-[#d9007a]"
          onClick={guardarDope}
          disabled={guardando}
        >
          {guardando
            ? "Guardando..."
            : accion === "heladera"
              ? "Guardar en heladera"
              : "Registrar DOPE"}
        </Button>
      </div>
    </div>
  )
}

function getNombreRecipiente(recipiente: Recipiente) {
  switch (recipiente) {
    case "jarra-1":
      return "Jarra 1 L"
    case "jarra-2":
      return "Jarra 2 L"
    case "pote-1":
      return "Pote 1 L"
    case "otro":
      return "Otro recipiente"
  }
}

type RecipienteOptionProps = {
  value: Recipiente
  id: string
  title: string
  description: string
}

function RecipienteOption({
  value,
  id,
  title,
  description,
}: RecipienteOptionProps) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <RadioGroupItem value={value} id={id} />

      <div>
        <div className="font-medium">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </Label>
  )
}