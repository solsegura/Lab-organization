
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
import { AccentLine } from "@/components/accent-line"

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
  Fibras: number | null;
  CantDOPE: number | null;
  dopesUsados?: Array<{
    dope_id: number;
    CantDOPE: number;
    dope: Dope | null;
  }>;
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
  const [subiendoPDFId, setSubiendoPDFId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [detalle, setDetalle] = useState<ExtrusionRegistro | null>(null);

  const [fecha, setFecha] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [dopesUsados, setDopesUsados] = useState([
    { dopeId: "", cantidad: "" },
  ]);
  const [geometria, setGeometria] = useState<Geometria>("circular");
  const [formacionFibras, setFormacionFibras] = useState(true);
  const [dopeRecuperado, setDopeRecuperado] = useState(false);
  const [cantidadRecuperada, setCantidadRecuperada] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [
        dopesResult,
        heladeraResult,
        extrusionesResult,
        fibrasResult,
        relacionesResult,
      ] = await Promise.all([
        supabase.from("DOPE").select("*"),
        supabase.from("DOPE_Heladera").select('"DOPE"'),
        supabase
          .from("ExtrusionFibras")
          .select("*")
          .order("id", { ascending: false }),
        supabase.from("Fibras").select("*"),
        supabase.from("DOPE_Extrusion").select("*"),
      ]);

      if (dopesResult.error) throw dopesResult.error;
      if (heladeraResult.error) throw heladeraResult.error;
      if (extrusionesResult.error) throw extrusionesResult.error;
      if (fibrasResult.error) throw fibrasResult.error;
      if (relacionesResult.error) throw relacionesResult.error;

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
      const relacionesPorExtrusion = new Map<
        number,
        Array<{ dope_id: number; CantDOPE: number; dope: Dope | null }>
      >();

      for (const relacion of (relacionesResult.data ?? []) as Array<{
        extrusion_id: number;
        dope_id: number;
        CantDOPE: number;
      }>) {
        const lista = relacionesPorExtrusion.get(relacion.extrusion_id) ?? [];
        lista.push({
          dope_id: relacion.dope_id,
          CantDOPE: relacion.CantDOPE,
          dope: mapaDopes.get(relacion.dope_id) ?? null,
        });
        relacionesPorExtrusion.set(relacion.extrusion_id, lista);
      }

      const registros = ((extrusionesResult.data ?? []) as ExtrusionRegistro[])
        .map((registro) => ({
          ...registro,
          dopesUsados:
            relacionesPorExtrusion.get(registro.id) ??
            (registro.DOPE != null && registro.CantDOPE != null
              ? [{
                  dope_id: registro.DOPE,
                  CantDOPE: registro.CantDOPE,
                  dope: mapaDopes.get(registro.DOPE) ?? null,
                }]
              : []),
          fibra: registro.Fibras != null
            ? mapaFibras.get(registro.Fibras) ?? null
            : null,
        }));

      setDopes(dopesDisponibles);
      setExtrusiones(registros);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los datos de Supabase.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  
async function subirPDF(extrusionId: number, archivo: File) {
  const extension = archivo.name.split(".").pop()?.toLowerCase();

  if (extension !== "pdf" || archivo.type !== "application/pdf") {
    throw new Error("El archivo adjunto debe ser un PDF.");
  }

  const ruta = `${extrusionId}/${Date.now()}-${archivo.name.replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  )}`;

  const { error: uploadError } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(ruta, archivo, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  return ruta;
}


  async function registrarExtrusion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMensaje("");

    const cantidades = dopesUsados.map((item) => ({
      dope_id: Number(item.dopeId),
      cantidad: Number(item.cantidad),
    }));

    if (
      cantidades.length === 0 ||
      dopesUsados.some((item) => !item.dopeId || !item.cantidad.trim())
    ) {
      setError("Seleccioná cada DOPE utilizado e ingresá su cantidad.");
      return;
    }

    if (
      cantidades.some(
        (item) =>
          !Number.isInteger(item.dope_id) ||
          item.dope_id <= 0 ||
          !Number.isFinite(item.cantidad) ||
          item.cantidad <= 0,
      )
    ) {
      setError("Cada cantidad de DOPE debe ser un número mayor que cero.");
      return;
    }

    const idsSeleccionados = cantidades.map((item) => item.dope_id);
    if (new Set(idsSeleccionados).size !== idsSeleccionados.length) {
      setError("No selecciones el mismo DOPE más de una vez. Sumá sus cantidades en una sola fila.");
      return;
    }

    for (const item of cantidades) {
      const dope = dopes.find((d) => d.id === item.dope_id);
      if (!dope) {
        setError(`El DOPE #${item.dope_id} ya no está disponible en la heladera.`);
        return;
      }
      if (
        dope.MasaRestante != null &&
        Math.round(item.cantidad * 100) / 100 >
          Math.round(Number(dope.MasaRestante) * 100) / 100
      ) {
        setError(
          `El DOPE #${item.dope_id} tiene ${formatNumero(dope.MasaRestante)} g disponibles y solicitaste ${formatNumero(item.cantidad)} g.`,
        );
        return;
      }
    }

    if (!geometria) {
      setError("Seleccioná una geometría.");
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
      // La función SQL crea la extrusión y sus relaciones en una transacción.
      // Los triggers de DOPE_Extrusion descuentan cada cantidad utilizada.
      const { data: nuevaExtrusionId, error: insertError } = await supabase.rpc(
        "registrar_extrusion_con_dopes",
        {
          p_fecha: fecha,
          p_geometria: geometria,
          p_formacion_fibras: formacionFibras,
          p_dopes: cantidades.map((item) => ({
            dope_id: item.dope_id,
            cantidad: item.cantidad,
          })),
        },
      );

      if (insertError) throw insertError;
      const extrusionId = Number(nuevaExtrusionId);
      if (!Number.isFinite(extrusionId) || extrusionId <= 0) {
        throw new Error("La base de datos no devolvió el ID de la extrusión.");
      }

      if (pdf) {
        try {
          const rutaPDF = await subirPDF(extrusionId, pdf);
          const { error: pdfError } = await supabase
            .from("ExtrusionFibras")
            .update({ PDF: rutaPDF })
            .eq("id", extrusionId);

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

      // El material recuperado se registra como un único DOPE mezclado.
      if (dopeRecuperado && recuperada != null) {
        const { error: recuperadoError } = await supabase.from("DOPE").insert({
          Peso: recuperada,
          MasaRestante: recuperada,
          FechaPreparacion: fecha,
          Estado: "sin moler",
          Recuperado: true,
          RecuperadoDe: extrusionId,
        });

        if (recuperadoError) {
          throw new Error(
            `La extrusión se guardó, pero no se pudo registrar el DOPE recuperado: ${recuperadoError.message}`,
          );
        }
      }

      setMensaje("Extrusión registrada correctamente.");
      setDopesUsados([{ dopeId: "", cantidad: "" }]);
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


async function adjuntarPDF(registro: ExtrusionRegistro, archivo: File) {
  if (subiendoPDFId !== null) return;

  setSubiendoPDFId(registro.id);
  setError("");
  setMensaje("");

  try {
    const rutaPDF = await subirPDF(registro.id, archivo);

    const { error: updateError } = await supabase
      .from("ExtrusionFibras")
      .update({ PDF: rutaPDF })
      .eq("id", registro.id);

    if (updateError) throw updateError;

    // Actualizar la lista sin tener que recargar toda la pantalla.
    setExtrusiones((actuales) =>
      actuales.map((item) =>
        item.id === registro.id
          ? { ...item, PDF: rutaPDF }
          : item,
      ),
    );

    // Actualizar también el detalle si está abierto.
    setDetalle((actual) =>
      actual?.id === registro.id
        ? { ...actual, PDF: rutaPDF }
        : actual,
    );

    setMensaje(`PDF adjuntado a la extrusión #${registro.id}.`);
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "No se pudo adjuntar el PDF.",
    );
  } finally {
    setSubiendoPDFId(null);
  }
}


function actualizarDopeUsado(
  indice: number,
  campo: "dopeId" | "cantidad",
  valor: string,
) {
  setDopesUsados((actuales) =>
    actuales.map((item, i) =>
      i === indice ? { ...item, [campo]: valor } : item,
    ),
  );
}

function agregarDopeUsado() {
  setDopesUsados((actuales) => [...actuales, { dopeId: "", cantidad: "" }]);
}

function quitarDopeUsado(indice: number) {
  setDopesUsados((actuales) =>
    actuales.length > 1 ? actuales.filter((_, i) => i !== indice) : actuales,
  );
}

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
  <div className="flex items-center gap-3">
    <FlaskConical className="h-7 w-7 shrink-0" />

    <h1 className="text-3xl font-semibold leading-none tracking-tight">
      Extrusión
    </h1>
  </div>

  <div className="ml-10">
    <AccentLine />
  </div>

  


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
              Agregá uno o más DOPE e indicá la cantidad utilizada de cada uno.
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

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">DOPE utilizado</span>
                <button
                  type="button"
                  onClick={agregarDopeUsado}
                  disabled={cargando || dopes.length === 0}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  + Agregar otro DOPE
                </button>
              </div>

              {dopesUsados.map((item, indice) => {
                const dopeSeleccionado = dopes.find(
                  (dope) => String(dope.id) === item.dopeId,
                );

                return (
                  <div
                    key={indice}
                    className="grid gap-3 rounded-xl border p-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)_auto]"
                  >
                    <label className="space-y-2 text-sm font-medium">
                      {`DOPE ${indice + 1}`}
                      <select
                        value={item.dopeId}
                        onChange={(e) =>
                          actualizarDopeUsado(indice, "dopeId", e.target.value)
                        }
                        required
                        className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
                      >
                        <option value="">
                          {cargando ? "Cargando DOPE..." : "Seleccionar DOPE"}
                        </option>
                        {dopes.map((dope) => {
                          const yaSeleccionado = dopesUsados.some(
                            (otro, otroIndice) =>
                              otroIndice !== indice &&
                              otro.dopeId === String(dope.id),
                          );
                          return (
                            <option
                              key={dope.id}
                              value={dope.id}
                              disabled={yaSeleccionado}
                            >
                              {`DOPE #${dope.id}`}
                              {dope.FechaPreparacion
      ? ` · ${new Date(`${dope.FechaPreparacion}T12:00:00`).toLocaleDateString("es-AR")}`
      : ""}
                              {dope.Peso != null
                                ? ` · ${formatNumero(dope.Peso)} g`
                                : ""}
                              {dope.MasaRestante != null
                                ? ` · Restante: ${formatNumero(dope.MasaRestante)} g`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span className="flex items-center justify-between gap-2">
                        <span>Cantidad (g)</span>
                        <button
                          type="button"
                          disabled={
                            dopeSeleccionado?.MasaRestante == null ||
                            Number(dopeSeleccionado.MasaRestante) <= 0
                          }
                          onClick={() => {
                            if (dopeSeleccionado?.MasaRestante != null) {
                              actualizarDopeUsado(
                                indice,
                                "cantidad",
                                String(dopeSeleccionado.MasaRestante),
                              );
                            }
                          }}
                          className="text-xs font-medium text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Usar todo
                        </button>
                      </span>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarDopeUsado(indice, "cantidad", e.target.value)
                        }
                        required
                        placeholder="Ej. 25"
                        className="w-full rounded-xl border bg-background px-3 py-2.5 font-normal"
                      />
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => quitarDopeUsado(indice)}
                        disabled={dopesUsados.length === 1}
                        aria-label={`Quitar DOPE ${indice + 1}`}
                        className="w-full rounded-xl border px-3 py-2.5 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}

              {!cargando && dopes.length === 0 && (
                <span className="block text-xs font-normal text-muted-foreground">
                  No hay DOPE disponible en la heladera.
                </span>
              )}
            </div>

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

            

          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">¿Se formaron fibras?</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                
                onClick={() => setFormacionFibras(true)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  formacionFibras
      ? "border-[#fc008e] bg-[#fc008e] text-white"
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
                    ? "border-[#fc008e] bg-[#fc008e] text-white"
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
  className="w-full rounded-xl bg-[#fc008e] px-4 py-3 font-medium text-white transition hover:bg-[#d9007a] disabled:cursor-not-allowed disabled:opacity-50"
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
                      {registro.dopesUsados && registro.dopesUsados.length > 0
                        ? registro.dopesUsados
                            .map((item) => `DOPE #${item.dope_id}`)
                            .join(" + ")
                        : "Sin DOPE asociado"}
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
                    <p className="text-xs text-muted-foreground">Total DOPE usado</p>
                    <p className="mt-1 font-medium">
                      {formatNumero(
                        (registro.dopesUsados ?? []).reduce(
                          (total, item) => total + Number(item.CantDOPE || 0),
                          0,
                        ) || registro.CantDOPE,
                      )} g
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

                
{registro.PDF ? (
  <button
    type="button"
    onClick={() => void abrirPDF(registro)}
    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
  >
    <ClipboardList className="h-4 w-4" />
    Abrir PDF
  </button>
) : (
  <label
    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted ${
      subiendoPDFId === registro.id
        ? "pointer-events-none opacity-50"
        : ""
    }`}
  >
    <Upload className="h-4 w-4" />
    {subiendoPDFId === registro.id ? "Subiendo PDF..." : "Agregar PDF"}

    <input
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      disabled={subiendoPDFId !== null}
      onChange={(e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";

        if (archivo) {
          void adjuntarPDF(registro, archivo);
        }
      }}
    />
  </label>
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
              <div className="border-b pb-3">
                <dt className="mb-2 text-muted-foreground">DOPE utilizados</dt>
                <dd className="space-y-2 font-medium">
                  {(detalle.dopesUsados ?? []).length > 0 ? (
                    (detalle.dopesUsados ?? []).map((item) => (
                      <div
                        key={item.dope_id}
                        className="flex justify-between gap-4"
                      >
                        <span>DOPE #{item.dope_id}</span>
                        <span>{formatNumero(item.CantDOPE)} g</span>
                      </div>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                  <div className="flex justify-between gap-4 border-t pt-2">
                    <span>Total utilizado</span>
                    <span>
                      {formatNumero(
                        (detalle.dopesUsados ?? []).reduce(
                          (total, item) => total + Number(item.CantDOPE || 0),
                          0,
                        ) || detalle.CantDOPE,
                      )} g
                    </span>
                  </div>
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

            
{detalle.PDF ? (
  <button
    type="button"
    onClick={() => void abrirPDF(detalle)}
    className="mt-5 w-full rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
  >
    Abrir PDF adjunto
  </button>
) : (
  <label
    className={`mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted ${
      subiendoPDFId === detalle.id
        ? "pointer-events-none opacity-50"
        : ""
    }`}
  >
    <Upload className="h-4 w-4" />
    {subiendoPDFId === detalle.id
      ? "Subiendo PDF..."
      : "Agregar PDF adjunto"}

    <input
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      disabled={subiendoPDFId !== null}
      onChange={(e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";

        if (archivo) {
          void adjuntarPDF(detalle, archivo);
        }
      }}
    />
  </label>
)}

          </div>
        </div>
      )}
    </div>
  );
}

export default Extrusion;