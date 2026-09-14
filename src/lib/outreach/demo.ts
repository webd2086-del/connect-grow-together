import { NOW, daysAgo, hoursAgo, inDays } from "./format";
import type {
  Activity,
  Campaign,
  CampaignRecipient,
  Category,
  EmailAccount,
  FollowUp,
  LeadStatus,
  Prospect,
  RecipientState,
  Template,
  WorkspaceState,
} from "./types";

/** Deterministic PRNG so demo data is identical on server and client. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const categories: Category[] = [
  {
    id: "cat-tour",
    name: "Tour & Travel",
    icon: "🦁",
    color: "cat-1",
    purposes: [
      "Hotel/resort partnership",
      "Hotel rate request",
      "Tour operator partnership",
      "Safari packages",
      "Destination partnership",
    ],
    emailAccountId: "acc-safari",
  },
  {
    id: "cat-schools",
    name: "Schools",
    icon: "🎓",
    color: "cat-2",
    purposes: ["School trips", "Educational tours", "Student travel packages", "Software development"],
    emailAccountId: "acc-schools",
  },
  {
    id: "cat-corporate",
    name: "Corporate / Brands",
    icon: "🏢",
    color: "cat-3",
    purposes: ["Team retreats", "Employee trips", "Corporate travel", "Brand partnerships"],
    emailAccountId: "acc-safari",
  },
  {
    id: "cat-software",
    name: "Software Development",
    icon: "💻",
    color: "cat-4",
    purposes: ["Website development", "Web applications", "Dashboards", "UI/UX design", "Custom software"],
    emailAccountId: "acc-dev",
  },
];

export const accounts: EmailAccount[] = [
  {
    id: "acc-safari",
    label: "Karla Safari Adventures",
    address: "info@karlasafari.com",
    provider: "google",
    status: "connected",
    categoryIds: ["cat-tour", "cat-corporate"],
    dailyLimit: 400,
    sentToday: 118,
    lastSyncAt: hoursAgo(0.2),
  },
  {
    id: "acc-dev",
    label: "Software Development",
    address: "hello@karlastudio.dev",
    provider: "microsoft",
    status: "connected",
    categoryIds: ["cat-software"],
    dailyLimit: 250,
    sentToday: 42,
    lastSyncAt: hoursAgo(1.1),
  },
  {
    id: "acc-schools",
    label: "School Outreach",
    address: "schools@karlasafari.com",
    provider: "google",
    status: "connected",
    categoryIds: ["cat-schools"],
    dailyLimit: 300,
    sentToday: 76,
    lastSyncAt: hoursAgo(0.6),
  },
  {
    id: "acc-brand",
    label: "Brand Partnerships",
    address: "partners@karlasafari.com",
    provider: "smtp",
    status: "disconnected",
    categoryIds: ["cat-corporate"],
    dailyLimit: 150,
    sentToday: 0,
    lastSyncAt: null,
  },
];

type Seed = [string, string, string, string, string, string, string]; // company, contact, email, industry, country, city, categoryId

const seeds: Seed[] = [
  ["ABC International School", "John Doe", "john@abcintl.ac.ke", "School", "Kenya", "Nairobi", "cat-schools"],
  ["Riverside Academy", "Grace Mwangi", "grace@riverside.ac.ke", "School", "Kenya", "Nairobi", "cat-schools"],
  ["Brookhouse School", "Peter Otieno", "p.otieno@brookhouse.ac.ke", "School", "Kenya", "Nairobi", "cat-schools"],
  ["Kampala Hill School", "Sarah Nakato", "sarah@kampalahill.ug", "School", "Uganda", "Kampala", "cat-schools"],
  ["St. Andrews Turi", "Michael Kariuki", "michael@standrews.ac.ke", "School", "Kenya", "Nakuru", "cat-schools"],
  ["Aga Khan Academy", "Fatima Noor", "fnoor@agakhan.edu", "School", "Kenya", "Mombasa", "cat-schools"],
  ["Braeburn Garden Estate", "Lucy Wambui", "lucy@braeburn.ac.ke", "School", "Kenya", "Nairobi", "cat-schools"],
  ["Arusha Meru School", "Joseph Massawe", "joseph@arushameru.tz", "School", "Tanzania", "Arusha", "cat-schools"],
  ["Serena Beach Resort", "Amina Yusuf", "amina@serenabeach.com", "Hospitality", "Kenya", "Mombasa", "cat-tour"],
  ["Sarova Mara Camp", "Daniel Kiptoo", "daniel@sarovamara.com", "Hospitality", "Kenya", "Maasai Mara", "cat-tour"],
  ["Ol Tukai Lodge", "Rita Achieng", "rita@oltukai.co.ke", "Hospitality", "Kenya", "Amboseli", "cat-tour"],
  ["Zanzibar Pearl Resort", "Ali Hamisi", "ali@zanzibarpearl.tz", "Hospitality", "Tanzania", "Zanzibar", "cat-tour"],
  ["Lake Manyara Lodge", "Neema Mushi", "neema@manyaralodge.tz", "Hospitality", "Tanzania", "Manyara", "cat-tour"],
  ["Kigali Marriott", "Eric Habimana", "eric@kigalimarriott.rw", "Hospitality", "Rwanda", "Kigali", "cat-tour"],
  ["Diani Reef Hotel", "Hassan Omar", "hassan@dianireef.com", "Hospitality", "Kenya", "Diani", "cat-tour"],
  ["Great Rift Valley Lodge", "Caroline Njeri", "caroline@grvlodge.co.ke", "Hospitality", "Kenya", "Naivasha", "cat-tour"],
  ["Wild Frontiers Safaris", "Tom Baker", "tom@wildfrontiers.co.uk", "Tour Operator", "UK", "London", "cat-tour"],
  ["Nordic Travel Group", "Ingrid Larsen", "ingrid@nordictravel.no", "Tour Operator", "Norway", "Oslo", "cat-tour"],
  ["Safaricom Ltd", "Brian Mutua", "brian.mutua@safaricom.co.ke", "Telecom", "Kenya", "Nairobi", "cat-corporate"],
  ["Equity Bank", "Mary Wanjiru", "mary.wanjiru@equitybank.co.ke", "Banking", "Kenya", "Nairobi", "cat-corporate"],
  ["Twiga Foods", "Kevin Onyango", "kevin@twiga.com", "Agritech", "Kenya", "Nairobi", "cat-corporate"],
  ["Java House Africa", "Ann Muthoni", "ann@javahouseafrica.com", "F&B", "Kenya", "Nairobi", "cat-corporate"],
  ["Sendy Logistics", "Victor Kimani", "victor@sendy.co.ke", "Logistics", "Kenya", "Nairobi", "cat-corporate"],
  ["M-Kopa", "Diana Chebet", "diana@m-kopa.com", "Fintech", "Kenya", "Nairobi", "cat-corporate"],
  ["Flutterwave", "Segun Ade", "segun@flutterwave.com", "Fintech", "Nigeria", "Lagos", "cat-corporate"],
  ["Andela", "Chidi Okeke", "chidi@andela.com", "Technology", "Nigeria", "Lagos", "cat-corporate"],
  ["Bolt East Africa", "Lena Tamm", "lena@bolt.eu", "Mobility", "Kenya", "Nairobi", "cat-corporate"],
  ["Naivas Supermarket", "Paul Mbugua", "paul@naivas.co.ke", "Retail", "Kenya", "Nairobi", "cat-corporate"],
  ["Kenya Wildlife Trust", "Esther Njoki", "esther@kwtrust.org", "Non-profit", "Kenya", "Nairobi", "cat-corporate"],
  ["Bloom Dental Clinic", "Dr. Ruth Adhiambo", "ruth@bloomdental.co.ke", "Healthcare", "Kenya", "Kisumu", "cat-software"],
  ["Pesa Africa", "Ibrahim Sow", "ibrahim@pesaafrica.com", "Fintech", "Senegal", "Dakar", "cat-software"],
  ["Urban Cargo", "Nancy Wafula", "nancy@urbancargo.co.ke", "Logistics", "Kenya", "Mombasa", "cat-software"],
  ["GreenLeaf Farms", "Samuel Ochieng", "samuel@greenleaf.co.ke", "Agriculture", "Kenya", "Eldoret", "cat-software"],
  ["Bright Future SACCO", "Alice Kimeu", "alice@bfsacco.co.ke", "Finance", "Kenya", "Machakos", "cat-software"],
  ["Copper & Clay Studio", "Nia Mwende", "nia@copperclay.co", "Design", "Kenya", "Nairobi", "cat-software"],
  ["Atlas Insurance", "George Mensah", "george@atlasins.gh", "Insurance", "Ghana", "Accra", "cat-software"],
  ["Zuri Beauty Bar", "Tabitha Njeri", "tabitha@zuribeauty.co.ke", "Beauty", "Kenya", "Nairobi", "cat-software"],
  ["Hakuna Matata Tours", "Felix Kariuki", "felix@hakunamatata.co.ke", "Tour Operator", "Kenya", "Nanyuki", "cat-tour"],
  ["Mountain Lodge Kenya", "Beatrice Wangui", "beatrice@mountainlodge.co.ke", "Hospitality", "Kenya", "Nyeri", "cat-tour"],
  ["Peponi School", "David Mwangi", "david@peponischool.org", "School", "Kenya", "Ruiru", "cat-schools"],
];

const statusPool: LeadStatus[] = [
  "new",
  "contacted",
  "contacted",
  "opened",
  "opened",
  "replied",
  "interested",
  "meeting",
  "negotiating",
  "won",
  "lost",
  "not_interested",
];

const tagPool = ["priority", "warm", "inbound", "referral", "conference", "high-value", "repeat", "cold"];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildDemoState(): WorkspaceState {
  const r = rng(20260823);

  const prospects: Prospect[] = seeds.map((s, i) => {
    const [company, contactName, email, industry, country, city, categoryId] = s;
    const status = statusPool[Math.floor(r() * statusPool.length)]!;
    const contacted = status !== "new";
    const lastContactedAt = contacted ? daysAgo(Math.floor(r() * 40) + 1) : null;
    const responded = ["replied", "interested", "meeting", "negotiating", "won"].includes(status);
    return {
      id: `p-${slug(company)}`,
      company,
      contactName,
      email,
      phone: `+254 7${Math.floor(r() * 90 + 10)} ${Math.floor(r() * 900 + 100)} ${Math.floor(r() * 900 + 100)}`,
      website: `www.${slug(company).slice(0, 18)}.com`,
      industry,
      country,
      city,
      categoryId,
      tags: r() > 0.5 ? [tagPool[Math.floor(r() * tagPool.length)]!] : [],
      notes: i % 5 === 0 ? "Met at the East Africa travel expo. Interested in Q4 planning." : undefined,
      status,
      createdAt: daysAgo(Math.floor(r() * 120) + 40),
      lastContactedAt,
      lastResponseAt: responded ? daysAgo(Math.floor(r() * 12)) : null,
      nextFollowUpAt:
        contacted && !["won", "lost", "not_interested", "do_not_contact"].includes(status)
          ? inDays(Math.floor(r() * 14) - 5)
          : null,
    };
  });

  const campaigns: Campaign[] = [
    {
      id: "c-school-trips",
      name: "School Trips 2026",
      categoryId: "cat-schools",
      purpose: "School trips",
      description: "Introduce the 2026 educational safari programme to private and international schools.",
      emailAccountId: "acc-schools",
      subject: "School trip programme for {{company_name}} — 2026 season",
      body: `Hello {{first_name}},

I'd love to discuss how we could organise a memorable, fully-guided school trip for {{company_name}} this coming season.

We run curriculum-aligned safari and coastal programmes for schools across {{country}}, with full risk assessments, licensed guides and teacher-to-student ratios you can share with parents directly.

Would you be open to a short call this week? I can send over the 2026 programme deck and pricing for {{city}} departures.

Warm regards,
Ian`,
      status: "sending",
      createdAt: daysAgo(18),
      batchSize: 10,
      intervalMinutes: 30,
      scheduledAt: null,
    },
    {
      id: "c-hotel-partnership",
      name: "Hotel Partnership Outreach",
      categoryId: "cat-tour",
      purpose: "Hotel/resort partnership",
      description: "Contracted rates and partnership terms with lodges and resorts for the 2026/27 season.",
      emailAccountId: "acc-safari",
      subject: "Partnership & contracted rates — {{company_name}}",
      body: `Hi {{first_name}},

We place a steady volume of leisure and corporate guests into {{city}} and I'd like to explore contracted rates with {{company_name}} for the 2026/27 season.

Could you share your current agent rates and any partnership terms? Happy to send our booking volumes first if that helps.

Best,
Ian`,
      status: "completed",
      createdAt: daysAgo(46),
      batchSize: 15,
      intervalMinutes: 20,
      scheduledAt: null,
    },
    {
      id: "c-corporate-retreats",
      name: "Corporate Retreats",
      categoryId: "cat-corporate",
      purpose: "Team retreats",
      description: "Team retreat and offsite packages for mid-size and enterprise companies.",
      emailAccountId: "acc-safari",
      subject: "Team retreat ideas for {{company_name}}",
      body: `Hello {{first_name}},

Planning an offsite for the {{company_name}} team this year? We design two- and three-day retreats within a few hours of {{city}} — logistics, facilitation space and activities handled end to end.

Would a short call make sense?

Ian`,
      status: "paused",
      createdAt: daysAgo(29),
      batchSize: 8,
      intervalMinutes: 45,
      scheduledAt: null,
    },
    {
      id: "c-website-dev",
      name: "Website Development",
      categoryId: "cat-software",
      purpose: "Website development",
      description: "Website rebuild offer for SMEs with dated or non-responsive sites.",
      emailAccountId: "acc-dev",
      subject: "A faster website for {{company_name}}",
      body: `Hi {{first_name}},

I had a look at {{company_name}}'s website and spotted a few quick wins around speed and mobile layout that usually lift enquiries noticeably.

We build and ship marketing sites in 3–4 weeks. Want me to send a short teardown with the three highest-impact fixes?

Ian`,
      status: "sending",
      createdAt: daysAgo(11),
      batchSize: 12,
      intervalMinutes: 25,
      scheduledAt: null,
    },
    {
      id: "c-uiux",
      name: "UI/UX Services",
      categoryId: "cat-software",
      purpose: "UI/UX design",
      description: "Product design retainers for funded startups and internal tools teams.",
      emailAccountId: "acc-dev",
      subject: "Design support for the {{company_name}} product team",
      body: `Hello {{first_name}},

We work with product teams in {{country}} on interface design — dashboards, onboarding flows and design systems — on a light monthly retainer.

If {{company_name}} has design work queued behind engineering, I'd be glad to show a couple of relevant case studies.

Ian`,
      status: "draft",
      createdAt: daysAgo(4),
      batchSize: 10,
      intervalMinutes: 30,
      scheduledAt: null,
    },
  ];

  const recipients: CampaignRecipient[] = [];
  const activities: Activity[] = [];
  const followUps: FollowUp[] = [];

  const assign: Record<string, string[]> = {
    "c-school-trips": prospects.filter((p) => p.categoryId === "cat-schools").map((p) => p.id),
    "c-hotel-partnership": prospects.filter((p) => p.categoryId === "cat-tour").map((p) => p.id),
    "c-corporate-retreats": prospects.filter((p) => p.categoryId === "cat-corporate").map((p) => p.id),
    "c-website-dev": prospects
      .filter((p) => p.categoryId === "cat-software" || p.categoryId === "cat-schools")
      .map((p) => p.id),
    "c-uiux": [],
  };

  const progress: Record<string, number> = {
    "c-school-trips": 0.82,
    "c-hotel-partnership": 1,
    "c-corporate-retreats": 0.6,
    "c-website-dev": 0.55,
    "c-uiux": 0,
  };

  for (const campaign of campaigns) {
    const ids = assign[campaign.id] ?? [];
    const sentCount = Math.round(ids.length * (progress[campaign.id] ?? 0));
    ids.forEach((pid, idx) => {
      const sent = idx < sentCount;
      let state: RecipientState = "queued";
      let sentAt: string | null = null;
      let openedAt: string | null = null;
      let repliedAt: string | null = null;
      let openCount = 0;
      if (sent) {
        const roll = r();
        sentAt = daysAgo(Math.floor(r() * 20) + 1);
        state = "delivered";
        if (roll > 0.94) {
          state = "bounced";
        } else {
          if (r() > 0.45) {
            state = "opened";
            openCount = Math.floor(r() * 4) + 1;
            openedAt = sentAt;
            if (r() > 0.62) {
              state = "replied";
              repliedAt = daysAgo(Math.max(0, Math.floor(r() * 8)));
            }
          }
        }
      }
      const prospect = prospects.find((p) => p.id === pid)!;
      recipients.push({
        id: `r-${campaign.id}-${pid}`,
        campaignId: campaign.id,
        prospectId: pid,
        state,
        sentAt,
        openedAt,
        openCount,
        repliedAt,
        followUpAt: sent && !repliedAt && r() > 0.55 ? inDays(Math.floor(r() * 10) - 4) : null,
        outcome:
          repliedAt && ["interested", "meeting", "negotiating", "won", "lost"].includes(prospect.status)
            ? (prospect.status as NonNullable<CampaignRecipient["outcome"]>)
            : null,
        subject: campaign.subject,
        body: campaign.body,
      });

      if (sentAt) {
        activities.push({
          id: `a-sent-${campaign.id}-${pid}`,
          type: "email_sent",
          at: sentAt,
          title: `${campaign.name} sent to ${prospect.company}`,
          detail: campaign.subject,
          prospectId: pid,
          campaignId: campaign.id,
          categoryId: campaign.categoryId,
        });
      }
      if (openedAt) {
        activities.push({
          id: `a-open-${campaign.id}-${pid}`,
          type: "email_opened",
          at: openedAt,
          title: `${prospect.company} opened your email`,
          detail: `${openCount} opens · ${campaign.name}`,
          prospectId: pid,
          campaignId: campaign.id,
          categoryId: campaign.categoryId,
        });
      }
      if (repliedAt) {
        activities.push({
          id: `a-reply-${campaign.id}-${pid}`,
          type: "email_replied",
          at: repliedAt,
          title: `${prospect.contactName} replied`,
          detail: campaign.name,
          prospectId: pid,
          campaignId: campaign.id,
          categoryId: campaign.categoryId,
        });
      }
      if (sent && !repliedAt && idx % 3 === 0) {
        const due = inDays(Math.floor(r() * 12) - 5);
        followUps.push({
          id: `f-${campaign.id}-${pid}`,
          prospectId: pid,
          campaignId: campaign.id,
          step: 1,
          dueAt: due,
          status: "pending",
          note: "Send follow-up #1 referencing the original proposal.",
        });
        activities.push({
          id: `a-fu-${campaign.id}-${pid}`,
          type: "follow_up_scheduled",
          at: sentAt!,
          title: `Follow-up scheduled for ${prospect.company}`,
          detail: campaign.name,
          prospectId: pid,
          campaignId: campaign.id,
          categoryId: campaign.categoryId,
        });
      }
    });

    activities.push({
      id: `a-camp-${campaign.id}`,
      type: campaign.status === "completed" ? "campaign_completed" : "campaign_started",
      at: campaign.createdAt,
      title:
        campaign.status === "completed"
          ? `${campaign.name} campaign completed`
          : `${campaign.name} campaign started`,
      detail: `${sentCount}/${ids.length} emails sent`,
      campaignId: campaign.id,
      categoryId: campaign.categoryId,
    });
  }

  for (const acc of accounts) {
    if (acc.lastSyncAt) {
      activities.push({
        id: `a-sync-${acc.id}`,
        type: "account_synced",
        at: acc.lastSyncAt,
        title: `${acc.label} synchronised`,
        detail: `${acc.address} · replies and bounces up to date`,
      });
    }
  }

  activities.sort((a, b) => (a.at < b.at ? 1 : -1));

  const templates: Template[] = [
    {
      id: "t-school-intro",
      name: "School Trip Introduction",
      categoryId: "cat-schools",
      subject: "School trip programme for {{company_name}} — 2026 season",
      body: campaigns[0]!.body,
      timesUsed: 182,
      replyRate: 14.8,
      won: 7,
    },
    {
      id: "t-hotel-rates",
      name: "Hotel Rate Request",
      categoryId: "cat-tour",
      subject: "Contracted agent rates — {{company_name}}",
      body: campaigns[1]!.body,
      timesUsed: 126,
      replyRate: 18.2,
      won: 5,
    },
    {
      id: "t-corporate",
      name: "Corporate Retreat Pitch",
      categoryId: "cat-corporate",
      subject: "Team retreat ideas for {{company_name}}",
      body: campaigns[2]!.body,
      timesUsed: 94,
      replyRate: 9.6,
      won: 2,
    },
    {
      id: "t-web",
      name: "Website Teardown Offer",
      categoryId: "cat-software",
      subject: "A faster website for {{company_name}}",
      body: campaigns[3]!.body,
      timesUsed: 151,
      replyRate: 12.4,
      won: 4,
    },
    {
      id: "t-followup-1",
      name: "Gentle Follow-up #1",
      categoryId: "cat-schools",
      subject: "Following up — {{company_name}}",
      body: `Hi {{first_name}},

Just floating this back to the top of your inbox in case it slipped through. Happy to send the full programme whenever it's useful for {{company_name}}.

Ian`,
      timesUsed: 213,
      replyRate: 8.9,
      won: 3,
    },
  ];

  return {
    user: { name: "Ian", email: "ian@karlasafari.com", workspace: "Karla Group" },
    categories,
    accounts,
    prospects,
    campaigns,
    recipients,
    templates,
    followUps,
    activities,
  };
}

export const REFERENCE_NOW = NOW;
