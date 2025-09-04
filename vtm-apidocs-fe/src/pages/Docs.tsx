// src/pages/Docs.tsx
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import "../theme/scalar-theme.css";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Docs() {
  const { categoryId = "1" } = useParams<{ categoryId?: string }>();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toString().toLowerCase().includes("admin");

  const SPEC_URL = useMemo(
    () => `/admin/docs/${categoryId}/spec?frontend=1`,
    [categoryId]
  );

  const configuration = useMemo(
    () => ({
      url: SPEC_URL,
      theme: "kepler",
      layout: "modern",
      darkMode: true,
      hideDarkModeToggle: false,
      showSidebar: true,
      hideSearch: false,
      hideModels: false,
      documentDownloadType: "both",
      defaultHttpClient: { targetKey: "node", clientKey: "undici" },
      hiddenClients: ["wget"],
      metaData: { title: "VTM API Docs", description: "Internal API docs" },
      favicon: "/favicon.svg",
    }),
    [SPEC_URL]
  );

  return (
    <div className="h-dvh grid grid-rows-[auto_1fr]">
      <div className="sticky top-0 z-20">
        <Navbar
          sidebarOpen={false}
          setSidebarOpen={() => {}}
          searchQuery=""
          setSearchQuery={() => {}}
        />
      </div>

      <section className="relative min-h-0">
        <div className="absolute inset-0 overflow-auto overscroll-contain">
          <ApiReferenceReact
            key={`url-${categoryId}`}
            configuration={configuration as any}
          />
        </div>
      </section>
    </div>
  );
}
