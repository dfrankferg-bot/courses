# 02 — Legal & Monetization Landscape

*Compiled July 24, 2026. The AI-music legal landscape is moving fast — items flagged "as of mid-2026" must be re-verified at launch.*

---

## 1. Suno Licensing & AI-Music Legal Status

### 1.1 Suno's terms by plan tier
- **Free tier:** Suno — not you — owns songs generated on the free plan; non-commercial only, cannot be monetized ([Suno Help](https://help.suno.com/en/articles/2416769)).
- **Pro (~$10/mo) and Premier (~$30/mo):** songs generated *while subscribed* carry **commercial use rights** — monetize on YouTube, distribute to DSPs, sync into video, keep 100% of earnings; rights survive cancellation for songs made during the subscription ([Dynamoi](https://dynamoi.com/learn/ai-music-distribution/suno-commercial-rights-explained)). Pro and Premier grant identical rights; Premier adds credits.
- **No retroactive licensing:** subscribing later does not convert free-tier songs ([Suno Help](https://help.suno.com/en/articles/2425729)). **Operational rule: generate everything on a paid account from day one; log which account/plan generated each track.**
- **Post-Warner-deal terms shift (late 2025 → 2026):** after the Warner settlement, Suno began rewriting terms — "commercial use license" framing instead of "ownership," deprecating current models in favor of new *licensed* models in 2026, download gating, and **monthly download caps on paid tiers** ([Digital Music News, Dec 2025](https://www.digitalmusicnews.com/2025/12/22/suno-warner-music-deal-changes/)). Per-song cost and legal posture will change when licensed models roll out — read and archive a dated ToS copy at signup.

### 1.2 US Copyright Office: registering AI songs
- The USCO **Part 2 "Copyrightability" report (Jan 29, 2025)** reaffirmed **human authorship is required**; prompts alone don't make you the author ([Skadden summary](https://www.skadden.com/insights/publications/2025/02/copyright-office-publishes-report)).
- Purely Suno-generated audio is **not copyrightable**. Hybrid works are registrable for the human parts — human-written lyrics, human melodies fed in, human editing/arrangement, the video/animation — with AI material **disclosed and disclaimed** in the application ([Federal Register guidance](https://www.federalregister.gov/documents/2023/03/16/2023-05321/copyright-registration-guidance-works-containing-material-generated-by-artificial-intelligence)). 1,000+ such works already registered.
- **Consequence:** an unprotected Suno instrumental can be copied by anyone — including competitors cloning your hits. **Your defensible IP is the human layer: lyrics, characters, animation, brand.**

### 1.3 Label lawsuits — status as of July 2026
- **Warner v. Suno: settled Nov 2025** — payment + licensing partnership; artist opt-in for name/voice/likeness ([MBW](https://www.musicbusinessworldwide.com/warner-music-group-settles-with-suno-strikes-first-of-its-kind-deal-with-ai-song-generator/)).
- **UMG and Sony v. Suno: still litigating** (D. Mass., 1:24-cv-11611). May 2026: labels moved to add **61,026 recordings** after fingerprinting evidence; motion pending. Fact discovery to Sept 30, 2026; dispositive motions April 2027 — a merits ruling is likely a 2027 event ([MBW](https://www.musicbusinessworldwide.com/why-a-fight-over-61000-recordings-could-shape-the-future-of-ai-music-licensing/)). UMG settled with Udio in late 2025.
- **Risk read:** settlement momentum suggests the endgame is licensed AI models, not shutdown. But an adverse 2027 ruling could force model deprecation or output restrictions. Commercial licenses on existing tracks survive per current terms, but practical distributability could be disrupted. **Hedge: keep stems/exports off-platform; be ready to re-record top hits with human musicians.**

### 1.4 Distributor and DSP acceptance (2025–2026)
- **DistroKid:** most permissive — accepts AI music with an **AI-disclosure checkbox** flowing metadata downstream; no cap ([LastPlay](https://lastplaydistro.com/blog/distrokid-ai-generated-music-policy-2026-explained)).
- **TuneCore:** accepts AI-*assisted* works; rejects 100% AI tracks with no human input.
- **CD Baby: full ban** on AI-generated music (Oct 2025 policy). Don't use them.
- **Spotify (Sept 25, 2025 policy):** impersonation rules, an aggressive **spam filter** (75M+ "spammy" tracks removed in the prior 12 months), and the **DDEX AI-disclosure metadata standard** adopted with DistroKid, Believe/TuneCore, etc. ([TechCrunch](https://techcrunch.com/2025/09/25/spotify-updates-ai-policy-to-label-tracks-cut-down-on-spam)).
- **Playbook:** DistroKid + always check AI disclosure + human-plausible release cadence (no 50-track lullaby dumps) + no soundalike artist names or title SEO games.

---

## 2. COPPA & Kids-Content Rules

### 2.1 YouTube "Made for Kids" (MFK)
- Child-directed content **must** be designated MFK (legal COPPA obligation from the 2019 FTC-YouTube $170M settlement). MFK disables: personalized ads (contextual only), comments, notifications, Super Chat/memberships, end screens, info cards ([YouTube Help](https://support.google.com/youtube/answer/9632097?hl=en)).
- **RPM impact:** kids channels typically earn **$1–3 RPM vs $5–15 general** — offset by enormous volume and rewatch loops.
- **The big trap:** marking child-directed content "not made for kids" is a direct COPPA violation by the channel operator — **$53,088 per violation** (2025 figure), potentially per video.

### 2.2 FTC COPPA amendments (2025)
- Final rule effective June 23, 2025; **full compliance mandatory since April 22, 2026**. Adds biometric identifiers to personal info; separate verifiable parental consent for third-party disclosures; written security + data-retention programs ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)).
- **Implication:** staying on-platform keeps direct COPPA surface small. The moment you launch your own app/site with analytics, email list, or retargeting pixels on child-directed properties, you're an "operator" with full obligations. Get privacy counsel before any owned property.

### 2.3 TikTok & Instagram
- Both nominally 13+; no MFK-style monetized category. Treat them as **parent-marketing channels** (teasers, character clips, merch) driving to YouTube and DSPs — not primary monetization. Instagram moved teens to PG-13 standard (Oct 2025). Animated characters avoid all state "kidfluencer" laws.

### 2.4 YouTube Kids app
- Inclusion is algorithmic + policy-vetted; you can't opt in. **YouTube limits AI-generated content in YouTube Kids to a small set of vetted channels and requires disclosure**; 200+ advocacy groups have petitioned to ban AI content from the app entirely ([eMarketer](https://www.emarketer.com/content/calls-grow-ban-ai-videos-on-youtube-kids)). Entry requires demonstrably high production quality and human editorial control.

---

## 3. Monetization Economics

### 3.1 YouTube (core engine)
- Long-form MFK RPM ~$1–3; MFK Shorts monetize poorly. **Shorts/TikTok = discovery → long-form = revenue.**
- **Compilations are the profit center:** 30–120 min compilations and looped long-plays capture toddler rewatch; Little Baby Bum ships two compilations/week on top of weekly new songs. 24/7 pre-recorded live streams of back catalog are among the most lucrative formats ([Kidscreen, Oct 2025](https://kidscreen.com/2025/10/27/how-kids-creators-are-making-youtube-work-again/)).
- Benchmark: Gracie's Corner estimated ~$50K/mo AdSense (likely low), with sponsorships + merch ≈ 40% of revenue.

### 3.2 Spotify/DSPs (secondary, brand-building)
- Per-stream **$0.003–0.005**; premium streams pay ~3x ad-supported.
- **1,000-stream threshold** (since Apr 2024): a track earns zero recording royalties until 1,000 streams/trailing-12-months. Punishes shotgun catalogs; favor fewer, playlist-worthy releases. **Sleep/lullaby/toddler playlists are repeat-listen gold** (parents loop nightly). Publishing royalties are unaffected — but only registrable for the human-authored share.
- Treat DSPs as: (a) parent-facing brand surface, (b) incremental revenue, (c) data signal for which songs deserve animation investment.

### 3.3 The real upside: brand extensions
- Blippi (~$40–45M est.) via Jazwares toys, apparel, tours. Ms. Rachel (~$50M est.) via Netflix, albums, Toniebox (July 2025), toys, live shows.
- Moonbug sold for ~$3B on consolidated, rights-clean IP. Streamer licensing requires a **distinctive, rights-clean brand** — exactly where a weak-IP AI catalog hurts. Revenue-stack plan: Yr 1–2 YouTube + DSPs; Yr 2–3 sponsorships + print-on-demand merch → toy licensing; Yr 3+ live, streaming licensing, consumer products.

---

## 4. Business Structure & IP Protection

### 4.1 Entity
- **LLC** (holding LLC + per-channel LLCs at scale). Assign channels, characters, marks, catalog, AdSense, distributor and Suno accounts into the LLC. Operating agreement if multiple owners.

### 4.2 Trademarks — the strongest IP given AI-music limits
File on channel name and each lead character name/logo:
- **Class 41** — entertainment services (core), **Class 9** — downloadable A/V, **Class 25** — apparel, **Class 28** — toys/plush (file before pitching licensees); optionally 16 (books), 35 (retail). USPTO base $350/class (2025 schedule). Prioritize 41 + 25/28; use intent-to-use for expansions. **Clear names before launch** — kids' entertainment is dense with marks.

### 4.3 Copyright layering strategy
Structure every release to contain registrable human authorship:
- **Human-written lyrics** (don't let Suno write them, or rewrite substantially);
- **Character designs, animation, video** (human-made or properly work-for-hire);
- Compilation/arrangement choices and human post-production;
- Register with USCO **disclosing/disclaiming** AI audio. Misrepresenting AI content can invalidate the registration.
- Flagship songs: human topline melody + lyrics, Suno for production — maximizes the protectable core.

### 4.4 Contractors & PROs
- "Work made for hire" labels alone often fail for commissioned art/music. Use **work-for-hire language + present-tense assignment ("hereby assigns") + moral-rights waiver + AI-use warranty**, signed before work starts.
- **PROs:** as of **Oct 2025, ASCAP/BMI/SOCAN accept *partially* AI-generated works** (human + AI); 100% AI compositions ineligible ([ASCAP](https://www.ascap.com/press/2025/10/10-28-ai-registration-policies)). The human-lyrics layer is the ticket to performance royalties (which also bypass Spotify's 1,000-stream master-side threshold). Register human authors as writers, the LLC as publisher.

---

## 5. Top 10 Landmines — and Avoidance

1. **Generating catalog on Suno's free tier.** No retroactive fix. → Paid plan in the LLC's name from day one; log plan status per track; archive dated ToS.
2. **Misdesignating child-directed content as "not made for kids."** $53,088/violation. → Designate everything MFK; model economics at $1–3 RPM.
3. **Assuming you own copyright in the songs.** You hold a license; pure AI audio is unregistrable. → Layer human authorship; lean on trademark as the moat.
4. **Building on one AI vendor amid live litigation.** → Keep stems off-platform; be ready to re-record top tracks; watch the April 2027 dispositive motions.
5. **Tripping Spotify's spam filter / DDEX disclosure.** → DistroKid with disclosure box; curated releases at normal cadence; no soundalike names. Never CD Baby.
6. **The 1,000-stream threshold eating a long-tail catalog.** → Concentrate promotion; chase sleep/lullaby playlists; register publishing with ASCAP/BMI.
7. **Being classified as "AI slop."** Algorithmic and reputational death in kids' content. → Human-reviewed pedagogy, consistent characters, disclosed AI, real educational value, capped cadence.
8. **Contractor IP leaks.** → Signed WFH + present assignment + AI warranty before work starts.
9. **Personal liability / unassigned assets.** → LLC, clean chain of title from day one; buyers and streamers will diligence AI provenance.
10. **COPPA creep on TikTok/IG and owned properties.** → Target parents explicitly; collect no child data; animated characters, not real kids.

**Bottom line:** viable, but economics are merch/licensing-led, not ad-led; and the IP strategy is inverted from a normal music company — **trademarks and human-authored characters/lyrics are the protectable core; AI audio is a licensed, replaceable production input.** Existential watch items through 2027: UMG/Sony v. Suno, and platform-level restrictions on AI kids' content.
