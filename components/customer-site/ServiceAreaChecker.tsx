'use client';

import { useState } from 'react';

const SERVICED = [
  'mississauga', 'oakville', 'brampton', 'toronto', 'guelph',
  'milton', 'burlington', 'orangeville', 'caledon', 'etobicoke',
  'vaughan', 'richmond hill', 'markham', 'scarborough', 'north york',
];

const POSTAL_PREFIXES = ['L4', 'L5', 'L6', 'L7', 'L9', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M9', 'N1'];

export function ServiceAreaChecker() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'yes' | 'no' | null>(null);

  const check = () => {
    const v = input.trim().toLowerCase();
    if (!v) return;

    const cityMatch = SERVICED.some((c) => v.includes(c));
    const postalMatch = POSTAL_PREFIXES.some((p) => v.toUpperCase().startsWith(p));

    setResult(cityMatch || postalMatch ? 'yes' : 'no');
  };

  return (
    <div className="checker">
      <div className="crow">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setResult(null); }}
          placeholder="Enter your city or postal code"
          onKeyDown={(e) => e.key === 'Enter' && check()}
        />
        <button className="btn cbtn" onClick={check}>Check</button>
      </div>
      {result === 'yes' && (
        <div className="cres yes">
          <b>We service your area.</b> Get an instant price above or text us at 437 475 1622.
        </div>
      )}
      {result === 'no' && (
        <div className="cres no">
          <b>Not in our current coverage area.</b> We are expanding fast. Text 437 475 1622 and we will let you know as soon as we arrive.
        </div>
      )}
    </div>
  );
}
