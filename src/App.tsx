
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Login from "@/components/Login"
import {
  Beaker,
  FlaskConical,
  Snowflake,
  Wrench,
  History,
  ChevronRight,
  Waves,
  FileText,
  ShieldCheck,

} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Preparacion } from "@/components/preparacion"
import { NuevoDope, type DatosNuevoDope } from "./components/nuevo-dope"
import { GuardarDope } from "@/components/guardar-dope"
import { Extrusion as ExtrusionForm } from "@/components/extrusion"
import { Fibras } from "@/components/fibras"
import { Heladera } from "@/components/heladera"
import { Mantenimiento } from "@/components/mantenimiento"
import { Historial } from "@/components/historial"
import { Documentacion } from "@/components/documentacion"
import Caracterizacion from "@/components/caracterizacion"

type Section =
  | "preparacion"
  | "extrusion"
  | "fibras"
  | "heladera"
  | "mantenimiento"
  | "historial"
  | "documentacion"
  | "caracterizacion"

type PreparacionView =
  | "menu"
  | "nuevo-dope"
  | "guardar-dope"


const menuItems = [
  {
    id: "preparacion" as Section,
    label: "Preparación DOPE",
    icon: Beaker,
  },
  {
    id: "extrusion" as Section,
    label: "Extrusión",
    icon: FlaskConical,
  },
  {
    id: "fibras" as Section,
    label: "Fibras",
    icon: Waves,
  },
  {
    id: "heladera" as Section,
    label: "Heladera",
    icon: Snowflake,
  },
  {
    id: "mantenimiento" as Section,
    label: "Mantenimiento",
    icon: Wrench,
  },
  {
    id: "historial" as Section,
    label: "Historial",
    icon: History,
  },
    {
    id: "documentacion" as Section,
    label: "Documentación",
    icon: FileText,
  },
  {
    id: "caracterizacion" as Section,
    label: "Caracterización",
    icon: FlaskConical,
  }
]

function App() {
const [sesionVerificada, setSesionVerificada] = useState(false)
const [autenticado, setAutenticado] = useState(false)
const [esAdmin, setEsAdmin] = useState(false)
const [modoAdmin, setModoAdmin] = useState(false)

useEffect(() => {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Error verificando sesión:", error)
    }

    const session = data.session

    setAutenticado(!!session)
    setEsAdmin(session?.user.app_metadata?.role === "admin")
    setSesionVerificada(true)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    setAutenticado(!!session)
    setEsAdmin(session?.user.app_metadata?.role === "admin")

    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      setModoAdmin(false)
    }

    if (!session) {
      setModoAdmin(false)
    }

    setSesionVerificada(true)
  })

  return () => subscription.unsubscribe()
}, [])
  
  const [activeSection, setActiveSection] =
    useState<Section>("preparacion")

  const [preparacionView, setPreparacionView] =
    useState<PreparacionView>("menu")


const [datosNuevoDope, setDatosNuevoDope] = useState<DatosNuevoDope | null>(null)

  const activeItem = menuItems.find(
    (item) => item.id === activeSection
  )

  function handleSectionChange(section: Section) {
    setActiveSection(section)

    if (section === "preparacion") {
      setPreparacionView("menu")
    }
  }

    if (!sesionVerificada) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    )
  }

  if (!autenticado) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      
<header className="border-b">
  <div className="flex h-16 items-center justify-between px-6">
    <div>
      <img
  src="/fiberly-logo.png"
  alt="Fiberly"
  className="h-8 w-auto object-contain"
/>

    
    </div>

 <div className="flex items-center gap-3">

  {esAdmin && (
    <Button
      variant={modoAdmin ? "default" : "outline"}
      onClick={() => setModoAdmin((v) => !v)}
      className={
        modoAdmin
          ? "bg-[#fc008e] text-white hover:bg-[#df007e]"
          : "border-[#fc008e] text-[#fc008e] hover:bg-pink-50"
      }
    >
      <ShieldCheck className="mr-2 h-4 w-4" />
      {modoAdmin ? "Modo admin activado" : "Activar modo admin"}
    </Button>
  )}

  <Button
    variant="outline"
    onClick={async () => {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Error cerrando sesión:", error)
      }
    }}
  >
    Cerrar sesión
  </Button>

</div>


  </div>
</header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <Button
  key={item.id}
  variant={isActive ? "secondary" : "ghost"}
  className={`relative w-full justify-start ${
    isActive ? "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#fc008e] before:content-['']" : ""
  }`}
  onClick={() => handleSectionChange(item.id)}
>
  <Icon
    className="mr-3 h-4 w-4"
    color={isActive ? "#fc008e" : "currentColor"}
  />

  {item.label}

  {isActive && (
    <ChevronRight
      className="ml-auto h-4 w-4"
      color="#fc008e"
    />
  )}
</Button>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {activeSection === "preparacion" ? (
  <>
    {preparacionView === "menu" && (
      <Preparacion
        onNewDope={() =>
          setPreparacionView("nuevo-dope")
        }
        modoAdmin={modoAdmin}
      />
    )}

    
{preparacionView === "nuevo-dope" && (
  <NuevoDope
    onBack={() => setPreparacionView("menu")}
    onContinue={(datos) => {
      setDatosNuevoDope(datos)
      setPreparacionView("guardar-dope")
    }}
  />
)}

{preparacionView === "guardar-dope" && datosNuevoDope && (
  <GuardarDope
    datos={datosNuevoDope}
    onBack={() => setPreparacionView("nuevo-dope")}
  />
)}

  </>
) : activeSection === "extrusion" ? (
  <ExtrusionForm
    onBack={() => setActiveSection("preparacion")}
  />
) : activeSection === "fibras" ? ( <Fibras /> 
  
) : activeSection === "heladera" ? (
  <Heladera />
 ) : activeSection === "mantenimiento" ? (
  <Mantenimiento />)
  : activeSection === "historial" ? (
  <Historial />
) : activeSection === "documentacion" ? (
  <Documentacion />
) : activeSection === "caracterizacion" ? (
  <Caracterizacion />
) : (
  
  <div>
    <h2 className="text-3xl font-semibold">
      {activeItem?.label}
    </h2>
  </div>
)}

        </main>
      </div>
    </div>
  )
}

export default App

