
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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Preparacion } from "@/components/preparacion"
import { NuevoDope } from "@/components/nuevo-dope"
import { GuardarDope } from "@/components/guardar-dope"
import { Extrusion as ExtrusionForm } from "@/components/extrusion"
import { Fibras } from "@/components/fibras"
import { Heladera } from "@/components/heladera"
import { Mantenimiento } from "@/components/mantenimiento"
import { Historial } from "@/components/historial"

type Section =
  | "preparacion"
  | "extrusion"
  | "fibras"
  | "heladera"
  | "mantenimiento"
  | "historial"

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
    icon: FlaskConical,
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
]

function App() {
  const [sesionVerificada, setSesionVerificada] = useState(false)
const [autenticado, setAutenticado] = useState(false)

useEffect(() => {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Error verificando sesión:", error)
    }

    setAutenticado(!!data.session)
    setSesionVerificada(true)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setAutenticado(!!session)
    setSesionVerificada(true)
  })

  return () => subscription.unsubscribe()
}, [])
  
  const [activeSection, setActiveSection] =
    useState<Section>("preparacion")

  const [preparacionView, setPreparacionView] =
    useState<PreparacionView>("menu")

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
      <h1 className="text-xl font-semibold">
        Lab Organization
      </h1>

      <p className="text-sm text-muted-foreground">
        Gestión del laboratorio
      </p>
    </div>

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
                  className="w-full justify-start"
                  onClick={() => handleSectionChange(item.id)}
                >
                  <Icon className="mr-3 h-4 w-4" />

                  {item.label}

                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4" />
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
      />
    )}

    {preparacionView === "nuevo-dope" && (
      <NuevoDope
        onBack={() => setPreparacionView("menu")}
        onContinue={() => setPreparacionView("guardar-dope")}
      />
    )}

    {preparacionView === "guardar-dope" && (
      <GuardarDope
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

