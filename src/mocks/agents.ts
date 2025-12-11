/**
 * Mock Agent Responses
 * Realistic, copy-pasteable mock JSON responses for the four agents
 * (Personal Shopper, Makeup Artist, Size Predictor, Returns Predictor)
 * plus an aggregated orchestrator payload.
 * 
 * All timestamps use ISO format (December 10, 2025) and each object includes
 * structured data, confidence, explain/explanations, and plausible product/URL fields
 * so you can render carts, cards, and "why" explanations in the UI.
 */

import type { AgentResponse } from '@/types/agent-orchestration';

/**
 * Personal Shopper — mock response
 * Curated outfit bundles for a rooftop wedding
 */
export const MOCK_PERSONAL_SHOPPER: AgentResponse = {
  id: "ar-ps-20251210-0001",
  sessionId: "s-demo-2025-12-10-1700",
  agent: "personal-shopper",
  createdAt: "2025-12-10T17:00:12.000Z",
  content: "Curated 3 outfit bundles for a rooftop wedding (budget $250). Each bundle includes a main item, two complementary pieces, and a shoe recommendation.",
  structured: {
    occasion: "rooftop wedding",
    budgetUsd: 250,
    bundles: [
      {
        id: "bundle-01",
        name: "Modern Minimalist",
        score: 0.92,
        totalPriceUsd: 235,
        items: [
          {
            id: "p-1001",
            title: "Satin Slip Midi Dress",
            brand: "Astra & Co",
            priceUsd: 120,
            sizeRecommendation: "M",
            productUrl: "https://shop.example.com/p-1001"
          },
          {
            id: "p-1002",
            title: "Lightweight Cropped Blazer",
            brand: "TailorMade",
            priceUsd: 65,
            productUrl: "https://shop.example.com/p-1002"
          },
          {
            id: "p-1003",
            title: "Strappy Leather Sandals",
            brand: "Solito",
            priceUsd: 50,
            productUrl: "https://shop.example.com/p-1003"
          }
        ],
        notes: "Elegant silhouette; satin complements evening lights. Good for narrow shoulders."
      },
      {
        id: "bundle-02",
        name: "Vintage Romantic",
        score: 0.86,
        totalPriceUsd: 242,
        items: [
          {
            id: "p-2001",
            title: "Floral Tea Dress",
            brand: "OldRose",
            priceUsd: 95,
            sizeRecommendation: "S",
            productUrl: "https://shop.example.com/p-2001"
          },
          {
            id: "p-2002",
            title: "Pearl Drop Earrings",
            brand: "LunaJewels",
            priceUsd: 32,
            productUrl: "https://shop.example.com/p-2002"
          },
          {
            id: "p-2003",
            title: "Block Heel Mules",
            brand: "UrbanWalk",
            priceUsd: 115,
            productUrl: "https://shop.example.com/p-2003"
          }
        ],
        notes: "Airy and romantic; high confidence for petite frames."
      },
      {
        id: "bundle-03",
        name: "Chic Bold",
        score: 0.79,
        totalPriceUsd: 198,
        items: [
          {
            id: "p-3001",
            title: "Structured Asymmetric Dress",
            brand: "Vanta",
            priceUsd: 140,
            sizeRecommendation: "M",
            productUrl: "https://shop.example.com/p-3001"
          },
          {
            id: "p-3002",
            title: "Gold Cuff Bracelet",
            brand: "Elemental",
            priceUsd: 28,
            productUrl: "https://shop.example.com/p-3002"
          },
          {
            id: "p-3003",
            title: "Pointed Toe Flats",
            brand: "NoirSteps",
            priceUsd: 30,
            productUrl: "https://shop.example.com/p-3003"
          }
        ],
        notes: "Best for someone who wants modern lines and low heel for comfort."
      }
    ],
    source: "mock"
  },
  confidence: 0.88,
  explains: [
    "Selected dresses based on user's 'minimal' and 'evening' preferences.",
    "Budget filter applied; prioritized complete looks under budget.",
    "Sizes suggested from last purchase history (demo_user profile)."
  ],
  source: "mock"
};

