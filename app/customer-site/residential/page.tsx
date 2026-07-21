import Link from 'next/link';
import { ScrollReveal } from '@/components/customer-site/ScrollReveal';
import { WaveCut } from '@/components/customer-site/WaveCut';

export default function ResidentialPage() {
  return (
    <>
      {/* ========== PAGE HERO ========== */}
      <section className="pagehero">
        <div className="wrap">
          <span className="kicker" style={{ color: 'var(--mist)' }}>Residential Cleaning</span>
          <h1>Five packages. Every task listed. Nothing left to interpretation.</h1>
          <p>Each tier includes everything in the tier below it, plus the additions listed. The same scope your cleaner is trained on is the one you see here.</p>
          <div className="hero-ctas" style={{ marginTop: 28 }}>
            <Link className="btn btn-cream" href="/customer-site#quote">Price My Home</Link>
            <a className="btn btn-ghost" href="tel:4374751622">Call 437 475 1622</a>
          </div>
        </div>
      </section>
      <WaveCut from="var(--navy)" to="#F4EFE3" />

      {/* ========== PACKAGES ========== */}
      <section className="cs-block">
        <div className="wrap">
          <ScrollReveal>
            <p className="inherit-note">Every package includes the full contents of the tiers above it in this list. Your exact price is generated from your home&apos;s size in the instant quote.</p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="pkg">
              <div><h3>Standard</h3><span className="tag">Recurring eligible</span></div>
              <ul>
                <li>Dust all reachable surfaces</li>
                <li>Vacuum and mop all floors</li>
                <li>Kitchen counters and backsplash behind stove</li>
                <li>Exterior of all appliances and stovetop</li>
                <li>Bathrooms: toilet, tub, shower, sink, mirror</li>
                <li>Beds made, linens straightened</li>
                <li>Trash emptied and relined</li>
                <li>High-touch points wiped</li>
              </ul>
              <div className="p-cta">
                <small>Priced by your home&apos;s size and bathrooms.</small>
                <Link className="btn btn-navy" href="/customer-site#quote">See My Price</Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="pkg">
              <div><h3>Standard Plus</h3><span className="tag">Recurring eligible</span></div>
              <ul>
                <li>Everything in Standard, plus:</li>
                <li>Baseboards throughout</li>
                <li>Inside microwave</li>
                <li>Full backsplash and cabinet fronts</li>
                <li>Light fixtures and reachable ceiling fans</li>
                <li>Interior doors and window sills spot cleaned</li>
                <li>Grout spot-scrub in shower</li>
                <li>Vacuum under reachable furniture edges</li>
              </ul>
              <div className="p-cta">
                <small>Priced by your home&apos;s size and bathrooms.</small>
                <Link className="btn btn-navy" href="/customer-site#quote">See My Price</Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="pkg">
              <div><h3>Deep Clean</h3><span className="tag">One-time detail reset</span></div>
              <ul>
                <li>Everything in Standard Plus, plus:</li>
                <li>Inside oven and inside fridge</li>
                <li>Behind and under movable furniture</li>
                <li>Full grout scrub, shower descale</li>
                <li>Full interior window glass</li>
                <li>Baseboards and door frames fully washed</li>
                <li>Range hood degreased</li>
                <li>Vents and light fixtures wiped</li>
              </ul>
              <div className="p-cta">
                <small>Priced by your home&apos;s size and bathrooms.</small>
                <Link className="btn btn-navy" href="/customer-site#quote">See My Price</Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="pkg">
              <div><h3>Full Reset</h3><span className="tag">Occupied property</span></div>
              <ul>
                <li>Everything in Deep Clean, plus:</li>
                <li>Inside all cabinets and drawers, emptied</li>
                <li>Inside closets, shelving and floors</li>
                <li>Wall spot-washing, reachable height</li>
                <li>Window tracks and sills, full clean</li>
                <li>Switch plates and outlet covers</li>
                <li>Garage or balcony sweep if applicable</li>
              </ul>
              <div className="p-cta">
                <small>Priced by your home&apos;s size and bathrooms.</small>
                <Link className="btn btn-navy" href="/customer-site#quote">See My Price</Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="pkg">
              <div><h3>Move-In / Move-Out</h3><span className="tag">Vacant unit only</span></div>
              <ul>
                <li>Everything in Full Reset, on a vacant unit:</li>
                <li>Every cabinet, drawer, and closet interior</li>
                <li>Full wall spot-wash where reachable</li>
                <li>All window tracks, sills, and interior glass</li>
                <li>All baseboards, frames, fixtures, switch plates</li>
                <li>Inside all appliances included in the unit</li>
                <li>Landlord, realtor, and closing grade finish</li>
              </ul>
              <div className="p-cta">
                <small>Priced by your home&apos;s size and bathrooms.</small>
                <Link className="btn btn-navy" href="/customer-site#quote">See My Price</Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <p style={{ marginTop: 26, color: '#4c5a68', fontSize: 15, maxWidth: '52em' }}>
              Homes are priced by square footage. Detail packages on larger homes are billed hourly and quoted as a range, confirmed on arrival once your cleaner sees actual condition. Add-ons like inside-fridge, laundry, carpet shampooing, and balcony cleans stack on any package at published flat rates.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="cs-block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">Questions, Answered Straight</span>
              <h2>Residential FAQ</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="faq">
              <details>
                <summary>Is the online price the final price?</summary>
                <p>For Standard and Standard Plus, yes, the price is firm once we confirm your details. Deep Clean, Full Reset, and Move-In/Out are quoted as a range and confirmed firm on arrival, because detail work depends on actual condition. You approve the final number before any work starts.</p>
              </details>
              <details>
                <summary>Do I need to be home during the clean?</summary>
                <p>No. Most of our recurring clients leave a key, lockbox code, or condo concierge instruction. You get a text when your cleaner is on the way and another when the job is complete.</p>
              </details>
              <details>
                <summary>What if a room is not up to standard?</summary>
                <p>That is what the Flawless Finish Guarantee is for. Tell us and we return to re-clean it at no charge. This is written into your service agreement, not just marketing copy.</p>
              </details>
              <details>
                <summary>Are your cleaners insured and vetted?</summary>
                <p>Every cleaner is background-checked before their first job. Sea of Blue carries liability insurance and is WSIB registered in Ontario.</p>
              </details>
              <details>
                <summary>Can I pause or cancel a recurring plan?</summary>
                <p>Yes, any time with reasonable notice. No contracts and no cancellation fees on residential plans.</p>
              </details>
              <details>
                <summary>Which package should a first-time client pick?</summary>
                <p>If you are starting a recurring plan, book a Deep Clean first. It resets the home to our baseline so your Standard or Standard Plus visits maintain that level instead of chasing buildup.</p>
              </details>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
