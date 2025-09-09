// src/pages/Docs.tsx
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import "../theme/scalar-theme.css";

import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { useTheme } from "@mui/material";

export default function Docs() {
  const { categoryId = "1" } = useParams<{ categoryId?: string }>();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toString().toLowerCase().includes("admin");

  const SPEC_URL = useMemo(
    () => `/admin/docs/${categoryId}/spec?frontend=1`,
    [categoryId]
  );

  const theme = useTheme();
  const mode = theme.palette.mode; // "light" | "dark"

  const configuration = useMemo(
    () => ({
      // ✅ Use the recommended "spec" shape
      spec: { url: SPEC_URL },

      // UI/Theme
      theme: "kepler",
      layout: "modern",
      darkMode: mode === "dark",
      hideDarkModeToggle: false,
      showSidebar: true,
      hideSearch: false,
      hideModels: false,

      // Downloads: let admins have both, viewers JSON-only (prevents unused var)
      documentDownloadType: isAdmin ? "both" : "json",

      // Code samples
      defaultHttpClient: { targetKey: "node", clientKey: "undici" },
      hiddenClients: ["wget"],

      // Meta
      metaData: { title: "VTM API Docs", description: "Internal API docs" },
      favicon: "/favicon.svg",

      // 🎨 Map your red/gray palette into Scalar CSS variables
      customCss: `
        /* ===== Light mode ===== */
        .light-mode {
          /* text */
          --scalar-color-1: ${colors.gray[900]};
          --scalar-color-2: ${colors.gray[600]};
          --scalar-color-3: ${colors.gray[500]};

          /* accent / links / highlights */
          --scalar-color-accent: ${colors.primary};

          /* backgrounds & borders */
          --scalar-background-1: ${colors.gray[50]};
          --scalar-background-2: ${colors.white};
          --scalar-border-color: ${colors.gray[200]};

          /* code blocks & chips */
          --scalar-code-background-1: ${colors.gray[100]};
          --scalar-code-color-1: ${colors.gray[900]};

          /* buttons / interactive */
          --scalar-button-primary: ${colors.primary};
          --scalar-button-primary-hover: ${colors.primaryDark};
          --scalar-button-primary-color: ${colors.white};
          --scalar-badge-accent: ${colors.primaryLight};
        }

        /* ===== Dark mode ===== */
        .dark-mode {
          /* text */
          --scalar-color-1: ${colors.gray[100]};
          --scalar-color-2: ${colors.gray[400]};
          --scalar-color-3: ${colors.gray[500]};

          /* accent / links */
          --scalar-color-accent: ${colors.primaryLight};

          /* backgrounds & borders */
          --scalar-background-1: #121212;
          --scalar-background-2: #1e1e1e;
          --scalar-border-color: ${colors.gray[700]};

          /* code blocks */
          --scalar-code-background-1: ${colors.gray[800]};
          --scalar-code-color-1: ${colors.gray[50]};

          /* buttons / interactive */
          --scalar-button-primary: ${colors.primaryLight};
          --scalar-button-primary-hover: ${colors.primary};
          --scalar-button-primary-color: ${colors.white};
          --scalar-badge-accent: ${colors.primaryLight};
        }

        /* Emphasize links */
        .light-mode a, .dark-mode a {
          color: var(--scalar-color-accent);
        }

        /* Sidebar subtle tone */
        .light-mode .sidebar { --scalar-sidebar-color-2: ${colors.gray[600]}; }
        .dark-mode .sidebar  { --scalar-sidebar-color-2: ${colors.gray[400]}; }

        /* HTTP badge text color (if applicable) */
        .light-mode .http-verb, .dark-mode .http-verb { color: #fff; }
      `,
    }),
    [SPEC_URL, mode, isAdmin]
  );

  return (
    <div className="h-[100svh] grid grid-rows-[auto_minmax(0,1fr)]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20">
        <Navbar
          sidebarOpen={false}
          setSidebarOpen={() => {}}
          searchQuery=""
          setSearchQuery={() => {}}
        />
      </div>

      {/* Body fills the rest and is the scroll container */}
      <section className="min-h-0 overflow-auto overscroll-contain">
        <div className="h-full min-h-0">
          <ApiReferenceReact
            // Force remount when category or theme changes to ensure theme swap applies
            key={`url-${categoryId}-${mode}`}
            configuration={configuration as any}
          />
        </div>
      </section>
    </div>
  );
}
