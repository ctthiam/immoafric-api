import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ImmoAfric database…');

  // ─── 1. UTILISATEURS ────────────────────────────────────────────────
  const hashAdmin = await bcrypt.hash('Admin2024!', 10);
  const hashAgency = await bcrypt.hash('Agency2024!', 10);
  const hashUser = await bcrypt.hash('User2024!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@immoafric.com' },
    update: {},
    create: {
      email: 'admin@immoafric.com',
      passwordHash: hashAdmin,
      firstName: 'Admin',
      lastName: 'ImmoAfric',
      role: 'admin',
      country: 'SN',
      isVerified: true,
    },
  });

  const agencyUser1 = await prisma.user.upsert({
    where: { email: 'contact@dakar-prestige.sn' },
    update: {},
    create: {
      email: 'contact@dakar-prestige.sn',
      passwordHash: hashAgency,
      firstName: 'Mamadou',
      lastName: 'Diallo',
      role: 'agency',
      country: 'SN',
      isVerified: true,
    },
  });

  const agencyUser2 = await prisma.user.upsert({
    where: { email: 'info@abidjan-immo.ci' },
    update: {},
    create: {
      email: 'info@abidjan-immo.ci',
      passwordHash: hashAgency,
      firstName: 'Kofi',
      lastName: 'Asante',
      role: 'agency',
      country: 'CI',
      isVerified: true,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@immoafric.com' },
    update: {},
    create: {
      email: 'demo@immoafric.com',
      passwordHash: hashUser,
      firstName: 'Fatou',
      lastName: 'Ndiaye',
      role: 'user',
      country: 'SN',
      isVerified: true,
    },
  });

  console.log('✅ Utilisateurs créés');

  // ─── 2. AGENCES ─────────────────────────────────────────────────────
  const agency1 = await prisma.agency.upsert({
    where: { slug: 'dakar-prestige-immobilier' },
    update: {},
    create: {
      userId: agencyUser1.id,
      name: 'Dakar Prestige Immobilier',
      slug: 'dakar-prestige-immobilier',
      description:
        'Agence spécialisée dans les biens haut de gamme à Dakar et sur la Petite Côte. Plus de 10 ans d\'expérience dans le marché immobilier sénégalais.',
      phone: '+221 77 123 45 67',
      email: 'contact@dakar-prestige.sn',
      website: 'https://dakar-prestige.sn',
      city: 'Dakar',
      country: 'SN',
      licenseNumber: 'LIC-SN-2024-0042',
      isVerified: true,
      plan: 'pro',
      rating: 4.7,
      reviewsCount: 34,
    },
  });

  const agency2 = await prisma.agency.upsert({
    where: { slug: 'abidjan-immo-premium' },
    update: {},
    create: {
      userId: agencyUser2.id,
      name: 'Abidjan Immo Premium',
      slug: 'abidjan-immo-premium',
      description:
        'Votre partenaire de confiance pour l\'immobilier en Côte d\'Ivoire. Vente, location et gestion locative à Abidjan et dans les grandes villes ivoiriennes.',
      phone: '+225 07 456 78 90',
      email: 'info@abidjan-immo.ci',
      city: 'Abidjan',
      country: 'CI',
      licenseNumber: 'LIC-CI-2024-0115',
      isVerified: true,
      plan: 'starter',
      rating: 4.4,
      reviewsCount: 18,
    },
  });

  console.log('✅ Agences créées');

  // ─── 3. BIENS IMMOBILIERS ───────────────────────────────────────────
  const properties = [
    {
      slug: 'villa-luxe-almadies-dakar',
      title: 'Villa de luxe aux Almadies — vue mer',
      description:
        'Magnifique villa contemporaine de 400 m² aux Almadies, l\'un des quartiers les plus prisés de Dakar. Vue panoramique sur l\'Atlantique, piscine privée, jardin paysager, double garage. Finitions haut de gamme, système domotique, groupe électrogène. Idéal pour une résidence principale ou un investissement diaspora.',
      type: 'villa' as const,
      transaction: 'sale' as const,
      country: 'SN',
      city: 'Dakar',
      neighborhood: 'Almadies',
      price: 350000000,
      currency: 'XOF',
      surface: 400,
      rooms: 8,
      bedrooms: 5,
      bathrooms: 4,
      amenities: ['pool', 'garden', 'garage', 'security', 'generator', 'air_conditioning'],
      isFeatured: true,
      isDiaspora: true,
      hasTitleDeed: true,
      condition: 'new' as const,
      latitude: 14.7461,
      longitude: -17.5024,
      coverUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format',
    },
    {
      slug: 'appartement-f3-plateau-dakar',
      title: 'Appartement F3 meublé — Plateau Dakar',
      description:
        'Bel appartement F3 entièrement rénové au cœur du Plateau, quartier d\'affaires de Dakar. 3ème étage avec ascenseur, vue dégagée, climatisation reversible, cuisine équipée. Idéal pour cadres et expatriés. Proche de tous les commerces et administrations.',
      type: 'apartment' as const,
      transaction: 'rent_furnished' as const,
      country: 'SN',
      city: 'Dakar',
      neighborhood: 'Plateau',
      price: 450000,
      pricePeriod: 'month',
      currency: 'XOF',
      surface: 85,
      rooms: 4,
      bedrooms: 3,
      bathrooms: 2,
      amenities: ['elevator', 'air_conditioning', 'furnished', 'security'],
      isFeatured: true,
      condition: 'new' as const,
      latitude: 14.6937,
      longitude: -17.4441,
      coverUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format',
    },
    {
      slug: 'terrain-viabilise-diamniadio',
      title: 'Terrain viabilisé 500 m² — Diamniadio',
      description:
        'Terrain plat et viabilisé dans la nouvelle ville de Diamniadio, à 30 min de Dakar. Titre foncier disponible, eau, électricité et voirie. Quartier résidentiel en plein essor, proche du Pôle Urbain de Diamniadio. Parfait pour construction villa ou immeuble R+2.',
      type: 'land' as const,
      transaction: 'sale' as const,
      country: 'SN',
      city: 'Diamniadio',
      neighborhood: 'Zone Résidentielle',
      price: 45000000,
      currency: 'XOF',
      surface: 500,
      amenities: ['title_deed', 'utilities'],
      hasTitleDeed: true,
      isDiaspora: true,
      condition: 'new' as const,
      latitude: 14.7166,
      longitude: -17.1738,
      coverUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format',
    },
    {
      slug: 'villa-saly-portudal-bord-mer',
      title: 'Villa pieds dans l\'eau — Saly Portudal',
      description:
        'Villa de vacances exceptionnelle à Saly, directement sur la plage. 250 m² habitables, 4 chambres en suite, grande terrasse, piscine à débordement. Propriété clôturée avec gardiennage 24h/24. Revenu locatif saisonnier attractif. Titre foncier disponible.',
      type: 'villa' as const,
      transaction: 'sale' as const,
      country: 'SN',
      city: 'Saly',
      neighborhood: 'Saly Portudal',
      price: 125000000,
      currency: 'XOF',
      surface: 250,
      rooms: 7,
      bedrooms: 4,
      bathrooms: 4,
      amenities: ['pool', 'beach', 'garden', 'security', 'air_conditioning', 'generator'],
      isFeatured: true,
      isDiaspora: true,
      hasTitleDeed: true,
      condition: 'old' as const,
      latitude: 14.4570,
      longitude: -17.0100,
      coverUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format',
    },
    {
      slug: 'villa-cocody-deux-plateaux-abidjan',
      title: 'Villa moderne — Deux Plateaux Abidjan',
      description:
        'Splendide villa de 320 m² dans le quartier résidentiel des Deux Plateaux à Cocody. Grande piscine, 5 chambres, salon double, bureau, cuisine américaine. Résidence sécurisée avec gardien. Quartier calme et verdoyant, proche écoles internationales et ambassades.',
      type: 'villa' as const,
      transaction: 'sale' as const,
      country: 'CI',
      city: 'Abidjan',
      neighborhood: 'Deux Plateaux',
      price: 280000000,
      currency: 'XOF',
      surface: 320,
      rooms: 9,
      bedrooms: 5,
      bathrooms: 4,
      amenities: ['pool', 'garden', 'garage', 'security', 'air_conditioning'],
      isFeatured: true,
      isDiaspora: true,
      hasTitleDeed: true,
      condition: 'new' as const,
      latitude: 5.3667,
      longitude: -4.0167,
      coverUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format',
    },
    {
      slug: 'appartement-f2-marcory-abidjan',
      title: 'Appartement F2 — Marcory Zone 4',
      description:
        'Appartement 2 pièces bien agencé à Marcory Zone 4, quartier dynamique d\'Abidjan. 2ème étage, balcon, parking privatif. Proche transports en commun, marchés et restaurants. Idéal pour jeune professionnel ou couple.',
      type: 'apartment' as const,
      transaction: 'rent' as const,
      country: 'CI',
      city: 'Abidjan',
      neighborhood: 'Marcory Zone 4',
      price: 220000,
      pricePeriod: 'month',
      currency: 'XOF',
      surface: 55,
      rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ['balcony', 'parking', 'air_conditioning'],
      condition: 'old' as const,
      latitude: 5.3068,
      longitude: -4.0116,
      coverUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format',
    },
    {
      slug: 'bureau-plateau-dakar-120m2',
      title: 'Bureau open space 120 m² — Plateau Dakar',
      description:
        'Plateau de bureaux aménagé de 120 m² au Plateau, cœur d\'affaires de Dakar. Open space cloisonnable, salle de réunion, accueil, kitchenette, 2 sanitaires. Fibre optique, climatisation, immeuble sécurisé. Idéal pour PME, cabinet ou coworking. Disponible immédiatement.',
      type: 'office' as const,
      transaction: 'rent' as const,
      country: 'SN',
      city: 'Dakar',
      neighborhood: 'Plateau',
      price: 800000,
      pricePeriod: 'month',
      currency: 'XOF',
      surface: 120,
      amenities: ['elevator', 'air_conditioning', 'fiber_optic', 'security', 'parking'],
      condition: 'new' as const,
      latitude: 14.6928,
      longitude: -17.4467,
      coverUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format',
    },
    {
      slug: 'studio-meubles-mermoz-dakar',
      title: 'Studio meublé haut standing — Mermoz',
      description:
        'Studio de 35 m² entièrement meublé et équipé à Mermoz, quartier prisé de Dakar. Lit queen, canapé-lit, TV, cuisine équipée, WiFi fibre, climatisation. Résidence gardée. Idéal expatriés, missions courtes ou longues. Disponible de suite.',
      type: 'apartment' as const,
      transaction: 'rent_furnished' as const,
      country: 'SN',
      city: 'Dakar',
      neighborhood: 'Mermoz',
      price: 280000,
      pricePeriod: 'month',
      currency: 'XOF',
      surface: 35,
      rooms: 1,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['furnished', 'wifi', 'air_conditioning', 'security'],
      condition: 'new' as const,
      latitude: 14.7200,
      longitude: -17.4700,
      coverUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format',
    },
  ];

  for (const prop of properties) {
    const { coverUrl, pricePeriod, ...rest } = prop as any;
    const agencyId = ['SN'].includes(rest.country) ? agency1.id : agency2.id;
    const userId = ['SN'].includes(rest.country) ? agencyUser1.id : agencyUser2.id;

    const existing = await prisma.property.findUnique({ where: { slug: rest.slug } });
    if (!existing) {
      const created = await prisma.property.create({
        data: {
          ...rest,
          price: rest.price,
          pricePeriod: pricePeriod ?? 'total',
          agencyId,
          userId,
          status: 'published',
          publishedAt: new Date(),
          amenities: rest.amenities,
          viewsCount: Math.floor(Math.random() * 300) + 20,
        },
      });
      await prisma.propertyImage.create({
        data: {
          propertyId: created.id,
          url: coverUrl,
          isCover: true,
          sortOrder: 0,
        },
      });
    }
  }

  console.log('✅ Biens immobiliers créés');

  // ─── 4. LEADS DÉMO ──────────────────────────────────────────────────
  const firstProperty = await prisma.property.findFirst({
    where: { agencyId: agency1.id },
  });

  if (firstProperty) {
    const leadsData = [
      { name: 'Ibrahima Sow', phone: '+33 6 12 34 56 78', email: 'ibrahima@email.fr', isDiaspora: true, stage: 'new' as const, source: 'immoafric' as const, nationality: 'FR' },
      { name: 'Aïssatou Balde', phone: '+221 77 234 56 78', email: 'aissatou@email.sn', stage: 'contacted' as const, source: 'whatsapp' as const, nationality: 'SN' },
      { name: 'Cheikh Tidiane Fall', phone: '+221 76 345 67 89', email: null, stage: 'visit_planned' as const, source: 'phone' as const, nationality: 'SN' },
      { name: 'Marie Dupont', phone: '+1 647 123 4567', email: 'marie@email.ca', isDiaspora: true, stage: 'negotiation' as const, source: 'immoafric' as const, nationality: 'CA' },
    ];

    for (const lead of leadsData) {
      const existing = await prisma.lead.findFirst({
        where: { agencyId: agency1.id, name: lead.name },
      });
      if (!existing) {
        await prisma.lead.create({
          data: {
            agencyId: agency1.id,
            propertyId: firstProperty.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email ?? undefined,
            isDiaspora: lead.isDiaspora ?? false,
            stage: lead.stage,
            source: lead.source,
            nationality: lead.nationality,
            desiredCity: 'Dakar',
            budgetMin: 80000000,
            budgetMax: 400000000,
          },
        });
      }
    }
  }

  console.log('✅ Leads CRM créés');

  // ─── 5. CATÉGORIES BLOG ─────────────────────────────────────────────
  const categories = [
    { name: 'Marché immobilier', slug: 'marche-immobilier', color: '#0F1B2D', icon: '📈' },
    { name: 'Conseils acheteurs', slug: 'conseils-acheteurs', color: '#C9861A', icon: '🏠' },
    { name: 'Investissement', slug: 'investissement', color: '#10B981', icon: '💰' },
    { name: 'Diaspora', slug: 'diaspora', color: '#6366F1', icon: '✈️' },
    { name: 'Villes & Quartiers', slug: 'villes-quartiers', color: '#F59E0B', icon: '🗺️' },
    { name: 'Juridique & Fiscalité', slug: 'juridique-fiscalite', color: '#EF4444', icon: '⚖️' },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories[cat.slug] = c.id;
  }

  console.log('✅ Catégories blog créées');

  // ─── 6. ARTICLES BLOG ───────────────────────────────────────────────
  const posts = [
    {
      slug: 'immobilier-dakar-2025-tendances',
      title: 'Immobilier à Dakar en 2025 : les quartiers qui montent',
      excerpt: 'Diamniadio, Almadies, Mermoz… Décryptage des zones à fort potentiel d\'investissement au Sénégal cette année.',
      categorySlug: 'marche-immobilier',
      countryTag: 'SN',
      readTime: 6,
      tags: ['dakar', 'investissement', '2025', 'sénégal'],
      coverUrl: 'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=1200&auto=format',
      content: `## Le marché immobilier dakarois en pleine mutation

Le Grand Dakar connaît une profonde transformation urbanistique portée par le Plan Sénégal Émergent (PSE). Après des années de stagnation, plusieurs quartiers affichent des hausses de prix significatives.

### Diamniadio : la nouvelle frontière

À 30 km du centre de Dakar, le Pôle Urbain de Diamniadio concentre l'essentiel des investissements publics. Les terrains viabilisés s'y échangent entre 40 et 90 millions de FCFA pour 500 m², contre 25 millions il y a cinq ans.

**Pourquoi investir ici ?**
- Infrastructure moderne (BRT, autoroute à péage)
- Proximité de l'aéroport AIBD
- Prix encore accessibles comparés à Dakar centre

### Les Almadies : le luxe résiste

Valeur refuge de l'immobilier dakarois, les Almadies maintiennent leur statut de quartier premium. Les villas balnéaires se négocient entre 200 et 500 millions selon le standing et la proximité de la mer. La demande diaspora y est particulièrement forte.

### Mermoz-Sacré Cœur : le bon équilibre

Ce quartier résidentiel consolidé offre un excellent rapport qualité-prix. Les appartements de standing moyen y trouvent preneurs rapidement, portés par une demande locative soutenue des cadres et expatriés.

## Notre conseil

Quel que soit votre budget, priorisez les biens avec **titre foncier** et vérifiez la conformité urbanistique avant toute transaction. Faites-vous accompagner par une agence certifiée ImmoAfric.`,
    },
    {
      slug: 'guide-achat-immobilier-senegal-diaspora',
      title: 'Guide complet : acheter au Sénégal depuis l\'étranger',
      excerpt: 'Procédures, pièges à éviter, fiscalité, agents certifiés — tout ce que la diaspora doit savoir avant d\'investir au pays.',
      categorySlug: 'diaspora',
      countryTag: 'SN',
      readTime: 10,
      tags: ['diaspora', 'achat', 'guide', 'procédures'],
      coverUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&auto=format',
      content: `## Investir au Sénégal depuis la diaspora : le guide 2025

Chaque année, des milliers de Sénégalais de l'extérieur souhaitent investir dans l'immobilier au pays. Voici un guide pratique pour réussir votre projet.

### Étape 1 : Définir votre projet

Avant tout achat, posez-vous les bonnes questions :
- **Résidence principale ou investissement locatif ?** Les deux logiques ne requièrent pas les mêmes critères.
- **Budget réel ?** Incluez frais de notaire (5-7%), taxes et éventuels travaux.
- **Horizon de temps ?** Un terrain à Diamniadio se revend bien à 5-10 ans. Une villa à Saly génère des revenus immédiats.

### Étape 2 : Choisir un agent certifié

Le principal risque pour la diaspora est l'arnaque. Travaillez exclusivement avec des agences :
- **Vérifiées ImmoAfric** (badge bleu)
- Membres de l'UNAHMOS (Union Nationale des Agents et Mandataires)
- Capables de fournir un mandat de représentation légal

### Étape 3 : La vérification du titre foncier

C'est l'étape cruciale. Exigez :
1. La copie du titre foncier (TF) ou du bail emphytéotique
2. L'extrait cadastral actualisé
3. La vérification d'absence d'hypothèque (auprès de la Conservation Foncière)

### Étape 4 : Le compromis de vente

Même à distance, vous pouvez signer par procuration notariée. Les notaires sénégalais sont habitués à traiter avec la diaspora. Comptez 3-5% du prix pour les frais de notaire.

### Étape 5 : Le transfert de fonds

Privilégiez les virements bancaires traçables. Les transferts Western Union ou Wave pour des montants importants peuvent poser problème lors de la déclaration des avoirs.

## Les erreurs à éviter

❌ Acheter sans titre foncier (acte de cession non opposable)
❌ Payer sans reçu officiel
❌ Traiter avec des intermédiaires non mandatés
❌ Négliger la vérification physique du bien (demandez une visite virtuelle 360°)`,
    },
    {
      slug: 'investissement-locatif-abidjan-rendement',
      title: 'Rendement locatif à Abidjan : quels quartiers privilégier ?',
      excerpt: 'Cocody, Plateau, Marcory… Analyse des rendements bruts et nets dans les principaux quartiers d\'Abidjan pour 2025.',
      categorySlug: 'investissement',
      countryTag: 'CI',
      readTime: 7,
      tags: ['abidjan', 'rendement', 'investissement', 'côte-divoire'],
      coverUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&auto=format',
      content: `## Immobilier locatif à Abidjan : analyse des rendements 2025

Le marché locatif abidjanais reste l'un des plus dynamiques d'Afrique subsaharienne, porté par une croissance démographique soutenue et une forte demande des cadres et expatriés.

### Tableau des rendements par quartier

| Quartier | Prix moyen m² (achat) | Loyer moyen m² | Rendement brut |
|---|---|---|---|
| Plateau | 900 000 XOF | 7 500 XOF | 10% |
| Cocody Deux Plateaux | 600 000 XOF | 4 500 XOF | 9% |
| Marcory Zone 4 | 400 000 XOF | 3 500 XOF | 10.5% |
| Yopougon | 250 000 XOF | 2 000 XOF | 9.6% |
| Bingerville | 180 000 XOF | 1 500 XOF | 10% |

### Notre recommandation : Marcory Zone 4

Meilleur compromis rendement/risque, Marcory Zone 4 attire une clientèle de cadres moyens stable. Un appartement 3 pièces acheté 40 millions se loue facilement 350 000 XOF/mois, soit un rendement brut de 10.5%.

### À surveiller : Bingerville

Cette commune en plein développement bénéficie du pont Henri Konan Bédié et d'un accès facilité au Plateau. Les prix restent encore bas mais la demande locative monte.

## Fiscalité locative en Côte d'Ivoire

Les revenus locatifs sont soumis à :
- **IMF** : 0.5% du chiffre d'affaires
- **DGI** : 25% sur les bénéfices nets
- Déduction possible des charges, intérêts d'emprunt et amortissements

Un conseil : déclarez systématiquement vos revenus locatifs pour bénéficier des déductions et éviter les redressements.`,
    },
    {
      slug: 'titre-foncier-senegal-comment-obtenir',
      title: 'Titre foncier au Sénégal : procédure complète 2025',
      excerpt: 'Comment obtenir, vérifier et sécuriser un titre foncier au Sénégal ? Guide pratique pour acheteurs et investisseurs.',
      categorySlug: 'juridique-fiscalite',
      countryTag: 'SN',
      readTime: 8,
      tags: ['titre-foncier', 'juridique', 'sénégal', 'procédures'],
      coverUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format',
      content: `## Le titre foncier au Sénégal : tout comprendre

Le titre foncier (TF) est le document le plus sécurisé pour attester de la propriété d'un bien immobilier au Sénégal. Contrairement à d'autres régimes (permis d'occuper, bail, etc.), il confère une propriété pleine et entière.

### Les différents régimes fonciers

**1. Le Titre Foncier (TF)**
Immatriculation au Livre Foncier. C'est la garantie absolue. Toute mutation se fait par acte notarié inscrit en marge du TF.

**2. Le Permis d'Occuper (PO)**
Droit d'usage accordé par l'État sur le domaine national. Non cessible directement, mais transformable en TF après 5 ans d'occupation paisible.

**3. L'Acte de Cession de Terrain (ACT)**
Document administratif de cession entre particuliers, opposable mais moins sécurisé que le TF.

### Comment vérifier un titre foncier ?

1. Demandez la **copie authentique** du TF au vendeur
2. Rendez-vous à la **Conservation Foncière** compétente (selon la localité)
3. Vérifiez l'absence d'**hypothèque, saisie ou servitude**
4. Confirmez que le vendeur est bien le **propriétaire inscrit**

### Procédure d'immatriculation

Si le terrain n'a pas encore de TF :
1. Bornage par géomètre agréé (60 000 - 150 000 XOF)
2. Dépôt du dossier à la Conservation Foncière
3. Publication au Journal Officiel (délai de purge : 2 mois)
4. Délivrance du TF (délai total : 6 à 18 mois)

**Coût total estimé :** 200 000 à 500 000 XOF selon la superficie.

### Le conseil ImmoAfric

N'achetez jamais un bien sans titre foncier ou sans engagement ferme du vendeur à vous en transférer un. Les litiges fonciers sont parmi les contentieux les plus longs et coûteux au Sénégal.`,
    },
  ];

  for (const post of posts) {
    const { categorySlug, tags, ...postData } = post;
    const categoryId = createdCategories[categorySlug];
    const existing = await prisma.blogPost.findUnique({ where: { slug: postData.slug } });
    if (!existing && categoryId) {
      await prisma.blogPost.create({
        data: {
          ...postData,
          authorId: admin.id,
          categoryId,
          tags,
          status: 'published',
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          viewsCount: Math.floor(Math.random() * 1200) + 100,
        },
      });
    }
  }

  console.log('✅ Articles blog créés');

  // ─── 7. ANNUAIRE DES PROFESSIONNELS ────────────────────────────────
  const professionals = [
    {
      name: 'Me Aminata Diallo — Notaire',
      category: 'notaire',
      slug: 'me-aminata-diallo-notaire-dakar',
      description: 'Notaire diplômée d\'État, spécialisée dans les transactions immobilières, successions et baux commerciaux. 15 ans d\'expérience à Dakar. Parle français, wolof et anglais.',
      phone: '+221 33 821 XX XX',
      email: 'cabinet.diallo.notaire@gmail.com',
      city: 'Dakar',
      country: 'SN',
      isVerified: true,
      isFeatured: true,
      plan: 'paid' as const,
      rating: 4.9,
    },
    {
      name: 'Cabinet Géomètre Seck & Associés',
      category: 'geometre',
      slug: 'cabinet-geometre-seck-dakar',
      description: 'Géomètres experts agréés pour bornage, divisions parcellaires, topographie et plans cadastraux. Interventions sur Dakar, Thiès et la Petite Côte.',
      phone: '+221 77 456 78 90',
      email: 'geometre.seck@senegal.sn',
      city: 'Dakar',
      country: 'SN',
      isVerified: true,
      isFeatured: false,
      plan: 'paid' as const,
      rating: 4.6,
    },
    {
      name: 'BTP Constructions Modernes CI',
      category: 'entrepreneur',
      slug: 'btp-constructions-modernes-abidjan',
      description: 'Entreprise de construction spécialisée dans les villas et immeubles résidentiels. Clé en main ou gros œuvre. Réalisations à Cocody, Riviera et Bingerville.',
      phone: '+225 07 789 01 23',
      email: 'contact@btp-cm.ci',
      city: 'Abidjan',
      country: 'CI',
      isVerified: true,
      isFeatured: true,
      plan: 'paid' as const,
      rating: 4.3,
    },
    {
      name: 'SénéCredit Immobilier',
      category: 'banque',
      slug: 'senecredit-immobilier-dakar',
      description: 'Spécialiste du crédit immobilier au Sénégal. Prêts habitation jusqu\'à 75% du prix d\'achat, taux à partir de 7%. Accompagnement diaspora avec dossiers acceptés depuis l\'étranger.',
      phone: '+221 33 889 XX XX',
      email: 'immobilier@senecredit.sn',
      website: 'https://senecredit.sn',
      city: 'Dakar',
      country: 'SN',
      isVerified: true,
      isFeatured: true,
      plan: 'paid' as const,
      rating: 4.5,
    },
    {
      name: 'Archi Design Sénégal',
      category: 'architecte',
      slug: 'archi-design-senegal-dakar',
      description: 'Bureau d\'architecture et maîtrise d\'œuvre. Conception de villas contemporaines, plans de permis de construire, rénovations. Membre de l\'Ordre des Architectes du Sénégal.',
      phone: '+221 76 234 56 78',
      email: 'contact@archidesign.sn',
      city: 'Dakar',
      country: 'SN',
      isVerified: false,
      isFeatured: false,
      plan: 'free' as const,
      rating: 4.7,
    },
  ];

  for (const pro of professionals) {
    const existing = await prisma.professional.findUnique({ where: { slug: pro.slug } });
    if (!existing) {
      await prisma.professional.create({ data: pro });
    }
  }

  console.log('✅ Annuaire des professionnels créé');

  // ─── RÉSUMÉ ──────────────────────────────────────────────────────────
  const counts = await prisma.$transaction([
    prisma.user.count(),
    prisma.agency.count(),
    prisma.property.count(),
    prisma.blogPost.count(),
    prisma.professional.count(),
    prisma.lead.count(),
  ]);

  console.log('\n📊 Base de données :');
  console.log(`   👤 Utilisateurs : ${counts[0]}`);
  console.log(`   🏢 Agences      : ${counts[1]}`);
  console.log(`   🏠 Biens        : ${counts[2]}`);
  console.log(`   📝 Articles     : ${counts[3]}`);
  console.log(`   📋 Annuaire     : ${counts[4]}`);
  console.log(`   📞 Leads CRM    : ${counts[5]}`);
  console.log('\n✨ Seed terminé avec succès !');
  console.log('\n🔑 Comptes de démonstration :');
  console.log('   admin@immoafric.com       / Admin2024!  (admin)');
  console.log('   contact@dakar-prestige.sn / Agency2024! (agence SN)');
  console.log('   info@abidjan-immo.ci      / Agency2024! (agence CI)');
  console.log('   demo@immoafric.com        / User2024!   (utilisateur)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
