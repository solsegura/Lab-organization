
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FlaskConical,
  Upload,
  Eye,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Geometria = "flat" | "kidney-shape" | "circular";

type Dope = {
  id: number;
  Peso?: number | null;
  MasaRestante?: number | null;
  Estado?: string | null;
  Recuperado?: boolean | null;
  [key: string]: unknown;
};

type ExtrusionRegistro = {
  id: number;
  Fecha: string | null;
  DOPE: number | null;
  Fibras: number;
  CantDOPE: number | null;
  PDF: string | null;
  FormacionFibras: boolean | null;
  fibra?: {
    id: number;
    Peso: number | null;
    Fecha: string;
    Geometria: string | null;
  } | null;
  Geometria: string
  dope?: Dope | null;
};

type ExtrusionProps = {
  onBack: () => void;
};

const PDF_BUCKET = "extrusion-pdfs";

const geometriaLabels: Record<Geometria, string> = {
  flat: "Flat",
  "kidney-shape": "Kidney Shape",
  circular: "Circular",
};

function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—";

  const [year, month, day] = fecha.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatNumero(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";

  return Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  });
}

export function Extrusion({ onBack }: ExtrusionProps) {
  const [dopes, setDopes] = useState<Dope[]>([]);
  const [extrusiones, setExtrusiones] = useState<ExtrusionRegistro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [detalle, setDetalle] = useState<ExtrusionRegistro | null>(null);

  const [fecha, setFecha] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [dopeId, setDopeId] = useState("");
  const [geometria, setGeometria] = useState<Geometria>("circular");
  const [cantidadDope, setCantidadDope] = useState("");
  const [formacionFibras, setFormacionFibras] = useState(true);
  const [dopeRecuperado, setDopeRecuperado] = useState(false);
  const [cantidadRecuperada, setCantidadRecuperada] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [dopesResult, heladeraResult, extrusionesResult, fibrasResult] =
        await Promise.all([
          supabase.from("DOPE").select("*"),
          supabase.from("DOPE_Heladera").select('"DOPE"'),
          supabase
            .from("ExtrusionFibras")
            .select("*")
            .order("id", { ascending: false }),
          supabase.from("Fibras").select("*"),
        ]);

      if (dopesResult.error) throw dopesResult.error;
      if (heladeraResult.error) throw heladeraResult.error;
      if (extrusionesResult.error) throw extrusionesResult.error;
      if (fibrasResult.error) throw fibrasResult.error;

      const todosLosDopes = (dopesResult.data ?? []) as Dope[];
      const idsEnHeladera = new Set(
        (heladeraResult.data ?? [])
          .map((item: Record<string, unknown>) => Number(item.DOPE))
          .filter(Number.isFinite),
      );

      const dopesDisponibles = todosLosDopes.filter((dope) => {
        const estado = String(dope.Estado ?? "").toLowerCase();
        const restante = dope.MasaRestante;

        return (
          idsEnHeladera.has(dope.id) &&
          estado !== "extruido" &&
          (restante == null || Number(restante) > 0)
        );
      });

      const fibras = (fibrasResult.data ?? []) as Array<{
        id: number;
        Peso: number | null;
        Fecha: string;
        Geometria: string | null;
      }>;

      const mapaDopes = new Map(todosLosDopes.map((d) => [d.id, d]));
      const mapaFibras = new Map(fibras.map((f) => [f.id, f]));

      const registros = ((extrusionesResult.data ?? []) as ExtrusionRegistro[])
        .map((registro) => ({
          ...registro,
          dope: registro.DOPE ? mapaDopes.get(registro.DOPE) ?? null : null,
          fibra: mapaFibras.get(registro.Fibras) ?? null,
        }));

      setDopes(dopesDisponibles);
      setExtrusiones(registros);

      if (
        dopeId &&
        !dopesDisponibles.some((dope) => String(dope.id) === dopeId)
      ) {
        setDopeId("");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los datos de Supabase.",
      );
    } finally {
      setCargando(false);
    }
  }, [dopeId]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  async function subirPDF(extrusionId: number) {
    if (!pdf) return null;

    const extension = pdf.name.split(".").pop()?.toLowerCase();
    if (extension !== "pdf" || pdf.type !== "application/pdf") {
      throw new Error("El archivo adjunto debe ser un PDF.");
    }

    const ruta = `${extrusionId}/${Date.now()}-${pdf.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    )}`;

    const { error: uploadError } = await supabase.storage
      .from(PDF_BUCKET)
      .upload(ruta, pdf, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return ruta;
  }

  async function registrarExtrusion(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  console.log("Datos del formulario:", {
  fecha,
  dopeId,
  geometria,
  cantidadDope,
  formacionFibras,
  dopeRecuperado,
  cantidadRecuperada,
});
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!dopeId) {
  setError("Seleccioná el DOPE utilizado.");
  return;
}

if (!geometria) {
  setError("Seleccioná una geometría.");
  return;
}

if (!cantidadDope.trim()) {
  setError("Ingresá la cantidad de DOPE utilizada.");
  return;
}



const cantidad = Number(cantidadDope);

if (!Number.isFinite(cantidad) || cantidad <= 0) {
  setError("La cantidad de DOPE debe ser mayor que cero.");
  return;
}

    const recuperada = dopeRecuperado
      ? Number(cantidadRecuperada)
      : null;

    if (
      dopeRecuperado &&
      (!Number.isFinite(recuperada) || recuperada! <= 0)
    ) {
      setError("Ingresá una cantidad recuperada válida, mayor que cero.");
      return;
    }

    if (!fecha) {
      setError("Seleccioná la fecha de extrusión.");
      return;
    }

    setGuardando(true);

    try {
      // El trigger de la base de datos gestiona la relación con Fibras
      // y la actualización de la cantidad restante del DOPE.
      const { data: nuevaExtrusion, error: insertError } = await supabase
        .from("ExtrusionFibras")
        .insert({
  Fecha: fecha,
  DOPE: Number(dopeId),
  CantDOPE: cantidad,
  FormacionFibras: formacionFibras,
  Geometria: geometria,
})
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (pdf) {
        try {
          const rutaPDF = await subirPDF(Number(nuevaExtrusion.id));

          const { error: pdfError } = await supabase
            .from("ExtrusionFibras")
            .update({ PDF: rutaPDF })
            .eq("id", nuevaExtrusion.id);

          if (pdfError) throw pdfError;
        } catch (pdfError) {
          throw new Error(
            `La extrusión se guardó, pero no se pudo adjuntar el PDF: ${
              pdfError instanceof Error
                ? pdfError.message
                : "error desconocido"
            }`,
          );
        }
      }

      // El DOPE recuperado se registra como un nuevo DOPE relacionado
      // con esta extrusión. La cantidad restante del DOPE original
      // ya la gestiona el trigger de la base de datos.
      if (dopeRecuperado && recuperada != null) {
        const { error: recuperadoError } = await supabase.from("DOPE").insert({
  Peso: recuperada,
  MasaRestante: recuperada,
  FechaPreparacion: fecha,
  Estado: "sin moler",
  Recuperado: true,
  RecuperadoDe: nuevaExtrusion.id,
});

        if (recuperadoError) {
          throw new Error(
            `La extrusión se guardó, pero no se pudo registrar el DOPE recuperado: ${recuperadoError.message}`,
          );
        }
      }

      setMensaje("Extrusión registrada correctamente.");
      setCantidadDope("");
      setFormacionFibras(true);
      setDopeRecuperado(false);
      setCantidadRecuperada("");
      setPdf(null);

      const archivoInput = document.getElementById(
        "extrusion-pdf",
      ) as HTMLInputElement | null;
      if (archivoInput) archivoInput.value = "";

      await cargarDatos();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo registrar la extrusión.",
      );
      await cargarDatos();
    } finally {
      setGuardando(false);
    }
  }

  async function abrirPDF(registro: ExtrusionRegistro) {
    if (!registro.PDF) return;

    // Si se guardó una URL completa, se abre directamente.
    if (/^https?:\/\//i.test(registro.PDF)) {
      window.open(registro.PDF, "_blank", "noopener,noreferrer");
      return;
    }

    const { data, error: pdfError } = await supabase.storage
      .from(PDF_BUCKET)
      .createSignedUrl(registro.PDF, 60);

    if (pdfError || !data?.signedUrl) {
      setError(
        pdfError?.message ?? "No se pudo generar el enlace para el PDF.",
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
const dopeSeleccionado = dopes.find(
  (dope) => String(dope.id) === dopeId
)
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border p-2 transition hover:bg-muted"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Extrusión</h1>
          <p className="text-sm text-muted-foreground">
            Registro de extrusiones y seguimiento de fibras.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarDatos()}
          className="rounded-xl border p-2 transition hover:bg-muted"
          title="Actualizar datos"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {mensaje}
        </div>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-muted p-3">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Registrar extrusión</h2>
            <p className="text-sm text-muted-foreground">
              Seleccioná el DOPE y completá los parámetros del proceso.
            </p>
          </div>
        </div>

        <form onSubmit={registrarExtrusion} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Fecha de extrusión
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              DOPE utilizado
              <select
                value={dopeId}
                onChange={(e) => setDopeId(e.target.value)}
                required
                className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
              >
                <option value="">
                  {cargando ? "Cargando DOPE..." : "Seleccionar DOPE"}
                </option>
                {dopes.map((dope) => (
                  <option key={dope.id} value={dope.id}>
                    DOPE #{dope.id}
                    {dope.Peso != null ? ` · ${formatNumero(dope.Peso)} g` : ""}
                    {dope.MasaRestante != null
                      ? ` · Restante: ${formatNumero(dope.MasaRestante)} g`
                      : ""}
                  </option>
                ))}
              </select>
              {!cargando && dopes.length === 0 && (
                <span className="block text-xs font-normal text-muted-foreground">
                  No hay DOPE disponible en la heladera.
                </span>
              )}
            </label>

            <label className="space-y-2 text-sm font-medium">
              Geometría
              <select
                value={geometria}
                onChange={(e) => setGeometria(e.target.value as Geometria)}
                required
                className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
              >
                <option value="flat">Flat</option>
                <option value="kidney-shape">Kidney Shape</option>
                <option value="circular">Circular</option>
              </select>
            </label>

            
<label className="space-y-2 text-sm font-medium">
  <div className="flex items-center justify-between gap-3">
    <span>Cantidad de DOPE utilizada (g)</span>

    <button
      type="button"
      disabled={
        dopeSeleccionado?.MasaRestante == null ||
        Number(dopeSeleccionado.MasaRestante) <= 0
      }
      onClick={() => {
        if (dopeSeleccionado?.MasaRestante != null) {
          setCantidadDope(String(dopeSeleccionado.MasaRestante))
        }
      }}
      className="text-xs font-medium text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Usar todo (
      {dopeSeleccionado?.MasaRestante != null
        ? `${formatNumero(dopeSeleccionado.MasaRestante)} g`
        : "—"}
      )
    </button>
  </div>

  <input
    type="number"
    min="0.001"
    step="any"
    value={cantidadDope}
    onChange={(e) => setCantidadDope(e.target.value)}
    required
    placeholder="Ej. 25"
    className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
  />
</label>
```
          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">¿Se formaron fibras?</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFormacionFibras(true)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  formacionFibras
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                Sí, se formaron
              </button>
              <button
                type="button"
                onClick={() => setFormacionFibras(false)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  !formacionFibras
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                No se formaron
              </button>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={dopeRecuperado}
                onChange={(e) => setDopeRecuperado(e.target.checked)}
                className="h-4 w-4"
              />
              Se recuperó DOPE después de la extrusión
            </label>

            {dopeRecuperado && (
              <label className="mt-4 block space-y-2 text-sm font-medium">
                Cantidad de DOPE recuperada (g)
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={cantidadRecuperada}
                  onChange={(e) => setCantidadRecuperada(e.target.value)}
                  required
                  placeholder="Peso recuperado"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
                />
              </label>
            )}
          </div>

          <label className="block space-y-2 text-sm font-medium">
            PDF del registro (opcional)
            <span className="flex items-center gap-3 rounded-xl border border-dashed p-4 font-normal">
              <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <input
                  id="extrusion-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
                {pdf && (
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {pdf.name}
                  </span>
                )}
              </span>
            </span>
          </label>

          

          <button
            type="submit"
            disabled={guardando || cargando || dopes.length === 0}
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Guardando extrusión..." : "Registrar extrusión"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-semibold">Extrusiones anteriores</h2>
            <p className="text-sm text-muted-foreground">
              {extrusiones.length}{" "}
              {extrusiones.length === 1 ? "registro" : "registros"}
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
            Cargando extrusiones...
          </div>
        ) : extrusiones.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay extrusiones registradas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {extrusiones.map((registro) => (
              <article
                key={registro.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Extrusión #{registro.id}
                    </p>
                    <h3 className="mt-1 font-semibold">
                      DOPE #{registro.DOPE ?? "—"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatFecha(registro.Fecha)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      registro.FormacionFibras
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {registro.FormacionFibras
                      ? "Con fibras"
                      : "Sin fibras"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Geometría</p>
                    <p className="mt-1 font-medium">
                      {registro.Geometria
                        ? geometriaLabels[
                            registro.Geometria as Geometria
                          ] ?? registro.Geometria
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">DOPE usado</p>
                    <p className="mt-1 font-medium">
                      {formatNumero(registro.CantDOPE)} g
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetalle(registro)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalles
                  </button>

                  {registro.PDF && (
                    <button
                      type="button"
                      onClick={() => void abrirPDF(registro)}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Abrir PDF
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetalle(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-extrusion-titulo"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="detalle-extrusion-titulo"
                  className="text-xl font-semibold"
                >
                  Extrusión #{detalle.id}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Detalle del registro
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cerrar
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="text-right font-medium">
                  {formatFecha(detalle.Fecha)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">DOPE utilizado</dt>
                <dd className="text-right font-medium">
                  #{detalle.DOPE ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Cantidad utilizada</dt>
                <dd className="text-right font-medium">
                  {formatNumero(detalle.CantDOPE)} g
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Formación de fibras</dt>
                <dd className="text-right font-medium">
                  {detalle.FormacionFibras ? "Sí" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Geometría</dt>
                <dd className="text-right font-medium">
                  {detalle.fibra?.Geometria
                    ? geometriaLabels[
                        detalle.fibra.Geometria as Geometria
                      ] ?? detalle.fibra.Geometria
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Peso de las fibras</dt>
                <dd className="text-right font-medium">
                  {formatNumero(detalle.fibra?.Peso)} g
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">PDF adjunto</dt>
                <dd className="text-right font-medium">
                  {detalle.PDF ? "Sí" : "No"}
                </dd>
              </div>
            </dl>

            {detalle.PDF && (
              <button
                type="button"
                onClick={() => void abrirPDF(detalle)}
                className="mt-5 w-full rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Abrir PDF adjunto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Extrusion;