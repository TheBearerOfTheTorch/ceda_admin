import {
  StageConfig, ProjectCardData, DependencyConnector,
  CanvasStickyNote, ActiveCollaborator, IntakeDossier, WorkspaceModule,
  AdminCanvasTool, QueueIdeaItem, CanvasEvaluatorStation, CanvasPoolContainer,
  SubmitterEnquiryMessage, AdminAlertNotification, AdminPersonnel, CanvasAnnotationItem
} from '../types/ceda';

export const PIPELINE_STAGES: StageConfig[] = [
  {
    id: 'intake',
    name: 'Idea Intake',
    number: 1,
    tagPrefix: 'INT',
    color: '#0284c7', // Sky Blue
    bgColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284c7',
    activeCount: 6,
    description: 'Citizen submission, raw idea logging, and portal ingest.'
  },
  {
    id: 'screening',
    name: 'Screening',
    number: 2,
    tagPrefix: 'SCR',
    color: '#7c3aed', // Royal Violet
    bgColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: '#7c3aed',
    activeCount: 4,
    description: 'Compliance, eligibility clearance, and foundational vetting.'
  },
  {
    id: 'evaluation',
    name: 'Evaluation',
    number: 3,
    tagPrefix: 'EVL',
    color: '#ea580c', // Tangerine Orange
    bgColor: 'rgba(234, 88, 12, 0.08)',
    borderColor: '#ea580c',
    activeCount: 5,
    description: 'Commercial viability, financial stress tests, and market sizing.'
  },
  {
    id: 'expert_review',
    name: 'Expert Review',
    number: 4,
    tagPrefix: 'REV',
    color: '#1e40af', // Navy-Indigo
    bgColor: 'rgba(30, 64, 175, 0.08)',
    borderColor: '#1e40af',
    activeCount: 4,
    description: 'Technical due diligence, risk modeling, and advisory committees.'
  },
  {
    id: 'approval_board',
    name: 'Approval Board',
    number: 5,
    tagPrefix: 'APP',
    color: '#16a34a', // Emerald Green
    bgColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: '#16a34a',
    activeCount: 3,
    description: 'Agency adjudication, executive sign-off, and allocation.'
  },
  {
    id: 'pilot_phase',
    name: 'Pilot Phase',
    number: 6,
    tagPrefix: 'PLT',
    color: '#d97706', // Amber
    bgColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: '#d97706',
    activeCount: 2,
    description: 'Controlled market testing, proof-of-concept, and sandbox validation.'
  },
  {
    id: 'implementation',
    name: 'Implementation',
    number: 7,
    tagPrefix: 'IMP',
    color: '#0d9488', // Teal
    bgColor: 'rgba(13, 148, 136, 0.08)',
    borderColor: '#0d9488',
    activeCount: 2,
    description: 'Capital disbursement, scaling operations, and site roll-out.'
  },
  {
    id: 'realized_impact',
    name: 'Realized Impact',
    number: 8,
    tagPrefix: 'RES',
    color: '#15803d', // Forest Green
    bgColor: 'rgba(21, 128, 61, 0.08)',
    borderColor: '#15803d',
    activeCount: 2,
    description: 'Sustainable ROI, job creation, and socio-economic transformation.'
  }
];

export const INTAKE_DOSSIERS: IntakeDossier[] = [
  {
    id: '#INNO-124',
    title: 'Digital Health Tele-Triage & Drone Dispatch',
    author: 'Kabo Mogotsi',
    organization: 'Kalahari IoT Systems Pty Ltd',
    badge: {
      text: '>50% Youth Owned',
      type: 'green'
    },
    sectorTag: 'HealthTech',
    priorityTag: 'Strategic',
    score: 88,
    ingestedDate: '09 Nov',
    description: 'Automated rapid medical emergency response and diagnostics dispatch for remote clinics.',
    capitalAsk: 850000,
    category: 'new_ingest'
  },
  {
    id: '#INNO-132',
    title: 'Smart Grid Solar Micro-Storage & IoT Metering',
    author: 'Lesego Tlale',
    organization: 'SolarBotswana Ltd',
    badge: {
      text: '>50% Youth Verified',
      type: 'green'
    },
    sectorTag: 'CleanTech',
    priorityTag: 'Priority',
    score: 94,
    ingestedDate: '08 Nov',
    description: 'Modular lithium battery packs with smart prepaid cellular metering for rural commercial centers.',
    capitalAsk: 1250000,
    category: 'new_ingest'
  },
  {
    id: '#INNO-145',
    title: 'Bovine Genomics & Predictive Disease Surveillance',
    author: 'Dr. Thato Tau',
    organization: 'VetTech Research Hub',
    badge: {
      text: 'CIPA Audit Pending',
      type: 'amber'
    },
    sectorTag: 'AgriTech',
    priorityTag: 'Regional',
    score: 79,
    ingestedDate: '07 Nov',
    description: 'Field rapid blood gene assay kit protecting national cattle export herds from seasonal outbreaks.',
    capitalAsk: 920000,
    category: 'review'
  },
  {
    id: '#INNO-150',
    title: 'Kgalagadi Bio-Extracts Organic Fertilizers',
    author: 'Neo Mmopiemang',
    organization: 'Kalahari Organics',
    badge: {
      text: '>50% Citizen Owned',
      type: 'green'
    },
    sectorTag: 'AgriBio',
    priorityTag: 'High Growth',
    score: 91,
    ingestedDate: '06 Nov',
    description: 'Micro-algae fortified organic soil amendments tailored to Kalahari sandveld nutrient deficiencies.',
    capitalAsk: 1100000,
    category: 'strategic'
  },
  {
    id: '#INNO-158',
    title: 'Okavango Eco-Plastic Circular Bricks',
    author: 'Mpho Ditshego',
    organization: 'Delta ReCraft',
    badge: {
      text: '>50% Youth Owned',
      type: 'green'
    },
    sectorTag: 'CleanTech',
    priorityTag: 'Regional',
    score: 86,
    ingestedDate: '05 Nov',
    description: 'Recycled safari lodge polymer waste extruded into structural pavers.',
    capitalAsk: 680000,
    category: 'new_ingest'
  },
  {
    id: '#INNO-162',
    title: 'Gaborone EV Commuter Micro-Bus Charging',
    author: 'Onalenna Kwapa',
    organization: 'Kgale E-Mobility',
    badge: {
      text: 'Docs Verified',
      type: 'green'
    },
    sectorTag: 'CleanTech',
    priorityTag: 'Strategic',
    score: 95,
    ingestedDate: '04 Nov',
    description: 'Overhead rapid DC pantograph charging depots at Gaborone Main Mall and Station.',
    capitalAsk: 2650000,
    category: 'strategic'
  }
];

