'use client';

import { useState } from 'react';
import { ScrollReveal } from '@/components/customer-site/ScrollReveal';
import { WaveCut } from '@/components/customer-site/WaveCut';

export default function CommercialPage() {
  const [formData, setFormData] = useState({
    company: '', name: '', phone: '', city: '',
    type: 'Retail / Automotive', size: 'Under 1,000 sqft', freq: 'Weekly',
  });
  const [confirmed, setConfirmed] = useState(false);

  const update = (field: string, value: string) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.company || !formData.name || !formData.phone) return;
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.name,
          customer_phone: formData.phone,
          city: formData.city,
          source: 'commercial_form',
          notes: `Company: ${formData.company}, Type: ${formData.type}, Size: ${formData.size}, Frequency: ${formData.freq}`,
        }),
      });
    } catch { /* proceed anyway */ }
    setConfirmed(true);
  };

  return (
    <>
      {/* ========== PAGE HERO ========== */}
      <section className="pagehero">
        <div className="wrap">
          <span className="kicker" style={{ color: 'var(--mist)' }}>Commercial Cleaning</span>
          <h1>Small commercial. Big accountability.</h1>
          <p>The national players chase towers. We serve the spaces under 5,000 sqft they treat as too small to care about: retail, automotive, offices, and managed properties across the GTA, with every visit verified and every scope in writing.</p>
          <div className="hero-ctas" style={{ marginTop: 28 }}>
            <a className="btn btn-cream" href="#cform">Book a Walkthrough</a>
            <a className="btn btn-ghost" href="tel:4374751622">Call 437 475 1622</a>
          </div>
          <div className="proof">
            {['Liability Insured', 'WSIB Registered', 'SLA-Backed Service', 'Background-Checked Staff', 'COI On Request'].map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        </div>
      </section>
      <WaveCut from="var(--navy)" to="#F4EFE3" />

      {/* ========== VERTICALS ========== */}
      <section className="cs-block">
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">Who We Serve</span>
              <h2>Four verticals, one service standard</h2>
            </div>
          </ScrollReveal>
          <div className="vert-grid">
            <ScrollReveal>
              <div className="vert">
                <h3>Retail and Automotive</h3>
                <p>Recurring service for parts retailers, tire and service centres, and multi-bay operations where floor condition and front-of-house presentation are customer-facing.</p>
                <ul><li>Weekly or multi-weekly recurring schedules</li><li>Sales floor, service counter, and washroom scope</li><li>After-hours and pre-open scheduling</li></ul>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="vert">
                <h3>Small Offices</h3>
                <p>Offices under 5,000 sqft that need reliability without a facilities department. One point of contact, one standing scope, zero chasing.</p>
                <ul><li>Nightly, weekly, or bi-weekly programs</li><li>Desks, boardrooms, kitchens, washrooms</li><li>Supply restocking available</li></ul>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="vert">
                <h3>Property Management</h3>
                <p>Common-area programs and turnover cleans for managed residential and mixed-use buildings. Built to make the PM look good to owners and tenants.</p>
                <ul><li>Lobby, corridor, and amenity programs</li><li>Unit turnover cleans, landlord grade</li><li>COI and documentation provided per building</li></ul>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="vert">
                <h3>Post-Construction and Renovation</h3>
                <p>Rough and final cleans that take a site from trades-done to client-ready. Dust extraction, glass, fixtures, and detail finishing.</p>
                <ul><li>Rough clean and final clean phases</li><li>Window, track, and fixture detailing</li><li>Flexible scheduling around trade completion</li></ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== PROCESS ========== */}
      <section className="cs-block why on-navy">
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">The Process</span>
              <h2>Walkthrough to signed proposal in 48 hours</h2>
              <p>Incumbents take a week to send a PDF. We walk your space, scope it on site, and deliver a signed-ready proposal with pricing and SLA inside two business days.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="steps">
              <div className="s"><h3>Walk the Space</h3><p>A 30-minute on-site walkthrough. We measure, note fixtures and finishes, and confirm your priorities and schedule windows.</p></div>
              <div className="s"><h3>Proposal in 48 Hours</h3><p>Scope of work, per-visit pricing, and our SLA terms in one document, ready for signature. No vague quotes, no follow-up chase.</p></div>
              <div className="s"><h3>Verified Every Visit</h3><p>Photo verification after each clean, text-based issue reporting with a response SLA, and a monthly quality scorecard. Missed scope is re-cleaned at no charge.</p></div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== WALKTHROUGH FORM ========== */}
      <section className="cs-block">
        <div className="wrap">
          <ScrollReveal>
            <div className="sec-head">
              <span className="kicker">Start Here</span>
              <h2>Book your walkthrough</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="cform" id="cform">
              <div className="row2">
                <div className="field"><label>Company</label><input value={formData.company} onChange={(e) => update('company', e.target.value)} placeholder="Business name" /></div>
                <div className="field"><label>Contact Name</label><input value={formData.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Phone</label><input value={formData.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Best number" /></div>
                <div className="field"><label>City</label><input value={formData.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Brampton" /></div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Space Type</label>
                  <select value={formData.type} onChange={(e) => update('type', e.target.value)}>
                    <option>Retail / Automotive</option>
                    <option>Office</option>
                    <option>Property Management / Common Areas</option>
                    <option>Post-Construction</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Approx. Size</label>
                  <select value={formData.size} onChange={(e) => update('size', e.target.value)}>
                    <option>Under 1,000 sqft</option>
                    <option>1,000 to 2,500 sqft</option>
                    <option>2,500 to 5,000 sqft</option>
                    <option>Over 5,000 sqft</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Desired Frequency</label>
                <select value={formData.freq} onChange={(e) => update('freq', e.target.value)}>
                  <option>Nightly</option>
                  <option>2 to 3 times weekly</option>
                  <option>Weekly</option>
                  <option>Bi-weekly</option>
                  <option>One-time / project</option>
                </select>
              </div>
              {!confirmed ? (
                <button className="btn btn-navy" style={{ width: '100%' }} onClick={handleSubmit}>
                  Request Walkthrough
                </button>
              ) : (
                <div className="confirm" style={{ display: 'block' }}>
                  <b>Walkthrough request received.</b> We will call you within one business day to schedule.
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
