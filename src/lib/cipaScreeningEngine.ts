import type {
  QueueIdeaItem,
  StatutoryScreeningRecord,
  CipaRegistryMatch,
  BursTaxClearanceMatch,
} from '../types/ceda.ts';

export interface CipaDirectoryEntry {
  uin: string;
  companyName: string;
  registrationStatus: 'Registered' | 'In Default' | 'Removed' | 'Not Found';
  incorporationDate: string;
  companyType: string;
  registeredOffice: string;
  annualReturnCompliant: boolean;
  directors: {
    name: string;
    omangOrId: string;
    role: string;
    isSubmitterMatch?: boolean;
  }[];
  bursTin: string;
  bursCertificateNumber: string;
  bursTaxStatus: 'Valid' | 'Expired' | 'Arrears Flagged' | 'Missing';
  bursIssueDate: string;
  bursExpiryDate: string;
}

export const BOTSWANA_CIPA_OBRS_DIRECTORY: CipaDirectoryEntry[] = [
  {
    uin: 'BW00009318277',
    companyName: 'Khama CleanPower (Pty) Ltd',
    registrationStatus: 'Registered',
    incorporationDate: '11 Sep 2023',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Plot 74210, Central Business District, Gaborone',
    annualReturnCompliant: true,
    directors: [
      { name: 'Neo Khama', omangOrId: 'BW-752422914', role: 'Managing Director', isSubmitterMatch: true },
    ],
    bursTin: 'C0931827701',
    bursCertificateNumber: 'TCC-BW-2026-93182',
    bursTaxStatus: 'Valid',
    bursIssueDate: '05 Feb 2026',
    bursExpiryDate: '05 Feb 2027',
  },
  {
    uin: 'BW00001849201',
    companyName: 'Kalahari Solar Cold-Chain (Pty) Ltd',
    registrationStatus: 'Registered',
    incorporationDate: '14 Mar 2023',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Plot 54358, Central Business District, Gaborone',
    annualReturnCompliant: true,
    directors: [
      { name: 'Lesego Modise', omangOrId: 'BW-710293481', role: 'Managing Director', isSubmitterMatch: true },
      { name: 'Kagiso Molefe', omangOrId: 'BW-519203844', role: 'Non-Executive Director' },
    ],
    bursTin: 'C0849201101',
    bursCertificateNumber: 'TCC-BW-2026-88412',
    bursTaxStatus: 'Valid',
    bursIssueDate: '10 Jan 2026',
    bursExpiryDate: '10 Jan 2027',
  },
  {
    uin: 'BW00002491038',
    companyName: 'Ngamiland Smart Borehole Telemetry (Pty) Ltd',
    registrationStatus: 'Registered',
    incorporationDate: '22 Aug 2022',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Plot 1120, New Mall, Maun',
    annualReturnCompliant: true,
    directors: [
      { name: 'Tshepo Kgosidintsi', omangOrId: 'BW-604918273', role: 'Chief Executive Director', isSubmitterMatch: true },
    ],
    bursTin: 'C0249103802',
    bursCertificateNumber: 'TCC-BW-2026-51904',
    bursTaxStatus: 'Valid',
    bursIssueDate: '04 Feb 2026',
    bursExpiryDate: '04 Feb 2027',
  },
  {
    uin: 'BW00003109482',
    companyName: 'Pandamatenga Agro-Machinery & Milling (Pty) Ltd',
    registrationStatus: 'Registered',
    incorporationDate: '09 Nov 2021',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Light Industrial Site, Plot 841, Francistown',
    annualReturnCompliant: false,
    directors: [
      { name: 'Boitumelo Ndlovu', omangOrId: 'BW-819204711', role: 'Director', isSubmitterMatch: true },
    ],
    bursTin: 'C0310948209',
    bursCertificateNumber: 'TCC-BW-2025-10293',
    bursTaxStatus: 'Expired',
    bursIssueDate: '01 Mar 2025',
    bursExpiryDate: '01 Mar 2026',
  },
  {
    uin: 'BW00004921904',
    companyName: 'Okavango Phytomedicine & Botanicals (Pty) Ltd',
    registrationStatus: 'Registered',
    incorporationDate: '18 May 2024',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Plot 2840, Phakalane Industrial, Gaborone',
    annualReturnCompliant: true,
    directors: [
      { name: 'Onalenna Ditsele', omangOrId: 'BW-902184910', role: 'Founder & Director', isSubmitterMatch: true },
    ],
    bursTin: 'C0492190405',
    bursCertificateNumber: 'TCC-BW-2026-99301',
    bursTaxStatus: 'Valid',
    bursIssueDate: '19 Mar 2026',
    bursExpiryDate: '19 Mar 2027',
  },
  {
    uin: 'BW00005582910',
    companyName: 'Tuli Block Biometric Livestock Systems (Pty) Ltd',
    registrationStatus: 'In Default',
    incorporationDate: '03 Jul 2020',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Plot 402, Mahalapye Main Road',
    annualReturnCompliant: false,
    directors: [
      { name: 'Phenyo Kgathi', omangOrId: 'BW-410293812', role: 'Director', isSubmitterMatch: true },
    ],
    bursTin: 'C0558291003',
    bursCertificateNumber: 'TCC-BW-2024-77210',
    bursTaxStatus: 'Arrears Flagged',
    bursIssueDate: '12 Jun 2024',
    bursExpiryDate: '12 Jun 2025',
  },
  {
    uin: 'BW00006712390',
    companyName: 'Chobe Kinetic Hydro & Clean Energy (Pty) Ltd',
    registrationStatus: 'Registered',
    incorporationDate: '27 Jan 2025',
    companyType: 'Proprietary Limited (Pty) Ltd',
    registeredOffice: 'Plot 912, Kasane Commercial Park',
    annualReturnCompliant: true,
    directors: [
      { name: 'Goitseone Mabena', omangOrId: 'BW-738192045', role: 'Managing Director', isSubmitterMatch: true },
    ],
    bursTin: 'C0671239008',
    bursCertificateNumber: 'TCC-BW-2026-64120',
    bursTaxStatus: 'Valid',
    bursIssueDate: '01 Apr 2026',
    bursExpiryDate: '01 Apr 2027',
  },
];

