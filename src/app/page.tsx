"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProjectCard } from "@/components/ProjectCard";
import { useProjectStore } from "@/hooks/useProjectStore";
import { Plus, Search, Filter } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Project, Artwork } from "@/types";
import { generateId } from "@/lib/generateId";

import { generateAppelOffre } from "@/services/demoDataService";
import { Sparkles } from "lucide-react";
import { ProjectWizardModal } from "@/components/ProjectWizardModal";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { projects, addProject, deleteProject, updateProject, addArtwork, addFlow, addQuoteLines } = useProjectStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  const handleGenerateDemo = () => {
    const { project, artworks, flows, quoteLines } = generateAppelOffre();

    // Add all data to store
    addProject(project);
    artworks.forEach(art => addArtwork(art));
    flows.forEach(flow => addFlow(flow));
    addQuoteLines(quoteLines);

    alert("Appel d'offre de démonstration généré avec succès !");
  };

  const handleCreateProject = () => {
    setShowWizard(true);
  };

  const onWizardComplete = (project: Project, artworks: Artwork[]) => {
    const { getGeoEnrichedData } = require("@/services/geoService");

    // Avoid double submission
    if (projects.find(p => p.id === project.id)) return;

    addProject(project);

    // --- STEP A & B: Normalization & Clustering ---
    // Group artworks by CountryCode
    const countryGroups = new Map<string, Artwork[]>();
    artworks.forEach(art => {
      const geo = getGeoEnrichedData(art.lender_city, art.lender_country);
      const key = geo.countryCode;
      if (!countryGroups.has(key)) {
        countryGroups.set(key, []);
      }
      countryGroups.get(key)!.push(art);
    });

    const now = new Date().toISOString();
    const flowMap = new Map<string, string>();

    // Intelligent destination detection (Organizer Country)
    const organizerGeo = getGeoEnrichedData("", project.organizing_museum || "Paris");
    const organizerCountry = organizerGeo.countryCode;

    // --- STEP C: Flow Creation & Type Determination ---
    countryGroups.forEach((groupArtworks, countryCode) => {
      const firstArt = groupArtworks[0];
      const geo = getGeoEnrichedData(firstArt.lender_city, firstArt.lender_country);

      let flowType: any = 'INTL_AIR';
      if (countryCode === organizerCountry) {
        flowType = 'FRANCE_ROAD';
      } else if (geo.isEU) {
        flowType = 'EU_ROAD';
      } else if (countryCode === 'GB') {
        flowType = 'INTL_AIR';
      }

      const flowId = generateId();
      addFlow({
        id: flowId,
        project_id: project.id,
        origin_country: geo.countryName,
        origin_city: groupArtworks.length > 1 ? "Plusieurs villes" : firstArt.lender_city,
        destination_country: organizerGeo.countryName,
        destination_city: organizerGeo.countryCode === 'US' ? 'New York' : 'Paris',
        flow_type: flowType,
        status: 'PENDING_QUOTE',
        created_at: now
      });

      flowMap.set(countryCode, flowId);

      // Assign flowId to all artworks in this cluster
      groupArtworks.forEach(art => {
        art.flow_id = flowId;
      });
    });

    // Add artworks
    artworks.forEach(art => addArtwork(art));

    setShowWizard(false);
    router.push(`/projects/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    const newName = prompt("Nouveau nom du projet:", project.name);
    if (newName && newName.trim() !== "") {
      updateProject(project.id, { name: newName.trim() });
    }
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      {showWizard && (
        <ProjectWizardModal
          onClose={() => setShowWizard(false)}
          onComplete={onWizardComplete}
        />
      )}
      <div className="flex flex-col gap-8">
        {/* Hero / Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
              Tableau de Bord Expositions
            </h1>
            <p className="mt-2 text-zinc-400">
              Gérez votre logistique d'art et la planification d'expositions depuis un espace unique.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGenerateDemo}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-5 py-3 font-semibold text-indigo-400 shadow-lg transition-all hover:bg-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles size={20} />
              Générer Démo Appel d'Ooffre
            </button>
            <button
              onClick={handleCreateProject}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={20} />
              Nouvelle Exposition
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Rechercher un projet..."
              className="w-full rounded-2xl border border-white/5 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-white/10 transition-all">
              <Filter size={16} />
              Filtrer
            </button>
            <GlassCard className="flex items-center justify-center p-0 px-4 text-sm font-bold text-blue-400">
              {projects.length} Total
            </GlassCard>
          </div>
        </div>

        {/* Project Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-600">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-semibold text-zinc-400">Aucun projet trouvé</h3>
            <p className="mt-1 text-zinc-500">Créez votre première exposition pour commencer.</p>
            <button
              onClick={handleCreateProject}
              className="mt-6 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Commencer maintenant →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