/**
 * Makeup Artist — mock response
 * Personalized makeup routine for Warm Light (Fitzpatrick III) skin
 */
export const MOCK_MAKEUP_ARTIST: AgentResponse = {
  id: "ar-mu-20251210-0002",
  sessionId: "s-demo-2025-12-10-1700",
  agent: "makeup-artist",
  createdAt: "2025-12-10T17:00:33.000Z",
  content: "Personalized makeup routine for Warm Light (Fitzpatrick III) skin for a rooftop evening event. Includes matched foundation shade and 5-step application.",
  structured: {
    selfieAnalysis: {
      fitzpatrick: "III",
      undertone: "warm",
      observations: [
        "slightly oily t-zone",
        "neutral-to-warm cheeks",
        "no visible discoloration in demo photo"
      ]
    },
    recommendedRoutine: [
      {
        step: 1,
        title: "Prep & Prime",
        instruction: "Hydrating primer, focus on T-zone to control oil but keep glow.",
        product: {
          id: "mu-p-01",
          title: "HydraGlow Primer 30ml",
          brand: "GlowLab",
          priceUsd: 28,
          productUrl: "https://beauty.example.com/mu-p-01"
        }
      },
      {
        step: 2,
        title: "Foundation (shade match)",
        instruction: "Medium coverage; blend with damp sponge. Match: Warm 4.0.",
        product: {
          id: "mu-p-02",
          title: "Luminous Serum Foundation - Warm 4.0",
          brand: "SkinTrue",
          priceUsd: 34,
          shade: "Warm 4.0",
          productUrl: "https://beauty.example.com/mu-p-02"
        }
      },
      {
        step: 3,
        title: "Bronzer & Blush",
        instruction: "Lightly sweep bronzer at temples; peach blush on apples of cheeks.",
        productRecommendations: [
          {
            id: "mu-p-03",
            title: "Matte Bronzer Stick",
            brand: "TerraTone",
            priceUsd: 22
          },
          {
            id: "mu-p-04",
            title: "Peach Glow Blush",
            brand: "Bloom",
            priceUsd: 18
          }
        ]
      },
      {
        step: 4,
        title: "Eyes",
        instruction: "Warm bronze shadow + small shimmer on lid; waterproof mascara.",
        product: {
          id: "mu-p-05",
          title: "All-Day Waterproof Mascara",
          brand: "LashPro",
          priceUsd: 19,
          productUrl: "https://beauty.example.com/mu-p-05"
        }
      },
      {
        step: 5,
        title: "Finish",
        instruction: "Setting spray with subtle dew; blot T-zone if needed.",
        product: {
          id: "mu-p-06",
          title: "DewLock Setting Spray",
          brand: "Mistify",
          priceUsd: 16,
          productUrl: "https://beauty.example.com/mu-p-06"
        }
      }
    ],
    totalEstPriceUsd: 137,
    videoTutorialUrl: "https://cdn.example.com/demo/makeup-routine-warm-4.mp4",
    source: "mock"
  },
  confidence: 0.84,
  explains: [
    "Skin tone inferred via face analysis model; matched to Warm 4.0 foundation shade.",
    "Selected waterproof mascara for outdoor evening conditions.",
    "Routine optimized to control T-zone oil while keeping evening glow."
  ],
  source: "mock"
};

/**
 * Size Predictor — mock response (multi-brand)
 * Predicted best-fit sizes across requested brands
 */