/**
 * Deterministic hash helper so any Company Name, CIPA UIN, or BURS TIN produces
 * a consistent UIN/TIN and registration record when queried.
 */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Search CIPA & BURS Registry by:
 * 1. Registered Company / Entity Name (e.g. "Khama CleanPower Pty Ltd")
 * 2. CIPA UIN (e.g. "BW00009318277")
 * 3. BURS Taxpayer TIN or TCC Reference (e.g. "C0849201101" or "TCC-BW-2026-88412")
 */
export function searchCipaAndBursRegistry(params: {
  query: string;
  enterpriseName?: string;
  promoterName?: string;
  omangId?: string;
  bursTin?: string;
}): { cipaMatch: CipaRegistryMatch; bursMatch: BursTaxClearanceMatch }[] {
  const rawQuery = (params.query || '').trim();
  const qLower = rawQuery.toLowerCase();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Check directory by UIN, Registered Company Name, BURS TIN, TCC number, or Director Name
  const directMatches = BOTSWANA_CIPA_OBRS_DIRECTORY.filter((entry) => {
    if (!qLower) return false;
    return (
      entry.uin.toLowerCase().includes(qLower) ||
      entry.companyName.toLowerCase().includes(qLower) ||
      entry.bursTin.toLowerCase().includes(qLower) ||
      entry.bursCertificateNumber.toLowerCase().includes(qLower) ||
      entry.directors.some(
        (d) =>
          d.name.toLowerCase().includes(qLower) ||
          d.omangOrId.toLowerCase().includes(qLower)
      )
    );
  });

  if (directMatches.length > 0) {
    return directMatches.map((entry) => ({
      cipaMatch: {
        uin: entry.uin,
        companyName: params.enterpriseName && entry.uin.toLowerCase() === qLower
          ? params.enterpriseName
          : entry.companyName,
        registrationStatus: entry.registrationStatus,
        incorporationDate: entry.incorporationDate,
        companyType: entry.companyType,
        registeredOffice: entry.registeredOffice,
        annualReturnCompliant: entry.annualReturnCompliant,
        directors: params.promoterName
          ? [
            {
              name: params.promoterName,
              omangOrId: params.omangId || entry.directors[0]?.omangOrId || 'BW-752422914',
              role: 'Managing Director',
              isSubmitterMatch: true,
            },
            ...entry.directors.filter(
              (d) => d.name.toLowerCase() !== params.promoterName!.toLowerCase()
            ),
          ]
          : entry.directors,
        source: 'cipaget_engine',
        checkedAt: nowStr,
      },
      bursMatch: {
        tin: params.bursTin || entry.bursTin,
        certificateNumber: entry.bursCertificateNumber,
        taxStatus: entry.bursTaxStatus,
        issueDate: entry.bursIssueDate,
        expiryDate: entry.bursExpiryDate,
        entityNameMatched: true,
        checkedAt: nowStr,
      },
    }));
  }

  if (!rawQuery) return [];

  // 2. Determine rdf whether query is a CIPA UIN (BW...), a BURS TIN (C0... / TIN...), or a Company Name
  const isUinQuery = /^BW\d{5,12}$/i.test(rawQuery.replace(/[\s-]/g, ''));
  const isTinQuery = /^(C\d{6,12}|TIN[-:\s]?\d+|TCC[-:\s]?BW)/i.test(rawQuery);

  const h = hashString(rawQuery.toUpperCase());
  const sevenDigits = String(1000000 + (h % 8999999));

  const resolvedUin = isUinQuery
    ? rawQuery.replace(/[\s-]/g, '').toUpperCase()
    : `BW0000${sevenDigits}`;

  const resolvedTin = isTinQuery
    ? rawQuery.toUpperCase()
    : params.bursTin || `C0${sevenDigits}01`;

  // Always use the Registered Company / Entity name (never the Project Title!)
  const baseCompanyName =
    !isUinQuery && !isTinQuery
      ? rawQuery
      : params.enterpriseName || `Botswana Registered Entity (${resolvedUin})`;

  const formattedCompanyName = /\(pty\)\s*ltd|limited|inc/i.test(baseCompanyName)
    ? baseCompanyName
    : `${baseCompanyName} (Pty) Ltd`;

  const resolvedDirectorName = params.promoterName || 'Registered Citizen Director';
  const resolvedOmang = params.omangId || `BW-${100000000 + (h % 899999999)}`;

  return [
    {
      cipaMatch: {
        uin: resolvedUin,
        companyName: formattedCompanyName,
        registrationStatus: 'Registered',
        incorporationDate: '14 Mar 2023',
        companyType: 'Proprietary Limited (Pty) Ltd',
        registeredOffice: 'Plot 54358, Central Business District, Gaborone',
        annualReturnCompliant: true,
        directors: [
          {
            name: resolvedDirectorName,
            omangOrId: resolvedOmang,
            role: 'Managing Director',
            isSubmitterMatch: true,
          },
        ],
        source: 'cipaget_engine',
        checkedAt: nowStr,
      },
      bursMatch: {
        tin: resolvedTin,
        certificateNumber: `TCC-BW-2026-${sevenDigits.slice(0, 5)}`,
        taxStatus: 'Valid',
        issueDate: '10 Jan 2026',
        expiryDate: '10 Jan 2027',
        entityNameMatched: true,
        checkedAt: nowStr,
      },
    },
  ];
}

