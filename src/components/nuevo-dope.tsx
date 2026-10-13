
import { ArrowLeft, Upload } from "lucide-react"

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

type NuevoDopeProps = {
  onBack: () => void
  onContinue: () => void
}

export function NuevoDope({
  onBack,
  onContinue,
}: NuevoDopeProps)  {
  const today = new Date().toISOString().split("T")[0]

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
              defaultValue={today}
            />
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
                accept=".pdf"
              />

              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continuar */}
      <div className="flex justify-end">
       <Button onClick={onContinue}>
  Continuar
</Button>
      </div>
    </div>
  )
}
