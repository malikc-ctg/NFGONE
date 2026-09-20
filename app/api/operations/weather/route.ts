import { NextRequest, NextResponse } from 'next/server';

interface WeatherCondition {
  label: string;
  icon: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'cloud-fog';
  impact: 'normal' | 'caution' | 'severe';
  alertMessage?: string;
}

function getWeatherCondition(code: number, precipitation: number): WeatherCondition {
  if (code === 0) return { label: 'Clear Sky', icon: 'sun', impact: 'normal' };
  if ([1, 2].includes(code)) return { label: 'Partly Cloudy', icon: 'cloud', impact: 'normal' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud', impact: 'normal' };
  if ([45, 48].includes(code)) {
    return { label: 'Foggy Conditions', icon: 'cloud-fog', impact: 'caution', alertMessage: 'Reduced visibility — drivers exercise caution' };
  }
  if ([51, 53, 55, 61, 63, 80, 81].includes(code) || precipitation > 0) {
    return {
      label: 'Rain / Showers',
      icon: 'cloud-rain',
      impact: precipitation > 2.5 ? 'severe' : 'caution',
      alertMessage: 'Wet roads — anticipate +10 to +15m transit delays across service zones',
    };
  }
  if ([65, 82].includes(code)) {
    return {
      label: 'Heavy Rain',
      icon: 'cloud-rain',
      impact: 'severe',
      alertMessage: 'Heavy downpour — traffic slowdowns and exterior access hazards',
    };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      label: 'Snow / Flurries',
      icon: 'cloud-snow',
      impact: 'severe',
      alertMessage: 'Snow accumulation — winter driving delays and priority entry clearings',
    };
  }
  if ([95, 96, 99].includes(code)) {
    return {
      label: 'Thunderstorms',
      icon: 'cloud-lightning',
      impact: 'severe',
      alertMessage: 'Thunderstorm warning — potential equipment hazards for outdoor jobs',
    };
  }
  return { label: 'Fair', icon: 'sun', impact: 'normal' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Default to Toronto / GTA center coords if not provided
    const lat = searchParams.get('lat') || '43.6532';
    const lng = searchParams.get('lng') || '-79.3832';

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;

    const res = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 mins
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;
    const weatherCode = current?.weather_code ?? 0;
    const precip = current?.precipitation ?? 0;
    const condition = getWeatherCondition(weatherCode, precip);

    return NextResponse.json({
      temperature: Math.round(current?.temperature_2m ?? 20),
      apparentTemperature: Math.round(current?.apparent_temperature ?? 20),
      precipitation: precip,
      humidity: Math.round(current?.relative_humidity_2m ?? 50),
      windSpeed: Math.round(current?.wind_speed_10m ?? 0),
      condition,
      timestamp: current?.time || new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Weather API error:', err);
    // Fallback gracefully so map never breaks
    return NextResponse.json({
      temperature: 21,
      apparentTemperature: 21,
      precipitation: 0,
      humidity: 50,
      windSpeed: 10,
      condition: { label: 'Clear Sky', icon: 'sun', impact: 'normal' },
      timestamp: new Date().toISOString(),
    });
  }
}
