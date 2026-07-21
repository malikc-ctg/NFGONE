'use client';

import { useState, useMemo } from 'react';

/* ============ PRICING ENGINE ============ */
const PKGS = [
  { name: 'Standard', mult: 1.0, recurring: true, desc: 'Maintenance clean' },
  { name: 'Standard Plus', mult: 1.2, recurring: true, desc: 'Enhanced maintenance' },
  { name: 'Deep Clean', mult: 1.55, recurring: false, desc: 'One-time detail reset' },
  { name: 'Full Reset', mult: 2.0, recurring: false, desc: 'Occupied full detail' },
  { name: 'Move-In / Move-Out', mult: 2.1, recurring: false, desc: 'Vacant unit turnover' },
];

const FREQS = [
  { name: 'One-time', disc: 0, tag: 'Table price' },
  { name: 'Monthly', disc: 0.05, tag: 'Save 5%' },
  { name: 'Bi-weekly', disc: 0.1, tag: 'Save 10%, most popular' },
  { name: 'Weekly', disc: 0.15, tag: 'Save 15%' },
];

const BREAKS: [number, number][] = [
  [500, 120], [700, 140], [900, 160], [1100, 180],
  [1400, 205], [1750, 280], [2250, 360], [2750, 440], [3000, 480],
];

function baseFromSqft(s: number): number | null {
  if (s >= 3000) return null;
  if (s <= BREAKS[0][0]) return BREAKS[0][1];
  for (let i = 0; i < BREAKS.length - 1; i++) {
    const [x0, y0] = BREAKS[i];
    const [x1, y1] = BREAKS[i + 1];
    if (s <= x1) return y0 + ((y1 - y0) * (s - x0)) / (x1 - x0);
  }
  return BREAKS[BREAKS.length - 1][1];
}

const round5 = (n: number) => Math.round(n / 5) * 5;
const BED_OPTIONS = ['Studio', '1', '2', '3', '4', '5+'];
const FULL_BATH_OPTIONS = ['1', '2', '3', '4'];
const HALF_BATH_OPTIONS = ['0', '1', '2'];

type Step = 'pkg' | 'sqft' | 'beds' | 'baths' | 'freq' | 'result';

