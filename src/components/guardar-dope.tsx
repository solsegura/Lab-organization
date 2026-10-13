
import { useState } from "react"
import { ArrowLeft, Snowflake } from "lucide-react"

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

type AccionDope = "heladera" | "sin-heladera"

type Recipiente =
  | "jarra-1"
  | "jarra-2"
  | "pote-1"
  | "otro"

type GuardarDopeProps = {
  onBack: () => void
}

export function GuardarDope({ onBack }: GuardarDopeProps) {
  const [accion, setAccion] =
    useState<AccionDope>("heladera")

  const [recipiente, setRecipiente] =
    useState<Recipiente>("jarra-1")

  const [volumenOtro, setVolumenOtro] =
    useState("")

  return (
    <div className="max-w-5xl space-y-8">
      {/* Encabezado */}
      <div>
        <Button
          variant="ghost"
          className="-ml-3 mb-4"
          onClick={onBack}
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
          >
            {/* Heladera */}
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
                  El DOPE quedará registrado y asociado a un
                  recipiente de la heladera.
                </p>
              </div>
            </Label>

            {/* Sin heladera */}
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
                  El DOPE se registra pero no se almacena en
                  la heladera.
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
              Elegí el recipiente donde se va a almacenar el
              DOPE.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-8 md:grid-cols-[280px_1fr]">
              {/* Dibujo */}
              <div className="flex min-h-[300px] items-center justify-center rounded-lg border bg-muted/20">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-40 w-28 items-center justify-center rounded-[40%] border-4 border-muted-foreground/40 bg-muted">
                    <div className="h-28 w-16 rounded-[35%] border-2 border-muted-foreground/30" />
                  </div>

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

                {/* Volumen personalizado */}
                {recipiente === "otro" && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="volumen-otro">
                      Volumen del recipiente
                    </Label>

                    <div className="flex items-center gap-2">
                      <Input
                        id="volumen-otro"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Ej. 1.5"
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acción final */}
      <div className="flex justify-end">
        <Button>
          {accion === "heladera"
            ? "Guardar en heladera"
            : "Registrar DOPE"}
        </Button>
      </div>
    </div>
  )
}

function getNombreRecipiente(
  recipiente: Recipiente
) {
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
      <RadioGroupItem
        value={value}
        id={id}
      />

      <div>
        <div className="font-medium">
          {title}
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </Label>
  )
}
