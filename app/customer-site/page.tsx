import Link from 'next/link';
import { QuoteWizard } from '@/components/customer-site/QuoteWizard';
import { ScrollReveal } from '@/components/customer-site/ScrollReveal';
import { WaveCut } from '@/components/customer-site/WaveCut';
import { ServiceAreaChecker } from '@/components/customer-site/ServiceAreaChecker';

export default function CustomerHomePage() {
  return (
    <>
      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker rev" style={{ color: 'var(--mist)' }}>
              Residential and Commercial Cleaning, GTA and West
            </span>
            <h1 className="rev d1">
              Trusted Hands,<br /><em>Flawless Finish.</em>
            </h1>
            <p className="lede rev d2">
              Background-checked cleaners, a standard held to every visit, and an exact price in under a minute. No booking an estimate just to hear a number.
            </p>
            <div className="hero-ctas rev d3">
              <a className="btn btn-cream" href="#quote">Get an Instant Price</a>
              <a className="btn btn-ghost" href="sms:4374751622">Text Us Instead</a>
            </div>
          </div>
          <div className="rev d4" id="quote">
            <QuoteWizard />
          </div>
        </div>

        {/* Trust Bar */}
        <div className="trust">
          <div className="wrap">
            <div className="t">
              <span className="tick">
                <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5L6 12.5L14 3.5" stroke="#F4EFE3" strokeWidth="2.4" strokeLinecap="square" /></svg>
              </span>
              <div><b>Liability Insured</b><small>Every job covered</small></div>
            </div>
            <div className="t">
              <span className="tick">
                <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5L6 12.5L14 3.5" stroke="#F4EFE3" strokeWidth="2.4" strokeLinecap="square" /></svg>
              </span>
              <div><b>Background-Checked</b><small>Every cleaner, no exceptions</small></div>
            </div>
            <div className="t">
              <span className="tick">
                <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5L6 12.5L14 3.5" stroke="#F4EFE3" strokeWidth="2.4" strokeLinecap="square" /></svg>
              </span>
              <div><b>WSIB Registered</b><small>Fully compliant in Ontario</small></div>
            </div>
            <div className="t">
              <span className="tick">
                <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5L6 12.5L14 3.5" stroke="#F4EFE3" strokeWidth="2.4" strokeLinecap="square" /></svg>
              </span>
              <div><b>Flawless Finish Guarantee</b><small>Not happy with a room, we re-clean it free</small></div>
            </div>
          </div>
        </div>
      </section>

      <WaveCut from="var(--navy-deep)" to="#F4EFE3" />

      {/* ========== SERVICES ========== */}
      <section className="cs-block">
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">Five Packages, One Standard</span>
              <h2>Every clean, scoped in writing</h2>
              <p>Each package includes everything in the tier below it. No vague checklists, no surprise upsells at the door.</p>
            </div>
          </ScrollReveal>
          <div className="svc-grid">
            <ScrollReveal><div className="svc"><span className="idx">01</span><h3>Standard</h3><span className="cat">Recurring Maintenance</span><p>Dusting, floors, kitchen surfaces, full bathrooms, trash, beds made. The clean that keeps a home held to standard week after week.</p><Link href="/customer-site/residential" className="svc-link">Full Scope</Link></div></ScrollReveal>
            <ScrollReveal><div className="svc"><span className="idx">02</span><h3>Standard Plus</h3><span className="cat">Enhanced Maintenance</span><p>Everything in Standard plus baseboards, inside microwave, cabinet fronts, light fixtures, and detailed kitchen work. Our most-booked recurring tier.</p><Link href="/customer-site/residential" className="svc-link">Full Scope</Link></div></ScrollReveal>
            <ScrollReveal><div className="svc feature"><span className="idx">03</span><h3>Deep Clean</h3><span className="cat">One-Time Reset</span><p>The baseline reset. Inside oven and fridge, behind furniture, grout, full interior windows, every baseboard washed. The right first visit before going recurring.</p><Link href="/customer-site/residential" className="svc-link">Full Scope</Link></div></ScrollReveal>
            <ScrollReveal><div className="svc"><span className="idx">04</span><h3>Full Reset</h3><span className="cat">Occupied Full Detail</span><p>For occupied homes that have gone a year or more without professional cleaning. Inside cabinets, closets, wall spot-washing, window tracks, top to bottom.</p><Link href="/customer-site/residential" className="svc-link">Full Scope</Link></div></ScrollReveal>
            <ScrollReveal><div className="svc"><span className="idx">05</span><h3>Move-In / Move-Out</h3><span className="cat">Vacant Unit Turnover</span><p>Vacant-unit, landlord and realtor grade. Every cabinet, closet, wall, track, and fixture. The standard for lease turnovers, closings, and pre-listing cleans.</p><Link href="/customer-site/residential" className="svc-link">Full Scope</Link></div></ScrollReveal>
            <ScrollReveal><div className="svc"><span className="idx">06</span><h3>Commercial</h3><span className="cat">SLA-Backed Programs</span><p>Retail, small offices, property management, and post-construction across the GTA. Walkthrough to signed proposal in 48 hours.</p><Link href="/customer-site/commercial" className="svc-link">Commercial Hub</Link></div></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== WHY SEA OF BLUE ========== */}
      <section className="cs-block why on-navy">
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">Why Sea of Blue</span>
              <h2>Most cleaning companies make you chase this. We just hand it over.</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="why-grid">
              <div className="w"><div className="big">60s</div><h3>Your Price In 60 Seconds</h3><p>Skip the in-home estimate entirely. A few taps gives you the real number, and you decide on your own time. Whatever the tool quotes is exactly what we put in writing.</p></div>
              <div className="w"><div className="big">SMS</div><h3>It All Runs On Text</h3><p>Book it, move it, and get a heads-up when your cleaner is on the way, all by text. No phone tag, no hold music, no app to install.</p></div>
              <div className="w"><div className="big">100%</div><h3>Flawless Finish Guarantee</h3><p>Miss a spot and it is on us. Send one text and we come back to re-clean it, free. This is a clause in your agreement, not a promise we can quietly walk back.</p></div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== SERVICE AREAS ========== */}
      <section className="cs-block">
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head" style={{ marginBottom: 22 }}>
              <span className="kicker">Service Areas</span>
              <h2>West GTA and beyond</h2>
            </div>
            <div className="areas">
              {['Mississauga', 'Oakville', 'Brampton', 'Toronto', 'Guelph', 'Milton', 'Burlington', 'Orangeville', 'Caledon'].map((a) => (
                <span key={a} className="chip">{a}</span>
              ))}
            </div>
            <ServiceAreaChecker />
          </ScrollReveal>
        </div>
      </section>

      {/* ========== REVIEWS ========== */}
      <section className="cs-block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">Client Feedback</span>
              <h2>The GTA is talking</h2>
            </div>
          </ScrollReveal>
          <div className="rvs">
            <ScrollReveal>
              <div className="rv">
                <div className="stars">★★★★★</div>
                <p>&ldquo;Excellent service! The team was friendly, efficient, and did a great job. I was especially impressed with the deep cleaning of the kitchen and bathroom—they looked fresh and spotless. Highly recommended!&rdquo;</p>
                <b>Bushra M. Khan</b><small>Deep Clean</small>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="rv">
                <div className="stars">★★★★★</div>
                <p>&ldquo;Professional, fast response, and amazing job. Will definitely use again.&rdquo;</p>
                <b>Nathalie Toussaint</b><small>Standard Clean</small>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="rv">
                <div className="stars">★★★★★</div>
                <p>&ldquo;Hired them for a move-out clean on a rental property that was left in terrible shape. They brought it back to landlord grade in an afternoon. No hidden fees, the price I got online was exactly what I paid.&rdquo;</p>
                <b>Jessica R.</b><small>Brampton, Move-Out</small>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