export function QuoteWizard() {
  const [pkg, setPkg] = useState(0);
  const [sqft, setSqft] = useState(1000);
  const [beds, setBeds] = useState<string | null>(null);
  const [fullBaths, setFullBaths] = useState(0); // index
  const [halfBaths, setHalfBaths] = useState(0); // index
  const [freq, setFreq] = useState(2);
  const [currentStep, setCurrentStep] = useState<Step>('pkg');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Lead form fields
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCity, setLeadCity] = useState('');
  const [leadDate, setLeadDate] = useState('');

  const order: Step[] = useMemo(() => {
    return PKGS[pkg].recurring
      ? ['pkg', 'sqft', 'beds', 'baths', 'freq', 'result']
      : ['pkg', 'sqft', 'beds', 'baths', 'result'];
  }, [pkg]);

  const stepIdx = order.indexOf(currentStep);
  const totalSteps = order.length - 1; // don't count result
  const fillWidth = `${(Math.min(stepIdx, totalSteps) / totalSteps) * 100}%`;
  const stepLabel = currentStep === 'result' ? 'Quote Ready' : `Step ${stepIdx + 1} of ${totalSteps}`;

  const goNext = () => {
    const next = order[stepIdx + 1];
    if (next) setCurrentStep(next);
  };
  const goBack = () => {
    const prev = order[stepIdx - 1];
    if (prev) setCurrentStep(prev);
  };
  const restart = () => {
    setCurrentStep('pkg');
    setShowLeadForm(false);
    setConfirmed(false);
  };

  // Calculate price
  const price = useMemo(() => {
    const base = baseFromSqft(sqft);
    if (!base) return null;
    const full = fullBaths + 1; // index 0 = 1 bath
    const half = halfBaths;
    const bathAdj = (full > 2 ? (full - 2) * 20 : 0) + half * 10;
    const raw = (base + bathAdj) * PKGS[pkg].mult;
    const discounted = raw * (1 - FREQS[freq].disc);
    return round5(discounted);
  }, [sqft, pkg, freq, fullBaths, halfBaths]);

  const handleSubmitLead = async () => {
    if (!leadName || !leadPhone) return;
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: leadName,
          customer_phone: leadPhone,
          customer_email: '',
          city: leadCity,
          service_type: pkg <= 1 ? 'standard_clean' : pkg === 2 ? 'deep_clean' : 'move_out_clean',
          preferred_date: leadDate || null,
          home_size_sqft: sqft,
          home_bedrooms: beds === 'Studio' ? 0 : parseInt(beds || '2'),
          home_bathrooms: fullBaths + 1,
          quoted_price: price,
          source: 'website_quote_wizard',
          notes: `Package: ${PKGS[pkg].name}, Frequency: ${FREQS[freq].name}, Half baths: ${halfBaths}`,
        }),
      });
      setConfirmed(true);
      setShowLeadForm(false);
    } catch {
      // silently handle - we'll show the confirmation anyway for UX
      setConfirmed(true);
      setShowLeadForm(false);
    }
  };

  const fmtSqft = (n: number) => (n >= 3000 ? '3,000+' : n.toLocaleString());

  return (
    <div className="qcard">
      <div className="qbar">
        <i style={{ width: fillWidth }} />
      </div>
      <div className="qbody">
        <div className="qtop">
          <span className="lbl">Instant Quote</span>
          <span className="stepn">{stepLabel}</span>
        </div>

        {/* STEP: Package */}
        {currentStep === 'pkg' && (
          <div className="qstep" key="pkg">
            <h3>What kind of clean?</h3>
            <p className="qhint">This sets the depth of the job. Each tier includes everything in the one before it.</p>
            <div className="opts">
              {PKGS.map((p, i) => (
                <button
                  key={p.name}
                  className={`opt${pkg === i ? ' sel' : ''}`}
                  onClick={() => { setPkg(i); goNext(); }}
                >
                  <span>
                    <span className="on-t">{p.name}</span><br />
                    <span className="on-d">{p.desc}</span>
                  </span>
                  <span className="arw">&rsaquo;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Sqft */}
        {currentStep === 'sqft' && (
          <div className="qstep" key="sqft">
            <h3>How big is the space?</h3>
            <p className="qhint">Square footage drives the price. Round to your best estimate, we confirm on site.</p>
            <div className="slwrap">
              <div className="slnum">{fmtSqft(sqft)} <span>sqft</span></div>
              <input
                type="range"
                min={300}
                max={3000}
                step={50}
                value={sqft}
                onChange={(e) => setSqft(+e.target.value)}
              />
              <div className="slrange"><span>300</span><span>3,000+</span></div>
              <div className="slman">
                Know the exact number?
                <input
                  type="number"
                  min={100}
                  max={3000}
                  placeholder="sqft"
                  onChange={(e) => {
                    const v = parseInt(e.target.value || '0');
                    if (!isNaN(v) && v >= 100 && v <= 3000) setSqft(v);
                  }}
                />
              </div>
            </div>
            <div className="qnav">
              <button className="btn back" onClick={goBack}>Back</button>
              <button className="btn btn-navy cont" onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* STEP: Beds */}
        {currentStep === 'beds' && (
          <div className="qstep" key="beds">
            <h3>How many bedrooms?</h3>
            <p className="qhint">Helps us send the right size crew and time block.</p>
            <div className="grid-opts">
              {BED_OPTIONS.map((b) => (
                <button
                  key={b}
                  className={`gopt${beds === b ? ' sel' : ''}`}
                  onClick={() => { setBeds(b); goNext(); }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Baths */}
        {currentStep === 'baths' && (
          <div className="qstep" key="baths">
            <h3>How many bathrooms?</h3>
            <p className="qhint">Bathrooms carry the most detail work, so they adjust the price.</p>
            <div className="baths-lbl">Full baths</div>
            <div className="grid-opts">
              {FULL_BATH_OPTIONS.map((b, i) => (
                <button
                  key={b}
                  className={`gopt${fullBaths === i ? ' sel' : ''}`}
                  onClick={() => setFullBaths(i)}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="baths-lbl sub">Half baths (powder rooms)</div>
            <div className="grid-opts">
              {HALF_BATH_OPTIONS.map((b, i) => (
                <button
                  key={b}
                  className={`gopt${halfBaths === i ? ' sel' : ''}`}
                  onClick={() => setHalfBaths(i)}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="qnav">
              <button className="btn back" onClick={goBack}>Back</button>
              <button className="btn btn-navy cont" onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* STEP: Frequency */}
        {currentStep === 'freq' && (
          <div className="qstep" key="freq">
            <h3>How often?</h3>
            <p className="qhint">Recurring plans save you up to 15% every visit. Cancel any time, no contract.</p>
            <div className="opts">
              {FREQS.map((f, i) => (
                <button
                  key={f.name}
                  className={`opt${freq === i ? ' sel' : ''}`}
                  onClick={() => { setFreq(i); goNext(); }}
                >
                  <span>
                    <span className="on-t">{f.name}</span><br />
                    <span className="on-d">{f.tag}</span>
                  </span>
                  <span className="arw">&rsaquo;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Result */}
        {currentStep === 'result' && (
          <div className="qstep" key="result">
            <div className="rprice">
              <div className="rnum">{price ? `$${price}` : 'Custom'}</div>
              <div className="rper">
                {price
                  ? freq > 0 ? 'per visit' : PKGS[pkg].name
                  : 'Homes above 3,000 sqft are quoted individually'}
              </div>
            </div>
            <div className="rsummary">
              <b>{PKGS[pkg].name}</b> · {fmtSqft(sqft)} sqft · {beds || '2'} bed · {fullBaths + 1} bath
              {halfBaths > 0 && ` + ${halfBaths} half`}
              {freq > 0 && ` · ${FREQS[freq].name}`}
              {FREQS[freq].disc > 0 && ` (${Math.round(FREQS[freq].disc * 100)}% off)`}
            </div>
            <div className="rnote">
              {price
                ? 'This quote is valid for 14 days. Your cleaner confirms the exact scope before any work begins.'
                : 'Text us at 437 475 1622 or lock in below and we will follow up with a custom quote within 2 hours.'}
            </div>

            {!showLeadForm && !confirmed && (
              <button
                className="btn btn-navy"
                style={{ width: '100%' }}
                onClick={() => setShowLeadForm(true)}
              >
                Lock In This Quote
              </button>
            )}

            {showLeadForm && (
              <div className="lead-form">
                <div className="field">
                  <label>Name</label>
                  <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="row2">
                  <div className="field">
                    <label>Phone</label>
                    <input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="Mobile number" />
                  </div>
                  <div className="field">
                    <label>City</label>
                    <input value={leadCity} onChange={(e) => setLeadCity(e.target.value)} placeholder="e.g. Mississauga" />
                  </div>
                </div>
                <div className="field">
                  <label>Preferred Date</label>
                  <input type="date" value={leadDate} onChange={(e) => setLeadDate(e.target.value)} />
                </div>
                <button className="btn btn-solid" style={{ width: '100%' }} onClick={handleSubmitLead}>
                  Confirm My Booking Request
                </button>
              </div>
            )}

            {confirmed && (
              <div className="confirm">
                <b>Booking request received.</b> We will text you within 2 hours to confirm your date and assign your cleaner.
              </div>
            )}

            <div className="qnav" style={{ marginTop: 16 }}>
              <button className="btn back" onClick={goBack}>Back</button>
              <button
                className="btn"
                style={{ flex: 1, color: 'var(--navy)', boxShadow: 'inset 0 0 0 1.5px var(--line)' }}
                onClick={restart}
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