export const MOCK_SIZE_PREDICTOR: AgentResponse = {
  id: "ar-size-20251210-0003",
  sessionId: "s-demo-2025-12-10-1700",
  agent: "size-predictor",
  createdAt: "2025-12-10T17:01:04.000Z",
  content: "Predicted best-fit sizes for the user's measurements across requested brands. Confidence per brand included.",
  structured: {
    inputMeasurements: {
      heightCm: 160,
      weightKg: 56,
      bustCm: 88,
      waistCm: 70,
      hipsCm: 96
    },
    brandRecommendations: [
      {
        brand: "Zara",
        recommendedSize: "S",
        confidence: 0.78,
        reason: "Zara runs slightly large in skirts; bust-to-waist ratio matches S on brand chart.",
        brandChartReference: {
          bust_cm: { XS: 82, S: 88, M: 94 },
          waist_cm: { XS: 64, S: 70, M: 76 }
        }
      },
      {
        brand: "ASOS",
        recommendedSize: "M",
        confidence: 0.69,
        reason: "ASOS sizing skews slim for dresses in this style; recommendation favors a slightly larger size for comfort.",
        brandChartReference: {
          bust_cm: { S: 86, M: 92, L: 98 },
          waist_cm: { S: 68, M: 74, L: 80 }
        }
      },
      {
        brand: "Vanta",
        recommendedSize: "M",
        confidence: 0.83,
        reason: "Structured silhouettes at Vanta require extra room at hip; model adds +2cm allowance.",
        brandChartReference: {
          bust_cm: { S: 86, M: 92 },
          hips_cm: { S: 92, M: 98 }
        }
      }
    ],
    overallRecommendation: {
      preferredSize: "M",
      preferredConfidence: 0.76,
      note: "Use M for structured or fitted styles; S may work for loose silhouettes."
    },
    source: "mock"
  },
  confidence: 0.76,
  explains: [
    "Aggregated brand-specific size charts and user's historical returns (demo dataset).",
    "Applies +2cm hip allowance for structured garments; adjusts for brand bias."
  ],
  source: "mock"
};

/**
 * Returns Predictor — mock response (item-level risk + alternatives)
 * Predicted return risk for items in cart and suggested lower-risk alternatives
 */
export const MOCK_RETURNS_PREDICTOR: AgentResponse = {
  id: "ar-returns-20251210-0004",
  sessionId: "s-demo-2025-12-10-1700",
  agent: "returns-predictor",
  createdAt: "2025-12-10T17:01:37.000Z",
  content: "Predicted return risk for items in cart and suggested lower-risk alternatives where available.",
  structured: {
    cartSummary: {
      cartId: "cart-789",
      itemsCount: 3,
      currency: "USD",
      items: [
        {
          cartItemId: "ci-1",
          productId: "p-3001",
          title: "Structured Asymmetric Dress (Vanta)",
          priceUsd: 140,
          predictedReturnProbability: 0.38,
          riskLabel: "medium",
          topReasons: [
            "Structured cut -> fit-sensitive at hips",
            "High return rate historically for this SKU (28%)"
          ],
          suggestedAlternatives: [
            {
              id: "p-3001-alt-1",
              title: "Relaxed Asymmetric Dress (Vanta Looser)",
              priceUsd: 138,
              expectedReturnProbability: 0.12,
              productUrl: "https://shop.example.com/p-3001-alt-1"
            }
          ]
        },
        {
          cartItemId: "ci-2",
          productId: "p-1003",
          title: "Strappy Leather Sandals (Solito)",
          priceUsd: 50,
          predictedReturnProbability: 0.08,
          riskLabel: "low",
          topReasons: ["Simple size ranges; low fit variance"],
          suggestedAlternatives: []
        },
        {
          cartItemId: "ci-3",
          productId: "p-2001",
          title: "Floral Tea Dress (OldRose)",
          priceUsd: 95,
          predictedReturnProbability: 0.21,
          riskLabel: "medium-low",
          topReasons: [
            "Mixed fiber composition; buyers often return for material feel",
            "Brand size chart slightly variable between batches"
          ],
          suggestedAlternatives: [
            {
              id: "p-2001-alt-1",
              title: "Floral Tea Dress (OldRose - Linen Blend)",
              priceUsd: 98,
              expectedReturnProbability: 0.11,
              productUrl: "https://shop.example.com/p-2001-alt-1"
            }
          ]
        }
      ],
      cartLevelRisk: {
        aggregateReturnProbability: 0.24,
        riskLabel: "medium",
        expectedReturnRatePercent: 24
      },
      recommendedActions: [
        "Suggest size M for Structured Asymmetric Dress (reduce fit-sensitive returns).",
        "Offer free fabric swatch for Floral Tea Dress (OldRose).",
        "Add clear care & fabric info on product page to reduce material surprise returns."
      ],
      estimatedReturnCostsUsd: 28.50
    },
    source: "mock"
  },
  confidence: 0.81,
  explains: [
    "Model combines SKU-level historical return rates, material flags, and user profile fit history.",
    "Alternatives chosen to minimize return probability while preserving aesthetic."
  ],
  source: "mock"
};