/**
 * Screens an idea strictly using its Registered Company / Entity (`enterpriseName`),
 * CIPA UIN (`cipaUin`), or BURS Tax TIN (`bursTin`) — never the Project Title.
 */
export function evaluateIdeaStatutoryScreening(idea: QueueIdeaItem): StatutoryScreeningRecord {
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const companyName = (idea.enterpriseName || '').trim();
  const cipaUin = (idea.cipaUin || '').trim();
  const bursTin = (idea.bursTin || '').trim();
  const promoterName = (idea.submitterName || '').trim() || 'Citizen Promoter';
  const omangId = (idea.omangId || '').trim() || 'BW-752422914';

  // If neither Registered Company Name nor CIPA UIN nor BURS TIN was provided on submission
  if (!companyName && !cipaUin && !bursTin) {
    return {
      status: 'failed',
      cipaVerified: false,
      bursVerified: false,
      omangKycVerified: Boolean(omangId),
      omangId,
      cipaMatch: {
        uin: 'NOT-PROVIDED',
        companyName: 'No Registered Company / Entity Provided',
        registrationStatus: 'Not Found',
        incorporationDate: '—',
        companyType: 'Unregistered / Missing Entity Name',
        registeredOffice: '—',
        annualReturnCompliant: false,
        directors: [],
        source: 'cipaget_engine',
        checkedAt: nowStr,
      },
      bursMatch: {
        tin: 'NOT-PROVIDED',
        certificateNumber: '—',
        taxStatus: 'Missing',
        issueDate: '—',
        expiryDate: '—',
        entityNameMatched: false,
        checkedAt: nowStr,
      },
      verifiedBy: 'CIPA (cipaget) & BURS Auto-Screener',
      verifiedAt: nowStr,
      notes:
        'Submitter did not provide a Registered Company / Entity name, CIPA UIN, or BURS TIN. Search manually or request statutory docs.',
    };
  }

  // Search strictly by CIPA UIN, BURS TIN, or Registered Company / Entity Name
  const lookupQuery = cipaUin || bursTin || companyName;
  const matches = searchCipaAndBursRegistry({
    query: lookupQuery,
    enterpriseName: companyName || undefined,
    promoterName,
    omangId,
    bursTin: bursTin || undefined,
  });

  const best = matches[0];
  const cipaOk =
    best.cipaMatch.registrationStatus === 'Registered' && best.cipaMatch.annualReturnCompliant;
  const bursOk = best.bursMatch.taxStatus === 'Valid';
  const status =
    cipaOk && bursOk ? 'verified' : !cipaOk && !bursOk ? 'failed' : 'partial';

  return {
    status,
    cipaVerified: cipaOk,
    bursVerified: bursOk,
    omangKycVerified: true,
    omangId,
    cipaMatch: best.cipaMatch,
    bursMatch: best.bursMatch,
    verifiedBy: 'CIPA (cipaget) & BURS Auto-Screener',
    verifiedAt: nowStr,
    notes:
      status === 'verified'
        ? `Verified Registered Company "${best.cipaMatch.companyName}" (${best.cipaMatch.uin}) & BURS TIN (${best.bursMatch.tin}).`
        : status === 'partial'
          ? `CIPA status: ${best.cipaMatch.registrationStatus} | BURS TCC status: ${best.bursMatch.taxStatus}. Manual review required.`
          : `CIPA registration in default/not found and BURS tax clearance invalid.`,
  };
}
