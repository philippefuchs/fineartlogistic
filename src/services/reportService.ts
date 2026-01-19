import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Artwork, LogisticsFlow, QuoteLine } from '../types';
import { calculateFlowTotalCost, calculateTransport, calculatePackingService } from './logisticsEngine';

export const exportProjectToPDF = (
    project: Project,
    artworks: Artwork[],
    flows: LogisticsFlow[],
    quoteLines: QuoteLine[]
) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('GROSPIRON FINE ART', 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`RAPPORT LOGISTIQUE: ${project.name}`, 15, 30);
        doc.text(`REF: ${project.reference_code}`, pageWidth - 15, 30, { align: 'right' });

        // Project Summary Section
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RÉSUMÉ DU PROJET', 15, 55);

        const totalLogisticsCost = flows.reduce((acc, flow) => {
            const flowQuotes = quoteLines.filter(l => l.flow_id === flow.id);
            if (flowQuotes.length === 0) return acc;
            if (flow.validated_agent_name) {
                return acc + flowQuotes.filter(l => l.agent_name === flow.validated_agent_name).reduce((sum, l) => sum + l.total_price, 0);
            }
            const agents = Array.from(new Set(flowQuotes.map(l => l.agent_name).filter(Boolean)));
            if (agents.length === 0) return acc + flowQuotes.reduce((sum, l) => sum + l.total_price, 0);
            const agentTotals = agents.map(agent => flowQuotes.filter(l => l.agent_name === agent).reduce((sum, l) => sum + l.total_price, 0));
            return acc + Math.min(...agentTotals);
        }, 0) + quoteLines.filter(l => l.flow_id === 'none').reduce((acc, l) => acc + l.total_price, 0);

        const summaryData = [
            ['Musée Organisateur', project.organizing_museum],
            ['Nombre d\'Œuvres', artworks.length.toString()],
            ['Valeur d\'Assurance', `${artworks.reduce((acc, a) => acc + a.insurance_value, 0).toLocaleString()} ${project.currency}`],
            ['Budget Logistique', `${totalLogisticsCost.toLocaleString()} ${project.currency}`]
        ];

        autoTable(doc, {
            startY: 60,
            head: [],
            body: summaryData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });

        // Artwork Inventory Table
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTAIRE DES ŒUVRES', 15, (doc as any).lastAutoTable.finalY + 15);

        const artworkRows = artworks.map(a => [
            a.title,
            a.artist,
            `${a.dimensions_h_cm}x${a.dimensions_w_cm}x${a.dimensions_d_cm} cm`,
            a.crate_specs ? `${a.crate_specs.crate_type}` : 'NONE',
            a.notes || '-',
            `${a.insurance_value.toLocaleString()} ${project.currency}`
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Titre', 'Artiste', 'Dimensions', 'Caisse', 'Notes', 'Valeur']],
            body: artworkRows,
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                4: { cellWidth: 50 }, // More width for notes
            }
        });

        // Logistics Strategy Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('STRATÉGIE LOGISTIQUE', 15, (doc as any).lastAutoTable.finalY + 15);

        const flowRows = flows.map(f => [
            f.flow_type.replace('_', ' '),
            `${f.origin_country} -> ${f.destination_country}`,
            f.status.replace('_', ' '),
            f.validated_agent_name || 'Non Assigné'
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Type', 'Trajet', 'Statut', 'Agent Sélectionné']],
            body: flowRows,
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 8 }
        });

        // Valuated Quote Lines
        if (quoteLines.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('DÉTAILS DES COÛTS LOGISTIQUES', 15, (doc as any).lastAutoTable.finalY + 15);

            const quoteRows = quoteLines.map(l => [
                l.agent_name || '-',
                l.category,
                l.description,
                l.quantity,
                `${l.total_price.toLocaleString()} ${l.currency}`
            ]);

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 20,
                head: [['Agent', 'Catégorie', 'Description', 'Qté', 'Total']],
                body: quoteRows,
                headStyles: { fillColor: [15, 23, 42] },
                styles: { fontSize: 8 }
            });
        }

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Généré par la Plateforme Grospiron Fine Art - Page ${i} sur ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
        }

        doc.save(`${project.reference_code}_Logistics_Report.pdf`);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const exportPackingList = (project: Project, artworks: Artwork[]) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('PACKING LIST', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Project: ${project.name}`, 15, 30);
        doc.text(`Ref: ${project.reference_code}`, pageWidth - 15, 30, { align: 'right' });

        const rows = artworks.map((a, index) => [
            index + 1,
            a.title,
            a.artist,
            `${a.dimensions_h_cm}x${a.dimensions_w_cm}x${a.dimensions_d_cm} cm`,
            `${a.weight_kg} kg`,
            a.crate_specs ? `${a.crate_specs.crate_type}` : 'Soft pack'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['No.', 'Title', 'Artist', 'Dimensions', 'Weight', 'Packing']],
            body: rows,
            headStyles: { fillColor: [60, 60, 60] },
            styles: { fontSize: 9 }
        });

        // Totals
        const totalWeight = artworks.reduce((sum, a) => sum + a.weight_kg, 0);
        const volume = artworks.reduce((sum, a) => sum + (a.dimensions_h_cm * a.dimensions_w_cm * a.dimensions_d_cm) / 1000000, 0);

        doc.text(`Total Weight: ${totalWeight} kg`, 15, (doc as any).lastAutoTable.finalY + 15);
        doc.text(`Total Volume: ${volume.toFixed(2)} m3`, 15, (doc as any).lastAutoTable.finalY + 20);

        doc.save(`${project.reference_code}_PackingList.pdf`);
    } catch (error) {
        alert("Error generating Packing List");
    }
};

export const exportProformaInvoice = (project: Project, artworks: Artwork[]) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFORMA INVOICE', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Shipper: GROSPIRON FINE ART`, 15, 30);
        doc.text(`Consignee: ${project.organizing_museum}`, 15, 35);
        doc.text(`Ref: ${project.reference_code}`, pageWidth - 15, 30, { align: 'right' });

        const rows = artworks.map((a, index) => [
            index + 1,
            a.artist,
            a.title,
            'Art Work',
            'France',
            `${a.insurance_value.toLocaleString()} ${project.currency}`
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Item', 'Artist', 'Title', 'Description', 'Origin', 'Value']],
            body: rows,
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 9 }
        });

        const totalValue = artworks.reduce((sum, a) => sum + a.insurance_value, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL VALUE: ${totalValue.toLocaleString()} ${project.currency}`, pageWidth - 15, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text("Value for customs purposes only. No commercial value.", pageWidth / 2, 280, { align: 'center' });

        doc.save(`${project.reference_code}_Proforma.pdf`);
    } catch (error) {
        alert("Error generating Proforma Invoice");
    }
};

export const exportCompleteQuoteToPDF = (
    project: Project,
    artworks: Artwork[],
    distance_km: number
) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const PAGE_HEIGHT = doc.internal.pageSize.height;

        const quote = calculateFlowTotalCost(artworks, distance_km);
        const transport = calculateTransport(artworks, distance_km);

        // Header
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, pageWidth, 50, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('GROSPIRON FINE ART', 15, 25);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('DEVIS ESTIMATIF COMPLET', 15, 38);
        doc.text(`DATE: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 15, 38, { align: 'right' });

        // Project Info
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`PROJET: ${project.name}`, 15, 65);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Réf: ${project.reference_code}`, 15, 72);
        doc.text(`Musée: ${project.organizing_museum}`, 15, 77);

        // Summary Table
        const summaryRows = [
            ['Fabrication Caisses (T1/T2)', `${quote.crateCosts_eur.toLocaleString()} €`],
            ['Emballage & Tamponnage sur site', `${quote.packingCosts_eur.toLocaleString()} €`],
            ['Transport Logistique', `${quote.transportCost_eur.toLocaleString()} €`],
            ['TOTAL ESTIMÉ (Hors Taxes)', `${quote.totalCost_eur.toLocaleString()} €`]
        ];

        autoTable(doc, {
            startY: 85,
            head: [['POSTE DE DÉPENSE', 'MONTANT ESTIMÉ']],
            body: summaryRows,
            headStyles: { fillColor: [41, 128, 185], fontSize: 11 },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
        });

        // Transport Details
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DÉTAILS DU TRANSPORT', 15, (doc as any).lastAutoTable.finalY + 15);

        const transportData = [
            ['Volume Total', `${transport.totalVolume_m3.toFixed(2)} m³`],
            ['Type de Véhicule', transport.vehicleType === 'CAMION_20M3' ? 'Camion 20m³' : 'Poids Lourd'],
            ['Distance estimée', `${distance_km} km`],
            ['Forfait de base', `${transport.baseCost_eur.toLocaleString()} €`],
            ['Supplément Km', `${transport.distanceCost_eur.toLocaleString()} €`]
        ];

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            body: transportData,
            theme: 'striped',
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });

        // Per Artwork Table
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DÉTAIL PAR ŒUVRE', 15, 25);

        const artworkRows = artworks.map(a => {
            const packing = calculatePackingService(a);
            const total = (a.crate_estimated_cost || 0) + packing.packingCost_eur;
            return [
                a.title,
                a.typology,
                `${a.crate_estimated_cost || 0} €`,
                `${packing.packingCost_eur.toLocaleString()} €`,
                `${total.toLocaleString()} €`
            ];
        });

        autoTable(doc, {
            startY: 35,
            head: [['Titre', 'Type', 'Caisse', 'Emballage', 'Sous-Total']],
            body: artworkRows,
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 8 },
            columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } }
        });

        // Generic Conditions
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text('Note: Ce devis est une estimation automatique basée sur les standards de l\'industrie.', 15, finalY + 20);
        doc.text('Les coûts définitifs peuvent varier selon les conditions réelles d\'intervention.', 15, finalY + 25);

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`GROSPIRON FINE ART - Devis ${project.reference_code} - Page ${i} / ${totalPages}`, pageWidth / 2, PAGE_HEIGHT - 10, { align: 'center' });
        }

        doc.save(`${project.reference_code}_Devis_Complet.pdf`);
    } catch (error) {
        console.error("Error generating Full Quote PDF:", error);
        alert("Erreur lors de la génération du devis PDF");
    }
};

export const exportCCTPSummary = (project: Project) => {
    if (!project.constraints) {
        alert("Aucune contrainte CCTP détectée pour ce projet.");
        return;
    }

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('GROSPIRON FINE ART', 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`SYNTHÈSE CCTP: ${project.name}`, 15, 30);
        doc.text(`REF: ${project.reference_code}`, pageWidth - 15, 30, { align: 'right' });

        // Title
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('MATRICE DE CONTRAINTES TECHNIQUES', 15, 55);

        let yPos = 70;

        // Access Constraints
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246); // Blue
        doc.text('ACCÈS & VÉHICULES', 15, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        const accessData = [];
        if (project.constraints.access.max_height_meters) {
            accessData.push(['Hauteur Max', `${project.constraints.access.max_height_meters}m`]);
        }
        if (project.constraints.access.max_length_meters) {
            accessData.push(['Longueur Max', `${project.constraints.access.max_length_meters}m`]);
        }
        if (project.constraints.access.tail_lift_required) {
            accessData.push(['Hayon', 'REQUIS']);
        }
        if (project.constraints.access.elevator_dimensions) {
            const { h, w, d } = project.constraints.access.elevator_dimensions;
            accessData.push(['Monte-Charge', `${h}m x ${w}m x ${d}m`]);
        }

        if (accessData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                body: accessData,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
            });
            yPos = (doc as any).lastAutoTable.finalY + 5;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const accessText = doc.splitTextToSize(project.constraints.access.rationale, pageWidth - 30);
        doc.text(accessText, 15, yPos);
        yPos += accessText.length * 5 + 10;

        // Security Constraints
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(251, 191, 36); // Amber
        doc.text('SÉCURITÉ & SÛRETÉ', 15, yPos);
        yPos += 8;

        const securityData = [];
        if (project.constraints.security.armored_truck_required) {
            securityData.push(['Camion Blindé', 'OBLIGATOIRE']);
        }
        if (project.constraints.security.police_escort_required) {
            securityData.push(['Escorte Police', 'REQUISE']);
        }
        if (project.constraints.security.courier_supervision) {
            securityData.push(['Convoyage', 'REQUIS']);
        }
        if (project.constraints.security.tarmac_access) {
            securityData.push(['Accès Tarmac', 'REQUIS']);
        }

        if (securityData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                body: securityData,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
            });
            yPos = (doc as any).lastAutoTable.finalY + 5;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const securityText = doc.splitTextToSize(project.constraints.security.rationale, pageWidth - 30);
        doc.text(securityText, 15, yPos);
        yPos += securityText.length * 5 + 10;

        // Packing Constraints
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94); // Emerald
        doc.text('CONSERVATION & CLIMAT', 15, yPos);
        yPos += 8;

        const packingData = [];
        if (project.constraints.packing.nimp15_mandatory) {
            packingData.push(['NIMP15', 'OBLIGATOIRE']);
        }
        if (project.constraints.packing.acclimatization_hours) {
            packingData.push(['Acclimatation', `${project.constraints.packing.acclimatization_hours}h`]);
        }
        if (project.constraints.packing.forbidden_materials.length > 0) {
            packingData.push(['Matériaux Interdits', project.constraints.packing.forbidden_materials.join(', ')]);
        }

        if (packingData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                body: packingData,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
            });
            yPos = (doc as any).lastAutoTable.finalY + 5;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const packingText = doc.splitTextToSize(project.constraints.packing.rationale, pageWidth - 30);
        doc.text(packingText, 15, yPos);
        yPos += packingText.length * 5 + 10;

        // Schedule Constraints
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(168, 85, 247); // Purple
        doc.text('PLANNING & HORAIRES', 15, yPos);
        yPos += 8;

        const scheduleData = [];
        if (project.constraints.schedule.night_work) {
            scheduleData.push(['Travail de Nuit', 'AUTORISÉ']);
        }
        if (project.constraints.schedule.sunday_work) {
            scheduleData.push(['Dimanche/Férié', 'AUTORISÉ']);
        }
        if (project.constraints.schedule.hard_deadline) {
            scheduleData.push(['Échéance Impérative', new Date(project.constraints.schedule.hard_deadline).toLocaleDateString('fr-FR')]);
        }

        if (scheduleData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                body: scheduleData,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
            });
            yPos = (doc as any).lastAutoTable.finalY + 5;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const scheduleText = doc.splitTextToSize(project.constraints.schedule.rationale, pageWidth - 30);
        doc.text(scheduleText, 15, yPos);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Généré par la Plateforme Grospiron Fine Art', pageWidth / 2, 285, { align: 'center' });

        doc.save(`${project.reference_code}_CCTP_Summary.pdf`);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
};