/**
 * Aggregated Orchestrator Response
 * What frontend might receive after orchestration
 */
export interface OrchestratorResponse {
  sessionId: string;
  id: string;
  createdAt: string;
  ok: boolean;
  agentsTriggered: string[];
  summary: string;
  agentResponses: Array<{
    agent: string;
    responseId: string;
  }>;
  notes: string[];
}

export const MOCK_ORCHESTRATOR: OrchestratorResponse = {
  sessionId: "s-demo-2025-12-10-1700",
  id: "orch-20251210-0001",
  createdAt: "2025-12-10T17:02:05.000Z",
  ok: true,
  agentsTriggered: ["personal-shopper", "makeup-artist", "size-predictor", "returns-predictor"],
  summary: "Executed 4 specialists: outfit curation, makeup routine, size predictions across brands, and cart return-risk evaluation. Results streamed to session channel.",
  agentResponses: [
    { agent: "personal-shopper", responseId: "ar-ps-20251210-0001" },
    { agent: "makeup-artist", responseId: "ar-mu-20251210-0002" },
    { agent: "size-predictor", responseId: "ar-size-20251210-0003" },
    { agent: "returns-predictor", responseId: "ar-returns-20251210-0004" }
  ],
  notes: [
    "Session persisted to supabase.table `agent_sessions`.",
    "All agent responses inserted to `agent_responses` and broadcast on channel `agents:session:s-demo-2025-12-10-1700`."
  ]
};

/**
 * All mock agent responses in a single object
 * Useful for testing or bulk imports
 */
export const MOCK_AGENTS = {
  personalShopper: MOCK_PERSONAL_SHOPPER,
  makeupArtist: MOCK_MAKEUP_ARTIST,
  sizePredictor: MOCK_SIZE_PREDICTOR,
  returnsPredictor: MOCK_RETURNS_PREDICTOR,
  orchestrator: MOCK_ORCHESTRATOR
} as const;

/**
 * Array of all agent responses (excluding orchestrator)
 * Useful for populating UI lists or testing message streams
 */
export const MOCK_AGENT_RESPONSES: AgentResponse[] = [
  MOCK_PERSONAL_SHOPPER,
  MOCK_MAKEUP_ARTIST,
  MOCK_SIZE_PREDICTOR,
  MOCK_RETURNS_PREDICTOR
];

/**
 * Usage examples:
 * 
 * Frontend dev: 
 *   import { MOCK_PERSONAL_SHOPPER } from '@/mocks/agents';
 *   messages.push(MOCK_PERSONAL_SHOPPER);
 * 
 * API mocks: 
 *   return MOCK_SIZE_PREDICTOR as the body of POST /api/agents/size-predictor
 * 
 * Orchestration test: 
 *   Respond to POST /api/agents/orchestrate with MOCK_ORCHESTRATOR,
 *   then broadcast each agent response from MOCK_AGENT_RESPONSES on Supabase channel
 * 
 * UI details: 
 *   Use structured.* to render product cards, confidence for badges, 
 *   and explains as toggled "why this" content.
 */