export const INITIAL_PROJECTS: ProjectCardData[] = [
  // 1. IDEA INTAKE
  {
    id: 'CEDA-2026-0118',
    stageTag: '[INT-118]',
    stageId: 'intake',
    title: 'Automated Sorghum Processing Mill',
    applicant: {
      name: 'Kago Sebego',
      nationalId: 'BW-710293481',
      organization: 'Tutume Agro-Holdings Pty Ltd',
      location: 'Tutume District'
    },
    description: 'Mobile solar-powered milling system designed for smallholder farmers in Tutume district.',
    sector: 'AgriTech & Food',
    fundingRequested: 420000,
    coFinancing: 80000,
    equityStakePercent: 10,
    projectedJobs: 18,
    projectedAnnualRevenue: 950000,
    riskRating: 'LOW',
    stageProgress: 40,
    submittedDate: 'Nov 8, 2026',
    lastUpdated: 'Nov 8, 2026',
    cipaNumber: 'CIPA #2026/894',
    kycStatus: 'Docs Verified',
    reviewers: [
      { id: 'rev-1', name: 'Dr. M. Tau', role: 'Energy Advisor', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'KYC verified & valid Omang', completed: true, requiredForNextStage: true },
      { id: 'm2', title: 'Solar unit engineering schematic', completed: true, requiredForNextStage: true },
      { id: 'm3', title: 'Tutume farmer co-op intake list', completed: false, requiredForNextStage: true }
    ],
    tags: ['Docs Verified', 'Agri-Processing'],
    auditLog: [
      { timestamp: 'Nov 8, 2026 09:15', action: 'Ingested into Stage 1', author: 'Portal Ingest' }
    ]
  },
  {
    id: 'CEDA-2026-0121',
    stageTag: '[INT-121]',
    stageId: 'intake',
    title: 'Indigenous Kalahari Melon Seed Cold-Press',
    applicant: {
      name: 'Lesego Modise',
      nationalId: 'BW-820194827',
      organization: 'Kgalagadi Naturals Ltd',
      location: 'Kgalagadi District (Tsabong)'
    },
    description: 'Export-grade cosmetic oil extraction unit leveraging cooperative harvesting models.',
    sector: 'Advanced Manufacturing',
    fundingRequested: 780000,
    coFinancing: 150000,
    equityStakePercent: 12,
    projectedJobs: 24,
    projectedAnnualRevenue: 1800000,
    riskRating: 'LOW',
    stageProgress: 85,
    submittedDate: 'Nov 9, 2026',
    lastUpdated: 'Nov 9, 2026',
    intakeProgressText: 'Intake Completeness 85% Ingested',
    reviewers: [
      { id: 'rev-2', name: 'P. Dube', role: 'Regional Ingest Officer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'Cosmetic grade laboratory certificate', completed: true, requiredForNextStage: true },
      { id: 'm2', title: 'Community gatherer fair-trade agreement', completed: true, requiredForNextStage: true }
    ],
    tags: ['Cosmetics', 'Export', 'Cooperative'],
    auditLog: [
      { timestamp: 'Nov 9, 2026 14:20', action: 'Dossier Logged', author: 'P. Dube' }
    ]
  },

  // 2. SCREENING
  {
    id: 'CEDA-2026-0112',
    stageTag: '[SCR-112]',
    stageId: 'screening',
    title: 'Lithium-Ion Battery Recycling Hub',
    applicant: {
      name: 'Goitseone Morake',
      nationalId: 'BW-650392819',
      organization: 'GreenCycle Power Hub Pty Ltd',
      location: 'Gaborone West Industrial'
    },
    description: 'Gaborone West industrial battery reclamation & cathode re-smelting pilot.',
    sector: 'CleanTech & Solar',
    fundingRequested: 1850000,
    coFinancing: 500000,
    equityStakePercent: 15,
    projectedJobs: 38,
    projectedAnnualRevenue: 4200000,
    riskRating: 'MEDIUM',
    stageProgress: 85,
    submittedDate: 'Nov 3, 2026',
    lastUpdated: 'Nov 7, 2026',
    kycStatus: 'Passed KYC',
    complianceRows: [
      { label: 'CIPA Statutory Compliance', value: '100%', isChecked: true },
      { label: '>50% Citizen Youth Status', value: '65% Yth', isChecked: true }
    ],
    reviewers: [
      { id: 'rev-3', name: 'E. Balogi', role: 'Vetting Officer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'BURS Corporate Tax Status Clear', completed: true, requiredForNextStage: true },
      { id: 'm2', title: 'DEA Environmental Screening Notice', completed: true, requiredForNextStage: true }
    ],
    tags: ['Lithium', 'Circular Economy', 'Ready for Eval'],
    auditLog: [
      { timestamp: 'Nov 3, 2026', action: 'Passed KYC Clearance', author: 'E. Balogi' }
    ]
  },

  // 3. EVALUATION
  {
    id: 'CEDA-2026-0105',
    stageTag: '[EVL-105]',
    stageId: 'evaluation',
    title: 'AI Crop Yield Forecast Engine',
    applicant: {
      name: 'Dr. K. Seretse',
      nationalId: 'BW-780192837',
      organization: 'Botswana Precision Agri Analytics',
      location: 'Barolong Farms / Lobatse'
    },
    description: 'Satellite radar and hyperspectral soil telemetry for rainfed arable agricultural zones.',
    sector: 'AgriTech & Food',
    fundingRequested: 1450000,
    coFinancing: 350000,
    equityStakePercent: 12,
    projectedJobs: 32,
    projectedAnnualRevenue: 3800000,
    riskRating: 'LOW',
    stageProgress: 92,
    submittedDate: 'Oct 28, 2026',
    lastUpdated: 'Nov 8, 2026',
    compositeScore: 87.6,
    leadEvaluator: 'Dr. K. Seretse',
    quorumMet: true,
    radarMetrics: {
      impact: 92,
      feasibility: 85,
      viability: 88,
      natAlign: 95
    },
    reviewers: [
      { id: 'rev-4', name: 'Dr. B. Masire', role: 'Chief Economist', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'Financial DCF & Yield Stress Test', completed: true, requiredForNextStage: true },
      { id: 'm2', title: 'Multi-spectral satellite sensor validation', completed: true, requiredForNextStage: true }
    ],
    tags: ['Satellite', 'Food Security', 'AI Analytics'],
    auditLog: [
      { timestamp: 'Nov 8, 2026', action: 'Composite 87.6 Cleared', author: 'Dr. B. Masire' }
    ]
  },

  // 4. EXPERT REVIEW
  {
    id: 'CEDA-2026-0092',
    stageTag: '[REV-092]',
    stageId: 'expert_review',
    title: 'Okavango Bio-Waste Hydroponics System',
    applicant: {
      name: 'Kagiso Kenneth',
      nationalId: 'BW-681029482',
      organization: 'Delta Greens Agriculture',
      location: 'Maun / Shorobe'
    },
    description: 'Smart closed-loop nutrient reclamation supplying hospitality chains in the Delta.',
    sector: 'AgriTech & Food',
    fundingRequested: 1650000,
    coFinancing: 400000,
    equityStakePercent: 14,
    projectedJobs: 28,
    projectedAnnualRevenue: 3400000,
    riskRating: 'LOW',
    stageProgress: 88,
    submittedDate: 'Oct 15, 2026',
    lastUpdated: 'Nov 9, 2026',
    reviewers: [
      { id: 'rev-5', name: 'Prof. J. Sebele', role: 'Robotics Chair (BIUST)', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'Independent water safety laboratory audit', completed: true, requiredForNextStage: true }
    ],
    tags: ['Hydroponics', 'Delta Lodges', 'Eco-Agri'],
    auditLog: [
      { timestamp: 'Oct 15, 2026', action: 'Transferred to Expert Panel', author: 'System' }
    ]
  },

  // 5. APPROVAL BOARD
  {
    id: 'CEDA-2026-0084',
    stageTag: '[APP-084]',
    stageId: 'approval_board',
    title: 'Maun Solar Cold-Chain Fleet Facility',
    applicant: {
      name: 'Batho Sebego',
      nationalId: 'BW-620491827',
      organization: 'DeltaCold Express Transporters',
      location: 'Maun Airport Cargo Logistics'
    },
    description: 'Fleet of 8 refrigerated hybrid solar transport trucks ensuring 0% spoilage.',
    sector: 'Logistics & Supply',
    fundingRequested: 3500000,
    coFinancing: 1000000,
    equityStakePercent: 15,
    projectedJobs: 42,
    projectedAnnualRevenue: 7800000,
    riskRating: 'LOW',
    stageProgress: 98,
    submittedDate: 'Sep 12, 2026',
    lastUpdated: 'Nov 10, 2026',
    reviewers: [
      { id: 'rev-8', name: 'Hon. K. Sechele', role: 'Board Chairman', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'Board Quorum Ratification Approved', completed: true, requiredForNextStage: true }
    ],
    tags: ['Cold Chain', 'Logistics', 'Food Waste'],
    auditLog: [
      { timestamp: 'Nov 10, 2026', action: 'Board Quorum Ratified', author: 'Hon. K. Sechele' }
    ]
  },

  // 6. PILOT PHASE
  {
    id: 'CEDA-2026-0065',
    stageTag: '[PLT-065]',
    stageId: 'pilot_phase',
    title: 'Gaborone Commuter Electric Minibus Feeder Line',
    applicant: {
      name: 'Onalenna Kwapa',
      nationalId: 'BW-830291845',
      organization: 'Kgale e-Mobility Consortium',
      location: 'Gaborone CBD & Tlokweng Route'
    },
    description: '3-vehicle trial of 18-passenger electric combis with rapid overhead charging hub.',
    sector: 'Logistics & Supply',
    fundingRequested: 3800000,
    coFinancing: 1200000,
    equityStakePercent: 20,
    projectedJobs: 28,
    projectedAnnualRevenue: 5100000,
    riskRating: 'MEDIUM',
    stageProgress: 75,
    submittedDate: 'Aug 04, 2026',
    lastUpdated: 'Nov 09, 2026',
    reviewers: [
      { id: 'rev-10', name: 'C. Ditshupo', role: 'Pilot Field Director', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'BOTA Transport Department route clearance', completed: true, requiredForNextStage: true }
    ],
    tags: ['Electric Transit', 'Clean Air'],
    auditLog: [
      { timestamp: 'Aug 04, 2026', action: 'Sandbox Commenced', author: 'C. Ditshupo' }
    ]
  },

  // 7. IMPLEMENTATION
  {
    id: 'CEDA-2026-0042',
    stageTag: '[IMP-042]',
    stageId: 'implementation',
    title: 'Pandamatenga Cereal Grain Silo Automation',
    applicant: {
      name: 'Gaone Raphaka',
      nationalId: 'BW-690284729',
      organization: 'Chobe Grain Reserves Pty Ltd',
      location: 'Pandamatenga Plains'
    },
    description: 'Smart IoT grain aeration and fumigation control system protecting 45,000 tons.',
    sector: 'AgriTech & Food',
    fundingRequested: 5200000,
    coFinancing: 1800000,
    equityStakePercent: 15,
    projectedJobs: 64,
    projectedAnnualRevenue: 14500000,
    riskRating: 'LOW',
    stageProgress: 82,
    submittedDate: 'Jun 19, 2026',
    lastUpdated: 'Nov 07, 2026',
    reviewers: [
      { id: 'rev-11', name: 'K. Mmolawa', role: 'Capital Officer', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: 'Tranche 2 Capital Disbursement Released', completed: true, requiredForNextStage: true }
    ],
    tags: ['Grain Silos', 'Pandamatenga'],
    auditLog: [
      { timestamp: 'Nov 07, 2026', action: 'Tranche 2 Disbursed', author: 'CEDA Treasury' }
    ]
  },

  // 8. REALIZED IMPACT
  {
    id: 'CEDA-2026-0021',
    stageTag: '[RES-021]',
    stageId: 'realized_impact',
    title: 'Lobatse Leather Finishing & Upcycling Tannery',
    applicant: {
      name: 'Tebogo Kgosi',
      nationalId: 'BW-640192837',
      organization: 'Kalahari Tannery Exports',
      location: 'Lobatse Industrial Hub'
    },
    description: 'Transforming Botswana Meat Commission raw cattle hides into finished export leather.',
    sector: 'Advanced Manufacturing',
    fundingRequested: 7500000,
    coFinancing: 2500000,
    equityStakePercent: 16,
    projectedJobs: 112,
    projectedAnnualRevenue: 28400000,
    riskRating: 'LOW',
    stageProgress: 100,
    submittedDate: 'Feb 10, 2026',
    lastUpdated: 'Nov 05, 2026',
    reviewers: [
      { id: 'rev-8', name: 'Hon. K. Sechele', role: 'Board Chairman', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces' }
    ],
    milestones: [
      { id: 'm1', title: '112 Direct Botswana Citizen Jobs Verified', completed: true, requiredForNextStage: true }
    ],
    tags: ['Leather', '112 Jobs', 'Export Revenue'],
    auditLog: [
      { timestamp: 'Nov 05, 2026', action: 'Quarterly Audit Verified', author: 'CEDA Socio-Economic Unit' }
    ]
  }
];

export const INITIAL_CONNECTORS: DependencyConnector[] = [
  {
    id: 'conn-1',
    fromProjectId: 'CEDA-2026-0118', // Sorghum Mill (Intake)
    toProjectId: 'CEDA-2026-0112',   // Battery Hub (Screening)
    label: 'Clean Solar Equipment Link',
    type: 'synergy'
  },
  {
    id: 'conn-2',
    fromProjectId: 'CEDA-2026-0112', // Battery Hub (Screening)
    toProjectId: 'CEDA-2026-0105',   // AI Crop Yield (Evaluation)
    label: 'Telemetry Field Battery Supply',
    type: 'supply_chain'
  }
];

export const INITIAL_STICKY_NOTES: CanvasStickyNote[] = [
  {
    id: 'sticky-1',
    text: 'Advisory Note: Dr Masire recommends bundling Sorghum Mill and Kalahari Seed Extraction under the Agri-Processing Fund.',
    author: 'Hon. K. Sechele (Chair)',
    color: 'yellow',
    x: 740,
    y: 60,
    createdAt: 'Nov 10, 2026',
    stageId: 'evaluation'
  }
];

export const ACTIVE_COLLABORATORS: ActiveCollaborator[] = [
  {
    id: 'collab-1',
    name: 'K. Nkgowe',
    role: 'Lead Evaluator',
    color: '#0284c7',
    initials: 'KN',
    status: 'active'
  },
  {
    id: 'collab-2',
    name: 'Dr. T. Tau',
    role: 'Technical Reviewer',
    color: '#1e40af',
    initials: 'TT',
    status: 'active'
  },
  {
    id: 'collab-3',
    name: 'N. Modise',
    role: 'Compliance Director',
    color: '#16a34a',
    initials: 'NM',
    status: 'active'
  }
];

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  {
    id: 'pipeline_orchestrator',
    name: 'Pipeline Orchestrator',
    description: 'Active infinite multi-stage canvas',
    icon: 'layout',
    category: 'core',
    isActive: true
  },
  {
    id: 'screening_matrix',
    name: 'Screening Matrix',
    description: 'Statutory & CIPA compliance',
    icon: 'file-check',
    category: 'core'
  },
  {
    id: 'evaluation_deck',
    name: 'Evaluation Deck',
    description: '5-metric weighted scoring rubric',
    icon: 'sliders',
    category: 'core'
  },
  {
    id: 'board_approvals',
    name: 'Board Approvals',
    description: 'Investment quorum resolutions',
    icon: 'award',
    category: 'core'
  },
  {
    id: 'pilot_deployments',
    name: 'Pilot Deployments',
    description: 'Field telemetry & trial milestones',
    icon: 'rocket',
    category: 'core'
  },
  {
    id: 'impact_telemetry',
    name: 'Impact Telemetry',
    description: 'Job creation & ROI audit metrics',
    icon: 'bar-chart',
    category: 'core'
  },
  {
    id: 'portfolio_analytics',
    name: 'Portfolio Analytics',
    description: 'National macroeconomic & sector charts',
    icon: 'trending-up',
    category: 'enterprise'
  },
  {
    id: 'workflow_rules',
    name: 'Workflow Schemas & Rules',
    description: 'Automated stage advancement rules & limits',
    icon: 'git-fork',
    category: 'enterprise'
  }
];

export const SECTORS: string[] = [
  'All Sectors',
  'AgriTech & Food',
  'CleanTech & Solar',
  'Health & BioTech',
  'Mining & Automation',
  'Digital FinTech',
  'Eco-Tourism',
  'Advanced Manufacturing',
  'Logistics & Supply'
];

export const INITIAL_ADMIN_PERSONNEL = [
  {
    id: 101,
    name: 'Dr. Monametsi Tau',
    email: 'm.tau@ceda.co.bw',
    role: 'Evaluator' as const,
    department: 'CleanTech & Energy Evaluation',
    assignedIdeasCount: 6,
    status: 'active' as const,
    avatarInitials: 'MT',
    lastActive: '3m ago'
  },
  {
    id: 102,
    name: 'Prof. Julia Sebele',
    email: 'j.sebele@biust.ac.bw',
    role: 'Evaluator' as const,
    department: 'Mining Automation (BIUST Lead)',
    assignedIdeasCount: 4,
    status: 'active' as const,
    avatarInitials: 'JS',
    lastActive: '12m ago'
  },
  {
    id: 103,
    name: 'Dr. Boipuso Masire',
    email: 'b.masire@ceda.co.bw',
    role: 'Evaluator' as const,
    department: 'Economic Evaluation & Viability',
    assignedIdeasCount: 8,
    status: 'busy' as const,
    avatarInitials: 'BM',
    lastActive: 'Just now'
  },
  {
    id: 104,
    name: 'Neo Kgosidintsi',
    email: 'n.kgosi@ceda.co.bw',
    role: 'Evaluator' as const,
    department: 'AgriTech & Food Systems',
    assignedIdeasCount: 5,
    status: 'active' as const,
    avatarInitials: 'NK',
    lastActive: '25m ago'
  },
  {
    id: 105,
    name: 'Hon. Kenalemang Sechele',
    email: 'k.sechele@ceda.co.bw',
    role: 'Adjudicator' as const,
    department: 'Executive Adjudication Board (Chair)',
    assignedIdeasCount: 9,
    status: 'active' as const,
    avatarInitials: 'KS',
    lastActive: 'Just now'
  },
  {
    id: 106,
    name: 'Mompati Kgabo',
    email: 'm.kgabo@ceda.co.bw',
    role: 'Adjudicator' as const,
    department: 'National Credit & Risk Board',
    assignedIdeasCount: 7,
    status: 'busy' as const,
    avatarInitials: 'MK',
    lastActive: '1h ago'
  },
  {
    id: 107,
    name: 'Sipho Ramosidi',
    email: 's.ramosidi@ceda.co.bw',
    role: 'Adjudicator' as const,
    department: 'Legal & Intellectual Property Board',
    assignedIdeasCount: 5,
    status: 'active' as const,
    avatarInitials: 'SR',
    lastActive: '40m ago'
  },
  {
    id: 108,
    name: 'Kabo Sechele',
    email: 'admin@ceda.co.bw',
    role: 'Administrator' as const,
    department: 'National Platform Operations',
    assignedIdeasCount: 0,
    status: 'active' as const,
    avatarInitials: 'KS',
    lastActive: 'Active Now'
  },
  {
    id: 109,
    name: 'Patricia Dube',
    email: 'p.dube@ceda.co.bw',
    role: 'Administrator' as const,
    department: 'Compliance & Governance Registry',
    assignedIdeasCount: 0,
    status: 'active' as const,
    avatarInitials: 'PD',
    lastActive: '10m ago'
  },
  {
    id: 110,
    name: 'Thabo Kgosidintsi',
    email: 'agent.thabo@ceda.co.bw',
    role: 'Agent' as const,
    department: 'Citizen Enquiries & Support Desk',
    assignedIdeasCount: 0,
    assignedMessagesCount: 2,
    maxChatCapacity: 3,
    agentAvailability: 'available' as const,
    status: 'active' as const,
    avatarInitials: 'TK',
    lastActive: 'Active Now'
  },
  {
    id: 111,
    name: 'Lorato Molosiwa',
    email: 'agent.lorato@ceda.co.bw',
    role: 'Agent' as const,
    department: 'Tutume Regional Support Unit',
    assignedIdeasCount: 0,
    assignedMessagesCount: 0,
    maxChatCapacity: 3,
    agentAvailability: 'available' as const,
    status: 'active' as const,
    avatarInitials: 'LM',
    lastActive: '4m ago'
  },
  {
    id: 112,
    name: 'Kutlo Phiri',
    email: 'agent.kutlo@ceda.co.bw',
    role: 'Agent' as const,
    department: 'AgriTech Submitter Care Desk',
    assignedIdeasCount: 0,
    assignedMessagesCount: 0,
    maxChatCapacity: 3,
    agentAvailability: 'busy' as const,
    status: 'busy' as const,
    avatarInitials: 'KP',
    lastActive: '15m ago'
  }
];

export const INITIAL_ENQUIRY_MESSAGES: SubmitterEnquiryMessage[] = [];

export const INITIAL_SUBMISSION_BATCHES = [
  {
    id: 'batch-agri-1',
    batchCode: 'QUEUE-AGRI-042',
    category: 'AgriTech & Food',
    unassignedCount: 18,
    averageCapitalAsk: 620000,
    arrivalDate: 'Today 08:30',
    urgency: 'Priority' as const,
    summary: 'Smallholder mobile mills, horticulture hydroponics & solar cold-storage proposals.'
  },
  {
    id: 'batch-energy-2',
    batchCode: 'QUEUE-SOLAR-038',
    category: 'CleanTech & Solar',
    unassignedCount: 14,
    averageCapitalAsk: 1450000,
    arrivalDate: 'Today 10:15',
    urgency: 'Fast-Track' as const,
    summary: 'Off-grid borehole PV grids, battery upcycling hubs & EV transit charging.'
  },
  {
    id: 'batch-health-3',
    batchCode: 'QUEUE-HEALTH-021',
    category: 'Health & BioTech',
    unassignedCount: 9,
    averageCapitalAsk: 980000,
    arrivalDate: 'Yesterday',
    urgency: 'Standard' as const,
    summary: 'Tele-triage clinics, drone pathology delivery & indigenous phytomedicine.'
  },
  {
    id: 'batch-fin-4',
    batchCode: 'QUEUE-FIN-019',
    category: 'Digital FinTech',
    unassignedCount: 11,
    averageCapitalAsk: 840000,
    arrivalDate: 'Nov 10',
    urgency: 'Standard' as const,
    summary: 'Cattle biometric tokenization, micro-invoice factoring & SACCO lending.'
  },
  {
    id: 'batch-mfg-5',
    batchCode: 'QUEUE-MFG-015',
    category: 'Advanced Manufacturing',
    unassignedCount: 7,
    averageCapitalAsk: 2800000,
    arrivalDate: 'Nov 09',
    urgency: 'Priority' as const,
    summary: 'Export leather finishing, sorghum protein isolates & ash-brick construction.'
  }
];

export const INITIAL_APPLICATION_FIELDS = [
  {
    id: 'field-1',
    label: 'Innovation Project Title',
    fieldType: 'text' as const,
    placeholder: 'e.g. Kalahari Smart Solar Micro-Grids',
    required: true,
    helpText: 'Official enterprise name of the technology or business innovation.'
  },
  {
    id: 'field-2',
    label: 'Citizen Entrepreneur / Promoter Name',
    fieldType: 'text' as const,
    placeholder: 'e.g. Lesego Modise',
    required: true,
    helpText: 'Full legal name of the primary Botswana citizen applicant.'
  },
  {
    id: 'field-3',
    label: 'Botswana Omang National ID',
    fieldType: 'text' as const,
    placeholder: 'e.g. BW-710293481',
    required: true,
    helpText: 'Validated against national civil registry database.'
  },
  {
    id: 'field-4',
    label: 'Strategic Economic Sector',
    fieldType: 'select' as const,
    options: ['AgriTech & Food', 'CleanTech & Solar', 'Health & BioTech', 'Digital FinTech', 'Advanced Manufacturing', 'Mining & Automation', 'Eco-Tourism'],
    required: true,
    helpText: 'Categorization aligns with CEDA national portfolio mandates.'
  },
  {
    id: 'field-5',
    label: 'Executive Problem & Commercial Value Proposition',
    fieldType: 'textarea' as const,
    placeholder: 'Describe the market bottleneck and your competitive solution...',
    required: true,
    helpText: 'Minimum 50 words explaining customer traction and socio-economic impact.'
  },
  {
    id: 'field-6',
    label: 'CEDA Funding Requested (BWP)',
    fieldType: 'number' as const,
    placeholder: 'e.g. 1,250,000',
    required: true,
    helpText: 'Total capital facility requested across grant, debt, or equity financing.'
  },
  {
    id: 'field-7',
    label: 'Projected Direct Citizen Employment',
    fieldType: 'number' as const,
    placeholder: 'e.g. 24',
    required: true,
    helpText: 'Audited youth and citizen direct jobs created in the first 24 months.'
  },
  {
    id: 'field-8',
    label: 'Comprehensive Business Plan & Financial Model',
    fieldType: 'file' as const,
    required: true,
    helpText: 'Attach PDF document with 3-year cash flow projections and CIPA certificates.'
  }
];

export const INITIAL_WORKFLOW_CYCLES = [
  {
    id: 'wf-standard-9',
    title: 'CEDA National Commercialization Standard',
    description: 'Statutory 9-stage full technical diligence, stress-test, and board adjudication.',
    isActive: true,
    stages: [
      { id: 'stg-1', name: 'Submission & Intake Ingest', stepNumber: 1, assignedRole: 'Administrator' as const, thresholdCriteria: 'Citizen KYC Verified', targetTurnaroundDays: 2, color: '#0284c7' },
      { id: 'stg-2', name: 'Statutory & Tax Screening', stepNumber: 2, assignedRole: 'Administrator' as const, thresholdCriteria: 'BURS Clearance & CIPA Search', targetTurnaroundDays: 3, color: '#7c3aed' },
      { id: 'stg-3', name: 'Technical & Financial Evaluation', stepNumber: 3, assignedRole: 'Evaluator' as const, thresholdCriteria: 'Weighted Rubric >= 75/100', targetTurnaroundDays: 7, color: '#ea580c' },
      { id: 'stg-4', name: 'Expert Committee Review', stepNumber: 4, assignedRole: 'Evaluator' as const, thresholdCriteria: 'Technical Safety & IP Audit', targetTurnaroundDays: 5, color: '#1e40af' },
      { id: 'stg-5', name: 'Adjudication Board Chamber', stepNumber: 5, assignedRole: 'Adjudicator' as const, thresholdCriteria: 'Quorum Vote (>= 3/4)', targetTurnaroundDays: 4, color: '#16a34a' },
      { id: 'stg-6', name: 'Sandbox Pilot Deployment', stepNumber: 6, assignedRole: 'Evaluator' as const, thresholdCriteria: 'Controlled Cohort Validation', targetTurnaroundDays: 30, color: '#d97706' },
      { id: 'stg-7', name: 'Capital Disbursement & Implementation', stepNumber: 7, assignedRole: 'Administrator' as const, thresholdCriteria: 'Tranche Milestone Sign-off', targetTurnaroundDays: 14, color: '#0d9488' },
      { id: 'stg-8', name: 'Impact Measurement & Audit', stepNumber: 8, assignedRole: 'Evaluator' as const, thresholdCriteria: 'Verified Employment Records', targetTurnaroundDays: 90, color: '#15803d' },
      { id: 'stg-9', name: 'Statutory Archive', stepNumber: 9, assignedRole: 'Administrator' as const, thresholdCriteria: 'Final Repayment & Knowledge Ledger', targetTurnaroundDays: 365, color: '#475569' }
    ]
  },
  {
    id: 'wf-fasttrack-5',
    title: 'Fast-Track Youth Entrepreneurship Grant (BWP < 500k)',
    description: 'Accelerated 5-stage pipeline for rapid micro-venture disbursements.',
    isActive: false,
    stages: [
      { id: 'ft-1', name: 'Instant Ingest & KYC', stepNumber: 1, assignedRole: 'Administrator' as const, thresholdCriteria: 'Age 18-35 Omang Validation', targetTurnaroundDays: 1, color: '#0284c7' },
      { id: 'ft-2', name: 'Fast-Track Screening', stepNumber: 2, assignedRole: 'Administrator' as const, thresholdCriteria: 'Clean Credit Bureau Record', targetTurnaroundDays: 2, color: '#7c3aed' },
      { id: 'ft-3', name: 'Rapid Technical Appraisal', stepNumber: 3, assignedRole: 'Evaluator' as const, thresholdCriteria: 'Feasibility Score >= 70', targetTurnaroundDays: 3, color: '#ea580c' },
      { id: 'ft-4', name: 'Delegated Executive Clearance', stepNumber: 4, assignedRole: 'Adjudicator' as const, thresholdCriteria: 'Single Adjudicator Warrant', targetTurnaroundDays: 2, color: '#16a34a' },
      { id: 'ft-5', name: 'Direct Mobile Disbursement', stepNumber: 5, assignedRole: 'Administrator' as const, thresholdCriteria: 'Escrow Account Funding', targetTurnaroundDays: 2, color: '#0d9488' }
    ]
  }
];

export const ADMIN_CANVAS_TOOLS: AdminCanvasTool[] = [
  {
    id: 'tool-eval-pool',
    name: 'Evaluator Pool',
    type: 'evaluator_pool',
    icon: 'Users',
    description: 'Cluster evaluators into a specialized due-diligence unit',
    color: '#d97706'
  },
  {
    id: 'tool-rev-comm',
    name: 'Review Committee',
    type: 'review_committee',
    icon: 'ShieldCheck',
    description: 'Statutory technical and safety appraisal committee',
    color: '#0284c7'
  },
  {
    id: 'tool-adj-board',
    name: 'Adjudication Board',
    type: 'adjudication_board',
    icon: 'Award',
    description: 'Decision-making quorum bench with voting warrants',
    color: '#16a34a'
  },
  {
    id: 'tool-workflow',
    name: 'Workflow Cycle',
    type: 'workflow',
    icon: 'GitFork',
    description: 'Stage gating, turnarounds and advancement thresholds',
    color: '#7c3aed'
  },
  {
    id: 'tool-form-setting',
    name: 'Application Form Setting',
    type: 'form_settings',
    icon: 'FileText',
    description: 'Design citizen application form schemas & attachments',
    color: '#0d9488'
  }
];

export const INITIAL_QUEUE_IDEAS: QueueIdeaItem[] = [];

export const INITIAL_CANVAS_STATIONS: CanvasEvaluatorStation[] = [
  {
    id: 'station-101',
    userId: 101, // Dr. Monametsi Tau (CleanTech & Energy Lead)
    user: INITIAL_ADMIN_PERSONNEL[0],
    x: 60,
    y: 340,
    stationType: 'evaluator',
    assignedIdeaIds: ['assigned-1', 'assigned-2', 'assigned-3'],
    assignedMessageIds: [],
    autoReplenishOnFinish: true, // "one out one in from the queue"
    targetCapacity: 3
  },
  {
    id: 'station-agent-201',
    userId: 110, // Thabo Kgosidintsi (Citizen Enquiries Desk)
    user: INITIAL_ADMIN_PERSONNEL.find(p => p.id === 110) || INITIAL_ADMIN_PERSONNEL[3],
    x: 760,
    y: 340,
    stationType: 'agent',
    assignedIdeaIds: [],
    assignedMessageIds: [],
    autoReplenishOnFinish: true,
    targetCapacity: 3
  },
  {
    id: 'station-agent-202',
    userId: 111, // Lorato Molosiwa (Tutume Regional Support Unit)
    user: INITIAL_ADMIN_PERSONNEL.find(p => p.id === 111) || INITIAL_ADMIN_PERSONNEL[4],
    x: 760,
    y: 660,
    stationType: 'agent',
    assignedIdeaIds: [],
    assignedMessageIds: [],
    autoReplenishOnFinish: true,
    targetCapacity: 3
  }
];

export const INITIAL_CANVAS_ANNOTATIONS: CanvasAnnotationItem[] = [
  {
    id: 'note-cleantech',
    type: 'zone_banner',
    x: 60,
    y: 265,
    text: 'EVALUATION DESK — CLEANTECH & AGRITECH',
    subtext: 'Dr. Tau cohort • Target turnaround 7 days statutory',
    color: '#fef08a', // classic yellow
    stickerIcon: 'idea',
    author: 'Administrator'
  },
  {
    id: 'sticker-urgent',
    type: 'sticker',
    x: 425,
    y: 272,
    text: 'SLA Watch Group',
    subtext: '2.4 days left',
    color: '#fed7aa', // warm amber
    stickerIcon: 'warning',
    author: 'Admin SLA Engine'
  },
  {
    id: 'note-agent-desk',
    type: 'zone_banner',
    x: 760,
    y: 265,
    text: 'CITIZEN ENQUIRIES & AGENT ROUTING DESK',
    subtext: 'Thabo & Lorato • Assign from Admin Message Queue above',
    color: '#ccfbf1', // soft teal
    stickerIcon: 'headphones',
    author: 'Administrator'
  }
];

export const INITIAL_ASSIGNED_IDEAS: Record<string, QueueIdeaItem> = {
  'assigned-1': {
    id: 'assigned-1',
    code: 'EVAL-CLT-101',
    title: 'Off-Grid Smart Borehole Inverter Array',
    category: 'CleanTech & Solar',
    arrivalDate: 'Nov 07 08:00 AM',
    urgency: 'Priority',
    capitalAsk: 850000,
    evaluatorId: 101,
    status: 'evaluating',
    progress: 75,
    slaRemainingDays: 2.4, // 2 days 10 hours left
    slaTargetDays: 7
  },
  'assigned-2': {
    id: 'assigned-2',
    code: 'EVAL-AGR-102',
    title: 'Solar-Powered Milk Chiller Cooperative Hub',
    category: 'AgriTech & Food',
    arrivalDate: 'Nov 08 10:30 AM',
    urgency: 'Fast-Track',
    capitalAsk: 420000,
    evaluatorId: 101,
    status: 'evaluating',
    progress: 40,
    slaRemainingDays: 4.1, // 4 days left
    slaTargetDays: 5
  },
  'assigned-3': {
    id: 'assigned-3',
    code: 'EVAL-BIO-103',
    title: 'Agricultural Waste Biomass Pellet Processing',
    category: 'CleanTech & Solar',
    arrivalDate: 'Nov 09 02:00 PM',
    urgency: 'Standard',
    capitalAsk: 620000,
    evaluatorId: 101,
    status: 'evaluating',
    progress: 15,
    slaRemainingDays: 6.2, // 6 days left
    slaTargetDays: 7
  }
};

export const INITIAL_CANVAS_POOLS: CanvasPoolContainer[] = [
  {
    id: 'pool-tech-eval',
    title: 'Technical Evaluation Pool',
    type: 'evaluator_pool',
    x: 60,
    y: 720,
    userIds: [102, 103, 104], // Prof. Julia Sebele, Dr. Boipuso Masire, Neo Kgosidintsi
    color: '#d97706'
  }
];

